import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUserId } from "@/lib/auth";

/**
 * GET /api/forecast — Revenue forecasting with trend analysis and cash flow projection
 */
export async function GET() {
  try {
    const userId = await getAuthUserId();
    const now = new Date();

    // Get last 6 months of revenue and expenses
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1);

    const [revenues, expenses, invoices] = await Promise.all([
      prisma.revenue.findMany({
        where: { userId, month: { gte: sixMonthsAgo } },
        orderBy: { month: "asc" },
      }),
      prisma.expense.findMany({
        where: { userId, date: { gte: sixMonthsAgo } },
        orderBy: { date: "asc" },
      }),
      prisma.invoice.findMany({
        where: { userId, status: { in: ["sent", "partial"] }, dueDate: { gte: now } },
        orderBy: { dueDate: "asc" },
        take: 20,
      }),
    ]);

    // Group by month
    const monthlyData: Record<string, { revenue: number; expenses: number }> = {};
    for (let i = -6; i <= 0; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const key = d.toISOString().slice(0, 7);
      monthlyData[key] = { revenue: 0, expenses: 0 };
    }

    for (const r of revenues) {
      const key = r.month.toISOString().slice(0, 7);
      if (monthlyData[key]) monthlyData[key].revenue += Number(r.amount);
    }

    for (const e of expenses) {
      const key = e.date.toISOString().slice(0, 7);
      if (monthlyData[key]) monthlyData[key].expenses += Number(e.amount);
    }

    const historicalMonths = Object.entries(monthlyData).map(([month, data]) => ({
      month,
      label: new Date(`${month}-01`).toLocaleDateString("en-IN", { month: "short", year: "2-digit" }),
      ...data,
      profit: data.revenue - data.expenses,
    }));

    // Simple linear regression for forecasting
    const revenueValues = historicalMonths.map((m) => m.revenue);
    const expenseValues = historicalMonths.map((m) => m.expenses);

    function linearForecast(values: number[], periods: number): number[] {
      const n = values.length;
      if (n === 0) return Array(periods).fill(0);
      const xMean = (n - 1) / 2;
      const yMean = values.reduce((s, v) => s + v, 0) / n;
      let num = 0, den = 0;
      for (let i = 0; i < n; i++) {
        num += (i - xMean) * (values[i] - yMean);
        den += (i - xMean) * (i - xMean);
      }
      const slope = den === 0 ? 0 : num / den;
      const intercept = yMean - slope * xMean;
      return Array.from({ length: periods }, (_, i) => Math.max(0, Math.round(intercept + slope * (n + i))));
    }

    const forecastRevenue = linearForecast(revenueValues, 6);
    const forecastExpenses = linearForecast(expenseValues, 6);

    const forecastMonths = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() + i + 1, 1);
      return {
        month: d.toISOString().slice(0, 7),
        label: d.toLocaleDateString("en-IN", { month: "short", year: "2-digit" }),
        revenue: forecastRevenue[i],
        expenses: forecastExpenses[i],
        profit: forecastRevenue[i] - forecastExpenses[i],
        isForecasted: true,
      };
    });

    // Cash flow scenarios
    const avgRevenue = revenueValues.length > 0 ? revenueValues.reduce((s, v) => s + v, 0) / revenueValues.length : 0;
    const avgExpenses = expenseValues.length > 0 ? expenseValues.reduce((s, v) => s + v, 0) / expenseValues.length : 0;

    const scenarios = {
      optimistic: {
        label: "Optimistic (+20% revenue, -10% costs)",
        monthlyRevenue: Math.round(avgRevenue * 1.2),
        monthlyExpenses: Math.round(avgExpenses * 0.9),
        monthlyProfit: Math.round(avgRevenue * 1.2 - avgExpenses * 0.9),
        annualProfit: Math.round((avgRevenue * 1.2 - avgExpenses * 0.9) * 12),
      },
      base: {
        label: "Base Case (current trend)",
        monthlyRevenue: Math.round(avgRevenue),
        monthlyExpenses: Math.round(avgExpenses),
        monthlyProfit: Math.round(avgRevenue - avgExpenses),
        annualProfit: Math.round((avgRevenue - avgExpenses) * 12),
      },
      conservative: {
        label: "Conservative (-10% revenue, +15% costs)",
        monthlyRevenue: Math.round(avgRevenue * 0.9),
        monthlyExpenses: Math.round(avgExpenses * 1.15),
        monthlyProfit: Math.round(avgRevenue * 0.9 - avgExpenses * 1.15),
        annualProfit: Math.round((avgRevenue * 0.9 - avgExpenses * 1.15) * 12),
      },
    };

    // Pipeline (upcoming invoices)
    const pipeline = invoices.map((inv) => ({
      invoiceNumber: inv.invoiceNumber,
      amount: Number(inv.total),
      dueDate: inv.dueDate.toISOString().slice(0, 10),
      status: inv.status,
    }));

    const totalPipeline = pipeline.reduce((s, p) => s + p.amount, 0);

    // Growth rate
    const firstHalf = revenueValues.slice(0, 3).reduce((s, v) => s + v, 0);
    const secondHalf = revenueValues.slice(3).reduce((s, v) => s + v, 0);
    const growthRate = firstHalf > 0 ? Math.round(((secondHalf - firstHalf) / firstHalf) * 100) : 0;

    return NextResponse.json({
      historical: historicalMonths,
      forecast: forecastMonths,
      scenarios,
      pipeline: { items: pipeline, total: totalPipeline },
      metrics: {
        avgMonthlyRevenue: Math.round(avgRevenue),
        avgMonthlyExpenses: Math.round(avgExpenses),
        avgMonthlyProfit: Math.round(avgRevenue - avgExpenses),
        growthRate,
        runway: avgExpenses > avgRevenue ? Math.round(totalPipeline / (avgExpenses - avgRevenue)) : Infinity,
      },
    });
  } catch (error) {
    console.error("Forecast error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
