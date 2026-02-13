import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getRunway, getBurnRate, getRevenueData } from "@/lib/runway";
import { extractFounderOSToken } from "@/lib/founder-os-jwt";
import { getAuthUserId } from "@/lib/auth";

async function getUserId(request: NextRequest): Promise<string> {
  const token = extractFounderOSToken(request);
  if (token?.sub) return token.sub;
  return getAuthUserId();
}

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserId(request);

    const [runway, burnRate, revenue] = await Promise.all([
      getRunway(userId),
      getBurnRate(userId),
      getRevenueData(userId),
    ]);

    const outstandingInvoices = await prisma.invoice.findMany({
      where: { userId, status: { in: ["sent", "overdue"] } },
    });

    const recentExpenses = await prisma.expense.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 5,
    });

    const recentActivity = [
      ...recentExpenses.map((e) => ({
        type: "expense.logged",
        summary: `Expense: ${e.description} — ₹${Number(e.amount).toLocaleString()}`,
        timestamp: e.createdAt.toISOString(),
      })),
    ];

    return NextResponse.json({
      productId: "finance",
      status: "healthy",
      kpis: {
        monthlyRevenue: `₹${revenue.currentMRR.toLocaleString()}`,
        burnRate: `₹${burnRate.currentMonth.toLocaleString()}/mo`,
        runwayMonths: runway.runwayMonths,
        outstandingInvoices: outstandingInvoices.length,
      },
      recentActivity: recentActivity.slice(0, 5),
    });
  } catch (error) {
    console.error("Plugin dashboard error:", error);
    return NextResponse.json({
      productId: "finance",
      status: "error",
      kpis: {},
      recentActivity: [],
    });
  }
}
