import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUserId } from "@/lib/auth";

/**
 * GET /api/vendors — List vendors with spending totals
 */
export async function GET() {
  try {
    const userId = await getAuthUserId();

    const vendors = await prisma.vendor.findMany({
      where: { userId },
      orderBy: { name: "asc" },
      include: {
        _count: { select: { expenses: true } },
      },
    });

    // Get spending totals per vendor
    const vendorIds = vendors.map((v) => v.id);
    const spending = await prisma.expense.groupBy({
      by: ["vendorId"],
      where: { vendorId: { in: vendorIds } },
      _sum: { amount: true },
    });

    const spendMap = new Map(
      spending.map((s) => [s.vendorId, Number(s._sum.amount ?? 0)])
    );

    return NextResponse.json({
      vendors: vendors.map((v) => ({
        id: v.id,
        name: v.name,
        email: v.email,
        phone: v.phone,
        company: v.company,
        gstNumber: v.gstNumber,
        panNumber: v.panNumber,
        paymentTerms: v.paymentTerms,
        isActive: v.isActive,
        totalSpent: spendMap.get(v.id) || 0,
        expenseCount: v._count.expenses,
        createdAt: v.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error("List vendors error:", error);
    return NextResponse.json({ error: "Failed to fetch vendors" }, { status: 500 });
  }
}

/**
 * POST /api/vendors — Create a vendor
 */
export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthUserId();
    const body = await request.json();
    const { name, email, phone, company, gstNumber, panNumber, bankName, bankAccount, bankIfsc, paymentTerms, address, notes } = body;

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { organizationId: true },
    });

    const vendor = await prisma.vendor.create({
      data: {
        name,
        email,
        phone,
        company,
        gstNumber,
        panNumber,
        bankName,
        bankAccount,
        bankIfsc,
        paymentTerms: paymentTerms || 30,
        address,
        notes,
        userId,
        organizationId: user?.organizationId,
      },
    });

    return NextResponse.json(vendor, { status: 201 });
  } catch (error: unknown) {
    if (error && typeof error === "object" && "code" in error && (error as { code: string }).code === "P2002") {
      return NextResponse.json({ error: "Vendor with this name already exists" }, { status: 409 });
    }
    console.error("Create vendor error:", error);
    return NextResponse.json({ error: "Failed to create vendor" }, { status: 500 });
  }
}

/**
 * PATCH /api/vendors — Update a vendor
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...data } = body;

    if (!id) {
      return NextResponse.json({ error: "ID required" }, { status: 400 });
    }

    const vendor = await prisma.vendor.update({
      where: { id },
      data,
    });

    return NextResponse.json(vendor);
  } catch (error) {
    console.error("Update vendor error:", error);
    return NextResponse.json({ error: "Failed to update vendor" }, { status: 500 });
  }
}

/**
 * DELETE /api/vendors — Delete a vendor
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID required" }, { status: 400 });
    }

    await prisma.vendor.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete vendor error:", error);
    return NextResponse.json({ error: "Failed to delete vendor" }, { status: 500 });
  }
}
