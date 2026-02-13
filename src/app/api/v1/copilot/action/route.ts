import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { extractFounderOSToken } from "@/lib/founder-os-jwt";
import { getAuthUserId } from "@/lib/auth";
import { v4 as uuid } from "uuid";

/**
 * POST /api/v1/copilot/action
 *
 * Accepts mutation commands from the Founder OS orchestrator.
 * Supported actions:
 *   - createInvoice
 *   - logExpense
 *   - recordRevenue
 */
export async function POST(request: NextRequest) {
  try {
    const founderToken = extractFounderOSToken(request);

    let userId: string;
    try {
      userId = await getAuthUserId();
    } catch {
      if (founderToken?.sub) {
        userId = founderToken.sub;
      } else {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const body = await request.json();
    const { action, params } = body;

    if (!action) {
      return NextResponse.json({ error: "action is required" }, { status: 400 });
    }

    switch (action) {
      // ── CREATE INVOICE ─────────────────────────────────
      case "createInvoice": {
        const { clientId, dueDate, lineItems, notes, isInterState } = params || {};

        if (!dueDate || !lineItems?.length) {
          return NextResponse.json(
            { error: "dueDate and lineItems are required" },
            { status: 400 }
          );
        }

        // Compute totals
        let subtotal = 0;
        let taxTotal = 0;
        const processedItems = lineItems.map(
          (li: { description: string; quantity: number; unitPrice: number; gstRate?: number }) => {
            const amount = li.quantity * li.unitPrice;
            const gstRate = li.gstRate ?? 18;
            const tax = amount * (gstRate / 100);
            subtotal += amount;
            taxTotal += tax;
            return { ...li, total: amount + tax };
          }
        );

        // Generate invoice number
        const count = await prisma.invoice.count({ where: { userId } });
        const invoiceNumber = `INV-${String(count + 1).padStart(4, "0")}`;

        const invoice = await prisma.invoice.create({
          data: {
            id: uuid(),
            invoiceNumber,
            userId,
            clientId: clientId || null,
            issueDate: new Date(),
            dueDate: new Date(dueDate),
            subtotal,
            taxTotal,
            total: subtotal + taxTotal,
            notes: notes || null,
            isInterState: isInterState || false,
            status: "draft",
            lineItems: {
              create: processedItems.map((li: { description: string; quantity: number; unitPrice: number; gstRate?: number; total: number }) => ({
                id: uuid(),
                description: li.description,
                quantity: li.quantity,
                unitPrice: li.unitPrice,
                gstRate: li.gstRate ?? 18,
                total: li.total,
              }))
            },
          },
          include: { lineItems: true, client: true },
        });

        return NextResponse.json({ success: true, action: "createInvoice", result: invoice });
      }

      // ── LOG EXPENSE ────────────────────────────────────
      case "logExpense": {
        const { description, amount, date, vendor, notes: expNotes, categoryId: expCategoryId, accountId, isRecurring } = params || {};

        if (!description || !amount) {
          return NextResponse.json(
            { error: "description and amount are required" },
            { status: 400 }
          );
        }

        const expense = await prisma.expense.create({
          data: {
            id: uuid(),
            userId,
            description,
            amount: Number(amount),
            date: date ? new Date(date) : new Date(),
            vendor: vendor || undefined,
            notes: expNotes || undefined,
            categoryId: expCategoryId || undefined,
            accountId: accountId || undefined,
            isRecurring: isRecurring || false,
          },
          include: { category: true },
        });

        if (accountId) {
          await prisma.account.update({
            where: { id: accountId },
            data: { currentBalance: { decrement: Number(amount) } },
          });
        }

        return NextResponse.json({ success: true, action: "logExpense", result: expense });
      }

      // ── RECORD REVENUE ─────────────────────────────────
      case "recordRevenue": {
        const { amount: revAmount, type, source, clientId: revClientId, month } = params || {};

        if (!revAmount || !type) {
          return NextResponse.json(
            { error: "amount and type are required" },
            { status: 400 }
          );
        }

        const revenue = await prisma.revenue.create({
          data: {
            id: uuid(),
            userId,
            amount: Number(revAmount),
            type, // 'recurring' or 'one-time'
            source: source || null,
            clientId: revClientId || null,
            month: month ? new Date(month) : new Date(),
          },
        });

        return NextResponse.json({ success: true, action: "recordRevenue", result: revenue });
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}`, supportedActions: ["createInvoice", "logExpense", "recordRevenue"] },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("[copilot/action] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
