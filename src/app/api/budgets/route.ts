import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUserId } from "@/lib/auth";

/**
 * GET /api/budgets — List budget thresholds with actuals
 */
export async function GET() {
  try {
    const userId = await getAuthUserId();
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { organizationId: true },
    });

    if (!user?.organizationId) {
      return NextResponse.json({ budgets: [], summary: { totalBudget: 0, totalSpent: 0, variance: 0 } });
    }

    const budgets = await prisma.budgetThreshold.findMany({
      where: { organizationId: user.organizationId },
      orderBy: { category: "asc" },
    });

    // Get current month's expenses grouped by category-like fields
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const expenses = await prisma.expense.findMany({
      where: {
        userId,
        date: { gte: startOfMonth, lte: endOfMonth },
      },
      include: { category: true },
    });

    // Map expenses to categories
    const spentByCategory: Record<string, number> = {};
    for (const exp of expenses) {
      const catName = exp.category?.name || "Misc";
      spentByCategory[catName] = (spentByCategory[catName] || 0) + Number(exp.amount);
    }

    // Enrich budgets with actual spend
    const enriched = budgets.map((b) => {
      const spent = spentByCategory[b.category] || 0;
      const utilization = b.monthlyLimit ? (spent / Number(b.monthlyLimit)) * 100 : 0;
      const isOverBudget = utilization > 100;
      const isWarning = utilization >= Number(b.alertAt) * 100;

      return {
        id: b.id,
        category: b.category,
        monthlyLimit: Number(b.monthlyLimit),
        alertAt: Number(b.alertAt),
        spent,
        remaining: Math.max(Number(b.monthlyLimit) - spent, 0),
        utilization: Math.round(utilization),
        isOverBudget,
        isWarning,
      };
    });

    const totalBudget = enriched.reduce((acc, b) => acc + b.monthlyLimit, 0);
    const totalSpent = enriched.reduce((acc, b) => acc + b.spent, 0);

    return NextResponse.json({
      budgets: enriched,
      summary: {
        totalBudget,
        totalSpent,
        variance: totalBudget - totalSpent,
        utilizationPct: totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0,
      },
      month: startOfMonth.toISOString(),
    });
  } catch (error) {
    console.error("Budgets error:", error);
    return NextResponse.json({ error: "Failed to fetch budgets" }, { status: 500 });
  }
}

/**
 * POST /api/budgets — Create or update a budget threshold
 */
export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthUserId();
    const body = await request.json();
    const { category, monthlyLimit, alertAt } = body;

    if (!category || !monthlyLimit) {
      return NextResponse.json(
        { error: "category and monthlyLimit are required" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { organizationId: true },
    });

    if (!user?.organizationId) {
      return NextResponse.json({ error: "No organization found" }, { status: 400 });
    }

    // Upsert by category
    const existing = await prisma.budgetThreshold.findFirst({
      where: { organizationId: user.organizationId, category },
    });

    let budget;
    if (existing) {
      budget = await prisma.budgetThreshold.update({
        where: { id: existing.id },
        data: { monthlyLimit, alertAt: alertAt || 0.8 },
      });
    } else {
      budget = await prisma.budgetThreshold.create({
        data: {
          category,
          monthlyLimit,
          alertAt: alertAt || 0.8,
          organizationId: user.organizationId,
        },
      });
    }

    return NextResponse.json(budget, { status: 201 });
  } catch (error) {
    console.error("Create budget error:", error);
    return NextResponse.json({ error: "Failed to save budget" }, { status: 500 });
  }
}

/**
 * DELETE /api/budgets — Delete a budget threshold
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID required" }, { status: 400 });
    }

    await prisma.budgetThreshold.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete budget error:", error);
    return NextResponse.json({ error: "Failed to delete budget" }, { status: 500 });
  }
}
