import { prisma } from "@/lib/prisma";

export interface PnLLine {
  label: string;
  amount: number;
}

export interface PnLReport {
  period: { from: string; to: string };
  revenue: PnLLine[];
  totalRevenue: number;
  expenses: PnLLine[];
  totalExpenses: number;
  grossProfit: number;
  netIncome: number;
  profitMargin: number;
}

export async function generatePnL(
  userId: string,
  from: Date,
  to: Date
): Promise<PnLReport> {
  const [revenues, expenses] = await Promise.all([
    prisma.revenue.findMany({
      where: { userId, month: { gte: from, lte: to } },
      include: { client: true },
    }),
    prisma.expense.findMany({
      where: { userId, date: { gte: from, lte: to } },
      include: { category: true },
    }),
  ]);

  // Group revenue by type
  const revByType = new Map<string, number>();
  for (const r of revenues) {
    const key = r.type === "recurring" ? "Recurring Revenue" : "One-time Revenue";
    revByType.set(key, (revByType.get(key) || 0) + Number(r.amount));
  }

  const revenueLines: PnLLine[] = Array.from(revByType.entries())
    .map(([label, amount]) => ({ label, amount }))
    .sort((a, b) => b.amount - a.amount);

  const totalRevenue = revenueLines.reduce((s, l) => s + l.amount, 0);

  // Group expenses by category
  const expByCat = new Map<string, number>();
  for (const e of expenses) {
    const key = e.category?.name || e.department || "Uncategorized";
    expByCat.set(key, (expByCat.get(key) || 0) + Number(e.amount));
  }

  const expenseLines: PnLLine[] = Array.from(expByCat.entries())
    .map(([label, amount]) => ({ label, amount }))
    .sort((a, b) => b.amount - a.amount);

  const totalExpenses = expenseLines.reduce((s, l) => s + l.amount, 0);
  const grossProfit = totalRevenue - totalExpenses;
  const netIncome = grossProfit;
  const profitMargin = totalRevenue > 0 ? (netIncome / totalRevenue) * 100 : 0;

  return {
    period: { from: from.toISOString(), to: to.toISOString() },
    revenue: revenueLines,
    totalRevenue,
    expenses: expenseLines,
    totalExpenses,
    grossProfit,
    netIncome,
    profitMargin: Math.round(profitMargin * 100) / 100,
  };
}

export interface CashFlowProjection {
  month: string;
  inflow: number;
  outflow: number;
  net: number;
  balance: number;
}

export async function projectCashFlow(
  userId: string,
  months: number = 6
): Promise<{
  projections: CashFlowProjection[];
  currentBalance: number;
  projectedRunway: number;
}> {
  // Get last 3 months of data for averaging
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

  const [revenues, expenses, org] = await Promise.all([
    prisma.revenue.findMany({
      where: { userId, month: { gte: threeMonthsAgo } },
    }),
    prisma.expense.findMany({
      where: { userId, date: { gte: threeMonthsAgo } },
    }),
    prisma.organization.findFirst({
      where: { users: { some: { id: userId } } },
    }),
  ]);

  const currentBalance = Number(org?.cashInBank ?? 0);

  // Calculate monthly averages
  const revenueByMonth = new Map<string, number>();
  for (const r of revenues) {
    const key = `${r.month.getFullYear()}-${r.month.getMonth()}`;
    revenueByMonth.set(key, (revenueByMonth.get(key) || 0) + Number(r.amount));
  }

  const expenseByMonth = new Map<string, number>();
  for (const e of expenses) {
    const key = `${e.date.getFullYear()}-${e.date.getMonth()}`;
    expenseByMonth.set(key, (expenseByMonth.get(key) || 0) + Number(e.amount));
  }

  const avgInflow =
    revenueByMonth.size > 0
      ? Array.from(revenueByMonth.values()).reduce((s, v) => s + v, 0) / revenueByMonth.size
      : 0;

  const avgOutflow =
    expenseByMonth.size > 0
      ? Array.from(expenseByMonth.values()).reduce((s, v) => s + v, 0) / expenseByMonth.size
      : 0;

  // Generate projections
  const projections: CashFlowProjection[] = [];
  let balance = currentBalance;
  let runwayMonths = months;

  for (let i = 0; i < months; i++) {
    const date = new Date();
    date.setMonth(date.getMonth() + i + 1);
    const monthStr = date.toLocaleDateString("en-US", { month: "short", year: "numeric" });

    const net = avgInflow - avgOutflow;
    balance += net;

    if (balance <= 0 && runwayMonths === months) {
      runwayMonths = i + 1;
    }

    projections.push({
      month: monthStr,
      inflow: Math.round(avgInflow),
      outflow: Math.round(avgOutflow),
      net: Math.round(net),
      balance: Math.round(Math.max(0, balance)),
    });
  }

  return { projections, currentBalance, projectedRunway: runwayMonths };
}

export interface GSTSummary {
  period: { from: string; to: string };
  outputTax: { cgst: number; sgst: number; igst: number; total: number };
  inputTax: number;
  netPayable: number;
  invoiceCount: number;
  expenseCount: number;
}

export async function calculateGSTSummary(
  userId: string,
  from: Date,
  to: Date
): Promise<GSTSummary> {
  const [invoices, expenses] = await Promise.all([
    prisma.invoice.findMany({
      where: {
        userId,
        issueDate: { gte: from, lte: to },
        status: { not: "draft" },
      },
      include: { lineItems: true },
    }),
    prisma.expense.findMany({
      where: { userId, date: { gte: from, lte: to } },
    }),
  ]);

  // Output tax from invoices
  let totalCGST = 0;
  let totalSGST = 0;
  let totalIGST = 0;

  for (const inv of invoices) {
    for (const item of inv.lineItems) {
      totalCGST += Number(item.cgst);
      totalSGST += Number(item.sgst);
      totalIGST += Number(item.igst);
    }
  }

  const outputTotal = totalCGST + totalSGST + totalIGST;

  // Estimate input tax credit (assumed 18% GST on all expenses with receipts)
  const expensesWithReceipts = expenses.filter((e) => e.receipt);
  const inputTax = expensesWithReceipts.reduce(
    (sum, e) => sum + Number(e.amount) * 0.18,
    0
  );

  return {
    period: { from: from.toISOString(), to: to.toISOString() },
    outputTax: {
      cgst: Math.round(totalCGST * 100) / 100,
      sgst: Math.round(totalSGST * 100) / 100,
      igst: Math.round(totalIGST * 100) / 100,
      total: Math.round(outputTotal * 100) / 100,
    },
    inputTax: Math.round(inputTax * 100) / 100,
    netPayable: Math.round((outputTotal - inputTax) * 100) / 100,
    invoiceCount: invoices.length,
    expenseCount: expensesWithReceipts.length,
  };
}
