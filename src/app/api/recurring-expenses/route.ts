import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUserId } from "@/lib/auth";

/**
 * GET /api/recurring-expenses — List recurring expenses
 */
export async function GET() {
  try {
    const userId = await getAuthUserId();

    const recurring = await prisma.recurringExpense.findMany({
      where: { userId },
      orderBy: { nextDueDate: "asc" },
    });

    return NextResponse.json({
      recurringExpenses: recurring.map((r) => ({
        id: r.id,
        description: r.description,
        amount: Number(r.amount),
        frequency: r.frequency,
        nextDueDate: r.nextDueDate.toISOString(),
        lastCreated: r.lastCreated?.toISOString() || null,
        isActive: r.isActive,
        vendor: r.vendor,
        categoryId: r.categoryId,
        notes: r.notes,
      })),
    });
  } catch (error) {
    console.error("List recurring error:", error);
    return NextResponse.json({ error: "Failed to fetch recurring expenses" }, { status: 500 });
  }
}

/**
 * POST /api/recurring-expenses — Create a recurring expense
 */
export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthUserId();
    const body = await request.json();
    const { description, amount, frequency, startDate, vendor, categoryId, notes } = body;

    if (!description || !amount) {
      return NextResponse.json({ error: "Description and amount required" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { organizationId: true },
    });

    // Calculate next due date based on frequency
    const start = startDate ? new Date(startDate) : new Date();
    let nextDueDate = new Date(start);

    // If start is in the past, fast-forward to next occurrence
    const now = new Date();
    while (nextDueDate < now) {
      switch (frequency || "monthly") {
        case "weekly":
          nextDueDate.setDate(nextDueDate.getDate() + 7);
          break;
        case "monthly":
          nextDueDate.setMonth(nextDueDate.getMonth() + 1);
          break;
        case "quarterly":
          nextDueDate.setMonth(nextDueDate.getMonth() + 3);
          break;
        case "yearly":
          nextDueDate.setFullYear(nextDueDate.getFullYear() + 1);
          break;
      }
    }

    const re = await prisma.recurringExpense.create({
      data: {
        description,
        amount,
        frequency: frequency || "monthly",
        startDate: start,
        nextDueDate,
        vendor,
        categoryId,
        notes,
        userId,
        organizationId: user?.organizationId,
      },
    });

    return NextResponse.json(re, { status: 201 });
  } catch (error) {
    console.error("Create recurring error:", error);
    return NextResponse.json({ error: "Failed to create recurring expense" }, { status: 500 });
  }
}

/**
 * DELETE /api/recurring-expenses — Delete/deactivate a recurring expense
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID required" }, { status: 400 });
    }

    // Soft-delete: deactivate instead of hard delete
    await prisma.recurringExpense.update({
      where: { id },
      data: { isActive: false },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete recurring error:", error);
    return NextResponse.json({ error: "Failed to deactivate" }, { status: 500 });
  }
}

/**
 * PATCH /api/recurring-expenses — Process due recurring expenses (creates actual expenses)
 * Called periodically or on page load
 */
export async function PATCH() {
  try {
    const userId = await getAuthUserId();
    const now = new Date();

    const due = await prisma.recurringExpense.findMany({
      where: {
        userId,
        isActive: true,
        nextDueDate: { lte: now },
      },
    });

    let created = 0;

    for (const re of due) {
      // Create the expense
      await prisma.expense.create({
        data: {
          description: `${re.description} (auto)`,
          amount: re.amount,
          date: re.nextDueDate,
          vendor: re.vendor,
          isRecurring: true,
          source: "recurring",
          sourceId: re.id,
          categoryId: re.categoryId,
          userId: re.userId,
          organizationId: re.organizationId,
        },
      });

      // Advance nextDueDate
      const next = new Date(re.nextDueDate);
      switch (re.frequency) {
        case "weekly":
          next.setDate(next.getDate() + 7);
          break;
        case "monthly":
          next.setMonth(next.getMonth() + 1);
          break;
        case "quarterly":
          next.setMonth(next.getMonth() + 3);
          break;
        case "yearly":
          next.setFullYear(next.getFullYear() + 1);
          break;
      }

      // Check if past endDate
      const isStillActive = !re.endDate || next <= re.endDate;

      await prisma.recurringExpense.update({
        where: { id: re.id },
        data: {
          lastCreated: re.nextDueDate,
          nextDueDate: next,
          isActive: isStillActive,
        },
      });

      created++;
    }

    return NextResponse.json({ processed: created, message: `${created} expenses created` });
  } catch (error) {
    console.error("Process recurring error:", error);
    return NextResponse.json({ error: "Failed to process recurring" }, { status: 500 });
  }
}
