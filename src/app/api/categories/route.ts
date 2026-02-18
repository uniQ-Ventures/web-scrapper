import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUserId } from "@/lib/auth";

/**
 * GET /api/categories — List expense categories
 */
export async function GET() {
  try {
    const userId = await getAuthUserId();
    const categories = await prisma.expenseCategory.findMany({
      where: { userId },
      orderBy: { name: "asc" },
      include: { _count: { select: { expenses: true } } },
    });
    return NextResponse.json(categories);
  } catch (error) {
    console.error("Categories error:", error);
    return NextResponse.json(
      { error: "Failed to fetch categories" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/categories — Create a category
 */
export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthUserId();
    const body = await request.json();

    if (!body.name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { organizationId: true },
    });

    const category = await prisma.expenseCategory.create({
      data: {
        name: body.name,
        icon: body.icon || null,
        color: body.color || null,
        userId,
        organizationId: user?.organizationId || null,
      },
    });

    return NextResponse.json(category, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("Unique constraint")) {
      return NextResponse.json(
        { error: "Category already exists" },
        { status: 409 }
      );
    }
    console.error("Create category error:", error);
    return NextResponse.json(
      { error: "Failed to create category" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/categories — Delete a category by ID (query param)
 */
export async function DELETE(request: NextRequest) {
  try {
    const userId = await getAuthUserId();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    await prisma.expenseCategory.delete({
      where: { id, userId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete category error:", error);
    return NextResponse.json(
      { error: "Failed to delete category" },
      { status: 500 }
    );
  }
}
