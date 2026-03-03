import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUserId } from "@/lib/auth";

/**
 * POST /api/bookkeeper — AI Bookkeeper: parse natural language commands
 * Examples: "Log ₹5000 for AWS this month", "How much did I spend on rent?"
 */
export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthUserId();
    const { command } = await request.json();

    if (!command) {
      return NextResponse.json({ error: "Command required" }, { status: 400 });
    }

    const lower = command.toLowerCase().trim();
    const now = new Date();

    // Pattern: Log/Record expense
    const logMatch = lower.match(/(?:log|record|add|create)\s+(?:₹|rs\.?|inr\s*)?([\d,]+)\s+(?:for|on|to)\s+(.+?)(?:\s+(?:this|last|in)\s+(month|week|today))?$/i);
    if (logMatch) {
      const amount = Number(logMatch[1].replace(/,/g, ""));
      const description = logMatch[2].trim();
      const period = logMatch[3] || "today";

      let date = now;
      if (period === "last month") date = new Date(now.getFullYear(), now.getMonth() - 1, 15);

      const expense = await prisma.expense.create({
        data: {
          description,
          amount,
          date,
          vendor: description,
          userId,
        },
      });

      return NextResponse.json({
        response: `✅ Logged ₹${amount.toLocaleString("en-IN")} for "${description}" on ${date.toLocaleDateString("en-IN")}`,
        action: "expense_created",
        data: { id: expense.id, description, amount, date: date.toISOString() },
      });
    }

    // Pattern: How much spent on X / total X spending
    const spendMatch = lower.match(/(?:how much|total|what)\s+(?:did i|have i|i)?\s*(?:spend|spent|spending)\s+(?:on\s+)?(.+?)(?:\s+(?:this|last)\s+(month|quarter|year))?$/i);
    if (spendMatch) {
      const category = spendMatch[1].trim();
      const period = spendMatch[2] || "month";

      let from = new Date(now.getFullYear(), now.getMonth(), 1);
      if (period === "last month") from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      if (period === "quarter") from = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
      if (period === "year") from = new Date(now.getFullYear(), 0, 1);

      const expenses = await prisma.expense.findMany({
        where: {
          userId,
          date: { gte: from },
          OR: [
            { description: { contains: category, mode: "insensitive" } },
            { vendor: { contains: category, mode: "insensitive" } },
          ],
        },
      });

      const total = expenses.reduce((s, e) => s + Number(e.amount), 0);

      return NextResponse.json({
        response: `📊 You spent **₹${total.toLocaleString("en-IN")}** on "${category}" (${expenses.length} transactions since ${from.toLocaleDateString("en-IN")})`,
        action: "query",
        data: { total, count: expenses.length, category, from: from.toISOString() },
      });
    }

    // Pattern: Revenue / income this month
    const revenueMatch = lower.match(/(?:revenue|income|earnings|sales)\s*(?:this|last)?\s*(month|quarter|year)?/i);
    if (revenueMatch) {
      const period = revenueMatch[1] || "month";
      let from = new Date(now.getFullYear(), now.getMonth(), 1);
      if (period === "year") from = new Date(now.getFullYear(), 0, 1);

      const revenues = await prisma.revenue.findMany({
        where: { userId, month: { gte: from } },
      });
      const total = revenues.reduce((s, r) => s + Number(r.amount), 0);

      return NextResponse.json({
        response: `💰 Revenue this ${period}: **₹${total.toLocaleString("en-IN")}** (${revenues.length} entries)`,
        action: "query",
        data: { total, count: revenues.length },
      });
    }

    // Pattern: Create invoice
    const invoiceMatch = lower.match(/(?:create|make|generate)\s+(?:an?\s+)?invoice\s+(?:for\s+)?(?:₹|rs\.?|inr\s*)?([\d,]+)\s+(?:to|for)\s+(.+)/i);
    if (invoiceMatch) {
      const amount = Number(invoiceMatch[1].replace(/,/g, ""));
      const clientName = invoiceMatch[2].trim();

      // Find or create client
      let client = await prisma.client.findFirst({
        where: { userId, name: { contains: clientName, mode: "insensitive" } },
      });

      if (!client) {
        client = await prisma.client.create({
          data: { name: clientName, userId },
        });
      }

      const count = await prisma.invoice.count({ where: { userId } });
      const invoice = await prisma.invoice.create({
        data: {
          invoiceNumber: `INV-${String(count + 1).padStart(4, "0")}`,
          clientId: client.id,
          issueDate: now,
          dueDate: new Date(now.getTime() + 30 * 86400000),
          subtotal: amount,
          taxTotal: Math.round(amount * 0.18),
          total: Math.round(amount * 1.18),
          status: "draft",
          userId,
        },
      });

      return NextResponse.json({
        response: `📄 Created invoice **${invoice.invoiceNumber}** for ₹${amount.toLocaleString("en-IN")} + GST to "${clientName}" (due ${invoice.dueDate.toLocaleDateString("en-IN")})`,
        action: "invoice_created",
        data: { id: invoice.id, invoiceNumber: invoice.invoiceNumber, amount, client: clientName },
      });
    }

    // Pattern: Summary / overview
    if (lower.match(/(?:summary|overview|status|dashboard|how am i doing)/)) {
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const [revenues, expenses, invoices] = await Promise.all([
        prisma.revenue.findMany({ where: { userId, month: { gte: monthStart } } }),
        prisma.expense.findMany({ where: { userId, date: { gte: monthStart } } }),
        prisma.invoice.findMany({ where: { userId, status: { in: ["sent", "overdue"] } } }),
      ]);

      const revenue = revenues.reduce((s, r) => s + Number(r.amount), 0);
      const expenseTotal = expenses.reduce((s, e) => s + Number(e.amount), 0);
      const outstanding = invoices.reduce((s, i) => s + Number(i.total), 0);

      return NextResponse.json({
        response: `📋 **Monthly Summary:**\n• Revenue: ₹${revenue.toLocaleString("en-IN")}\n• Expenses: ₹${expenseTotal.toLocaleString("en-IN")}\n• Profit: ₹${(revenue - expenseTotal).toLocaleString("en-IN")}\n• Outstanding invoices: ₹${outstanding.toLocaleString("en-IN")} (${invoices.length})`,
        action: "summary",
        data: { revenue, expenses: expenseTotal, profit: revenue - expenseTotal, outstanding },
      });
    }

    return NextResponse.json({
      response: `🤔 I didn't understand that. Try:\n• "Log ₹5000 for AWS"\n• "How much did I spend on rent?"\n• "Revenue this month"\n• "Create invoice for ₹50000 to Acme"\n• "Summary"`,
      action: "help",
    });
  } catch (error) {
    console.error("Bookkeeper error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
