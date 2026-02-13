import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUserId } from "@/lib/auth";
import { generateInvoicePDF } from "@/lib/pdf";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getAuthUserId();
    const { id } = await params;

    const invoice = await prisma.invoice.findFirst({
      where: { id, userId },
      include: {
        client: true,
        lineItems: true,
        organization: true,
      },
    });

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    if (!invoice.client?.email) {
      return NextResponse.json(
        { error: "Client has no email address" },
        { status: 400 }
      );
    }

    const pdfBuffer = generateInvoicePDF({
      invoiceNumber: invoice.invoiceNumber,
      issueDate: invoice.issueDate.toISOString(),
      dueDate: invoice.dueDate.toISOString(),
      status: invoice.status,
      clientName: invoice.client.name,
      clientEmail: invoice.client.email,
      clientCompany: invoice.client.company || undefined,
      clientAddress: invoice.client.address || undefined,
      clientGstNumber: invoice.client.gstNumber || undefined,
      companyName: invoice.organization?.name || undefined,
      companyAddress: invoice.organization?.address || undefined,
      companyGstNumber: invoice.organization?.gstNumber || undefined,
      lineItems: invoice.lineItems.map((item) => ({
        description: item.description,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
        amount: Number(item.amount),
        gstRate: Number(item.gstRate),
        cgst: Number(item.cgst),
        sgst: Number(item.sgst),
        igst: Number(item.igst),
        total: Number(item.total),
      })),
      subtotal: Number(invoice.subtotal),
      taxTotal: Number(invoice.taxTotal),
      total: Number(invoice.total),
      isInterState: invoice.isInterState ?? false,
      currency: invoice.currency,
      notes: invoice.notes || undefined,
    });

    const resendKey = process.env.RESEND_API_KEY;
    if (!resendKey) {
      return NextResponse.json(
        { error: "Email service not configured" },
        { status: 503 }
      );
    }

    const companyName = invoice.organization?.name || "Founder OS Finance";

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `${companyName} <invoices@${process.env.RESEND_DOMAIN || "finance.founderOS.app"}>`,
        to: invoice.client.email,
        subject: `Invoice ${invoice.invoiceNumber} from ${companyName}`,
        html: `
          <div style="font-family: Inter, system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px;">
            <h2 style="margin: 0 0 8px;">Invoice ${invoice.invoiceNumber}</h2>
            <p style="color: #6b7280; margin: 0 0 24px;">
              Hi ${invoice.client.name},<br/><br/>
              Please find your invoice attached below.
            </p>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Amount Due</td>
                <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 600;">
                  ₹${Number(invoice.total).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </td>
              </tr>
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Due Date</td>
                <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; text-align: right;">
                  ${invoice.dueDate.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                </td>
              </tr>
            </table>
            <p style="color: #9ca3af; font-size: 12px;">
              Sent via Founder OS Finance
            </p>
          </div>
        `,
        attachments: [
          {
            filename: `${invoice.invoiceNumber}.pdf`,
            content: pdfBuffer.toString("base64"),
          },
        ],
      }),
    });

    if (!emailResponse.ok) {
      const err = await emailResponse.text();
      console.error("Resend API error:", err);
      return NextResponse.json(
        { error: "Failed to send email" },
        { status: 502 }
      );
    }

    // Mark invoice as sent
    await prisma.invoice.update({
      where: { id },
      data: { status: "sent" },
    });

    return NextResponse.json({
      success: true,
      message: `Invoice emailed to ${invoice.client.email}`,
    });
  } catch (error) {
    console.error("Email invoice error:", error);
    return NextResponse.json(
      { error: "Failed to email invoice" },
      { status: 500 }
    );
  }
}
