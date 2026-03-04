import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const expense = await prisma.expense.update({
      where: { id },
      data: {
        description: body.description,
        amount: body.amount,
        date: body.date ? new Date(body.date) : undefined,
        vendor: body.vendor,
        notes: body.notes,
        categoryId: body.categoryId,
      },
      include: { category: true },
    });

    return NextResponse.json({ expense });
  } catch (error) {
    console.error("Update expense error:", error);
    return NextResponse.json({ error: "Failed to update expense" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.expense.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("Delete expense error:", error);
    const prismaError = error as { code?: string };
    if (prismaError.code === "P2025") {
      return NextResponse.json({ error: "Expense not found" }, { status: 404 });
    }
    return NextResponse.json({ error: "Failed to delete expense" }, { status: 500 });
  }
}
