import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUserId } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get("categoryId");
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const userId = await getAuthUserId();
    const where: Record<string, unknown> = { userId };
    if (categoryId) where.categoryId = categoryId;
    if (from || to) {
      where.date = {};
      if (from) (where.date as Record<string, unknown>).gte = new Date(from);
      if (to) (where.date as Record<string, unknown>).lte = new Date(to);
    }

    const expenses = await prisma.expense.findMany({
      where,
      include: { category: true, account: true },
      orderBy: { date: "desc" },
    });

    return NextResponse.json({ expenses });
  } catch (error) {
    console.error("List expenses error:", error);
    return NextResponse.json({ error: "Failed to list expenses" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { description, amount, date, vendor, notes, categoryId, accountId, isRecurring } = body;

    if (!description || !amount) {
      return NextResponse.json(
        { error: "description and amount are required" },
        { status: 400 }
      );
    }

    const expense = await prisma.expense.create({
      data: {
        userId: await getAuthUserId(),
        description,
        amount,
        date: date ? new Date(date) : new Date(),
        vendor,
        notes,
        categoryId: categoryId || undefined,
        accountId: accountId || undefined,
        isRecurring: isRecurring || false,
      },
      include: { category: true },
    });

    if (accountId) {
      await prisma.account.update({
        where: { id: accountId },
        data: { currentBalance: { decrement: amount } },
      });
    }

    return NextResponse.json({ expense }, { status: 201 });
  } catch (error) {
    console.error("Create expense error:", error);
    return NextResponse.json({ error: "Failed to create expense" }, { status: 500 });
  }
}
