import { NextRequest, NextResponse } from "next/server";
import { getAuthUserId } from "@/lib/auth";
import { generatePnL } from "@/lib/financial-intelligence";

export async function GET(request: NextRequest) {
  try {
    const userId = await getAuthUserId();
    const { searchParams } = new URL(request.url);

    const fromParam = searchParams.get("from");
    const toParam = searchParams.get("to");

    const now = new Date();
    const from = fromParam
      ? new Date(fromParam)
      : new Date(now.getFullYear(), now.getMonth(), 1);
    const to = toParam
      ? new Date(toParam)
      : new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const report = await generatePnL(userId, from, to);

    const lines: string[] = [];
    lines.push("Category,Type,Amount");

    for (const r of report.revenue) {
      lines.push(`"${r.label}",Revenue,${r.amount.toFixed(2)}`);
    }
    lines.push(`"Total Revenue",Revenue,${report.totalRevenue.toFixed(2)}`);
    lines.push("");

    for (const e of report.expenses) {
      lines.push(`"${e.label}",Expense,${e.amount.toFixed(2)}`);
    }
    lines.push(`"Total Expenses",Expense,${report.totalExpenses.toFixed(2)}`);
    lines.push("");
    lines.push(`"Net Income",,${report.netIncome.toFixed(2)}`);
    lines.push(`"Profit Margin",,${report.profitMargin.toFixed(2)}%`);

    const csv = lines.join("\n");
    const period = `${from.toISOString().slice(0, 10)}_${to.toISOString().slice(0, 10)}`;

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="PnL_${period}.csv"`,
      },
    });
  } catch (error) {
    console.error("P&L CSV export error:", error);
    return NextResponse.json(
      { error: "Failed to export P&L" },
      { status: 500 }
    );
  }
}
