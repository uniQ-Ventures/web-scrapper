import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUserId } from "@/lib/auth";

/**
 * GET /api/bank/accounts — List bank accounts
 */
export async function GET() {
  try {
    const userId = await getAuthUserId();
    const accounts = await prisma.bankAccount.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { transactions: true } },
      },
    });
    return NextResponse.json(accounts);
  } catch (error) {
    console.error("Bank accounts error:", error);
    return NextResponse.json(
      { error: "Failed to fetch accounts" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/bank/accounts — Create a bank account
 */
export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthUserId();
    const body = await request.json();

    const account = await prisma.bankAccount.create({
      data: {
        name: body.name || "Primary Account",
        bankName: body.bankName || null,
        accountNumber: body.accountNumber || null,
        ifscCode: body.ifscCode || null,
        currentBalance: body.currentBalance || 0,
        userId,
      },
    });

    return NextResponse.json(account, { status: 201 });
  } catch (error) {
    console.error("Create bank account error:", error);
    return NextResponse.json(
      { error: "Failed to create account" },
      { status: 500 }
    );
  }
}
