import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUserId } from "@/lib/auth";

/**
 * GET /api/bank/transactions — List bank transactions
 * Query params: bankAccountId, page, limit, category, type, search,
 *               startDate, endDate, isReconciled
 */
export async function GET(request: NextRequest) {
  try {
    const userId = await getAuthUserId();
    const { searchParams } = new URL(request.url);

    const bankAccountId = searchParams.get("bankAccountId");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const category = searchParams.get("category");
    const type = searchParams.get("type"); // debit | credit
    const search = searchParams.get("search");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const isReconciled = searchParams.get("isReconciled");

    const where: Record<string, unknown> = { userId };

    if (bankAccountId) where.bankAccountId = bankAccountId;
    if (category) where.category = category;
    if (type) where.type = type;
    if (isReconciled !== null && isReconciled !== undefined) {
      where.isReconciled = isReconciled === "true";
    }
    if (search) {
      where.OR = [
        { description: { contains: search, mode: "insensitive" } },
        { vendor: { contains: search, mode: "insensitive" } },
        { reference: { contains: search, mode: "insensitive" } },
      ];
    }
    if (startDate || endDate) {
      where.date = {};
      if (startDate)
        (where.date as Record<string, unknown>).gte = new Date(startDate);
      if (endDate)
        (where.date as Record<string, unknown>).lte = new Date(endDate);
    }

    const [transactions, total] = await Promise.all([
      prisma.bankTransaction.findMany({
        where: where as any,
        orderBy: { date: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          bankAccount: { select: { name: true, bankName: true } },
        },
      }),
      prisma.bankTransaction.count({ where: where as any }),
    ]);

    // Summary stats
    const stats = await prisma.bankTransaction.groupBy({
      by: ["type"],
      where: { userId } as any,
      _sum: { amount: true },
      _count: true,
    });

    const totalDebit =
      stats.find((s) => s.type === "debit")?._sum?.amount || 0;
    const totalCredit =
      stats.find((s) => s.type === "credit")?._sum?.amount || 0;

    return NextResponse.json({
      transactions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      summary: {
        totalDebit: Number(totalDebit),
        totalCredit: Number(totalCredit),
        transactionCount: total,
      },
    });
  } catch (error) {
    console.error("Bank transactions error:", error);
    return NextResponse.json(
      { error: "Failed to fetch transactions" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/bank/transactions — Update a transaction (category, vendor, reconcile)
 * Body: { id, category?, vendor?, isReconciled?, notes? }
 */
export async function PATCH(request: NextRequest) {
  try {
    const userId = await getAuthUserId();
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Transaction ID required" },
        { status: 400 }
      );
    }

    const transaction = await prisma.bankTransaction.update({
      where: { id, userId },
      data: {
        ...(updates.category !== undefined && { category: updates.category }),
        ...(updates.vendor !== undefined && { vendor: updates.vendor }),
        ...(updates.isReconciled !== undefined && {
          isReconciled: updates.isReconciled,
        }),
        ...(updates.notes !== undefined && { notes: updates.notes }),
      },
    });

    return NextResponse.json(transaction);
  } catch (error) {
    console.error("Update transaction error:", error);
    return NextResponse.json(
      { error: "Failed to update transaction" },
      { status: 500 }
    );
  }
}
