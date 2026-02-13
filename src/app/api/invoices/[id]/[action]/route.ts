import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUserId } from "@/lib/auth";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; action: string }> }
) {
  try {
    const { id, action } = await params;

    const invoice = await prisma.invoice.findFirst({
      where: { id, userId: await getAuthUserId() },
    });

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    let updateData: Record<string, unknown> = {};

    switch (action) {
      case "send":
        if (invoice.status !== "draft") {
          return NextResponse.json(
            { error: "Only draft invoices can be sent" },
            { status: 400 }
          );
        }
        updateData = { status: "sent", sentAt: new Date() };
        break;

      case "paid":
        if (!["sent", "overdue"].includes(invoice.status)) {
          return NextResponse.json(
            { error: "Only sent or overdue invoices can be marked as paid" },
            { status: 400 }
          );
        }
        updateData = { status: "paid", paidAt: new Date() };
        break;

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }

    const updated = await prisma.invoice.update({
      where: { id },
      data: updateData,
      include: { lineItems: true, client: true },
    });

    return NextResponse.json({ invoice: updated });
  } catch (error) {
    console.error("Invoice action error:", error);
    return NextResponse.json(
      { error: "Failed to perform action" },
      { status: 500 }
    );
  }
}
