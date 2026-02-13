import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculateLineItemTotal } from "@/lib/gst";
import { getAuthUserId } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    const userId = await getAuthUserId();
    const where: Record<string, unknown> = { userId };
    if (status) where.status = status;

    const invoices = await prisma.invoice.findMany({
      where,
      include: { client: true, lineItems: true },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ invoices });
  } catch (error) {
    console.error("List invoices error:", error);
    return NextResponse.json(
      { error: "Failed to list invoices" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      clientId,
      dueDate,
      notes,
      gstNumber,
      placeOfSupply,
      isInterState = false,
      lineItems = [],
    } = body;

    if (!dueDate || lineItems.length === 0) {
      return NextResponse.json(
        { error: "dueDate and at least one lineItem are required" },
        { status: 400 }
      );
    }

    const count = await prisma.invoice.count({
      where: { userId: await getAuthUserId() },
    });
    const invoiceNumber = `INV-${String(count + 1).padStart(4, "0")}`;

    let subtotal = 0;
    let taxTotal = 0;

    const processedItems = lineItems.map(
      (item: {
        description: string;
        quantity: number;
        unitPrice: number;
        gstRate: number;
      }) => {
        const calc = calculateLineItemTotal(
          item.quantity,
          item.unitPrice,
          item.gstRate,
          isInterState
        );
        subtotal += calc.amount;
        taxTotal += calc.cgst + calc.sgst + calc.igst;
        return {
          description: item.description,
          quantity: calc.quantity,
          unitPrice: calc.unitPrice,
          amount: calc.amount,
          gstRate: item.gstRate,
          cgst: calc.cgst,
          sgst: calc.sgst,
          igst: calc.igst,
          total: calc.total,
        };
      }
    );

    const total = Math.round((subtotal + taxTotal) * 100) / 100;

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber,
        userId: await getAuthUserId(),
        clientId: clientId || undefined,
        dueDate: new Date(dueDate),
        subtotal,
        taxTotal,
        total,
        notes,
        gstNumber,
        placeOfSupply,
        isInterState,
        lineItems: {
          create: processedItems,
        },
      },
      include: { lineItems: true, client: true },
    });

    return NextResponse.json({ invoice }, { status: 201 });
  } catch (error) {
    console.error("Create invoice error:", error);
    return NextResponse.json(
      { error: "Failed to create invoice" },
      { status: 500 }
    );
  }
}
