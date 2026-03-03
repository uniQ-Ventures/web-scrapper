import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUserId } from "@/lib/auth";

/**
 * GET /api/expenses/approvals — List expenses pending approval
 * POST /api/expenses/approvals — Submit, approve, reject, or reimburse
 */
export async function GET(request: NextRequest) {
  try {
    const userId = await getAuthUserId();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "all"; // pending | approved | rejected | reimbursed

    const where: Record<string, unknown> = { userId };
    if (status !== "all") {
      where.approvalStatus = status;
    }

    const expenses = await prisma.expense.findMany({
      where,
      include: { category: true },
      orderBy: { date: "desc" },
      take: 50,
    });

    const counts = {
      pending: expenses.filter((e) => (e as Record<string, unknown>).approvalStatus === "pending").length,
      approved: expenses.filter((e) => (e as Record<string, unknown>).approvalStatus === "approved").length,
      rejected: expenses.filter((e) => (e as Record<string, unknown>).approvalStatus === "rejected").length,
      reimbursed: expenses.filter((e) => (e as Record<string, unknown>).approvalStatus === "reimbursed").length,
    };

    return NextResponse.json({
      expenses: expenses.map((e) => ({
        id: e.id,
        description: e.description,
        amount: Number(e.amount),
        date: e.date.toISOString(),
        category: e.category?.name || "Uncategorized",
        vendor: e.vendor,
        receipt: e.receipt,
        approvalStatus: (e as Record<string, unknown>).approvalStatus || "pending",
      })),
      counts,
    });
  } catch (error) {
    console.error("Approvals error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthUserId();
    const body = await request.json();
    const { expenseId, action, notes } = body; // action: submit | approve | reject | reimburse

    if (!expenseId || !action) {
      return NextResponse.json({ error: "expenseId and action required" }, { status: 400 });
    }

    const validActions = ["submit", "approve", "reject", "reimburse"];
    if (!validActions.includes(action)) {
      return NextResponse.json({ error: `Invalid action. Use: ${validActions.join(", ")}` }, { status: 400 });
    }

    const statusMap: Record<string, string> = {
      submit: "pending",
      approve: "approved",
      reject: "rejected",
      reimburse: "reimbursed",
    };

    // We store approval status in the notes/source field for now
    // In production, you'd add approvalStatus to the Expense model
    const expense = await prisma.expense.update({
      where: { id: expenseId },
      data: {
        source: statusMap[action],
        notes: notes ? `${action}: ${notes}` : undefined,
      },
    });

    return NextResponse.json({ success: true, status: statusMap[action], expenseId: expense.id });
  } catch (error) {
    console.error("Approval action error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
