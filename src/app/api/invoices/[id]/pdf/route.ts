import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUserId } from "@/lib/auth";
import { generateInvoicePDF } from "@/lib/pdf";

export async function GET(
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

    const pdfBuffer = generateInvoicePDF({
      invoiceNumber: invoice.invoiceNumber,
      issueDate: invoice.issueDate.toISOString(),
      dueDate: invoice.dueDate.toISOString(),
      status: invoice.status,
      clientName: invoice.client?.name,
      clientEmail: invoice.client?.email || undefined,
      clientCompany: invoice.client?.company || undefined,
      clientAddress: invoice.client?.address || undefined,
      clientGstNumber: invoice.client?.gstNumber || undefined,
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

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${invoice.invoiceNumber}.pdf"`,
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    console.error("PDF generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate PDF" },
      { status: 500 }
    );
  }
}
