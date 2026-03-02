import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUserId } from "@/lib/auth";

/**
 * GET /api/invoices/[id]/payments — List payments for an invoice
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const payments = await prisma.payment.findMany({
      where: { invoiceId: id },
      orderBy: { date: "desc" },
    });

    const invoice = await prisma.invoice.findUnique({
      where: { id },
      select: { total: true, status: true },
    });

    const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0);
    const invoiceTotal = Number(invoice?.total ?? 0);
    const balance = invoiceTotal - totalPaid;

    return NextResponse.json({
      payments: payments.map((p) => ({
        id: p.id,
        amount: Number(p.amount),
        date: p.date.toISOString(),
        method: p.method,
        reference: p.reference,
        notes: p.notes,
      })),
      summary: {
        invoiceTotal,
        totalPaid,
        balance,
        isFullyPaid: balance <= 0,
        paymentCount: payments.length,
      },
    });
  } catch (error) {
    console.error("List payments error:", error);
    return NextResponse.json({ error: "Failed to fetch payments" }, { status: 500 });
  }
}

/**
 * POST /api/invoices/[id]/payments — Record a payment
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getAuthUserId();
    const { id } = await params;
    const body = await request.json();
    const { amount, date, method, reference, notes } = body;

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: "Amount must be positive" }, { status: 400 });
    }

    // Get invoice and existing payments
    const invoice = await prisma.invoice.findUnique({ where: { id } });
    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    const existingPayments = await prisma.payment.findMany({
      where: { invoiceId: id },
    });
    const totalPaid = existingPayments.reduce((sum, p) => sum + Number(p.amount), 0);
    const invoiceTotal = Number(invoice.total);
    const remaining = invoiceTotal - totalPaid;

    if (amount > remaining + 0.01) {
      return NextResponse.json(
        { error: `Amount exceeds remaining balance of ₹${remaining.toFixed(2)}` },
        { status: 400 }
      );
    }

    // Create payment
    const payment = await prisma.payment.create({
      data: {
        amount,
        date: date ? new Date(date) : new Date(),
        method: method || "bank_transfer",
        reference,
        notes,
        invoiceId: id,
        userId,
      },
    });

    // Auto-update invoice status
    const newTotalPaid = totalPaid + amount;
    let newStatus = invoice.status;
    if (newTotalPaid >= invoiceTotal) {
      newStatus = "paid";
    } else if (newTotalPaid > 0) {
      newStatus = "partial";
    }

    if (newStatus !== invoice.status) {
      await prisma.invoice.update({
        where: { id },
        data: {
          status: newStatus,
          paidAt: newStatus === "paid" ? new Date() : undefined,
        },
      });
    }

    return NextResponse.json({
      payment: {
        id: payment.id,
        amount: Number(payment.amount),
        date: payment.date.toISOString(),
        method: payment.method,
        reference: payment.reference,
      },
      invoiceStatus: newStatus,
      totalPaid: newTotalPaid,
      balance: invoiceTotal - newTotalPaid,
    }, { status: 201 });
  } catch (error) {
    console.error("Create payment error:", error);
    return NextResponse.json({ error: "Failed to record payment" }, { status: 500 });
  }
}
