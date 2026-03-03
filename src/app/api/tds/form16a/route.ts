import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUserId } from "@/lib/auth";
import { TDS_SECTIONS } from "@/lib/tds";

/**
 * GET /api/tds/form16a — Generate Form 16A data (TDS certificate for vendors)
 */
export async function GET(request: NextRequest) {
  try {
    const userId = await getAuthUserId();
    const { searchParams } = new URL(request.url);
    const quarter = searchParams.get("quarter") || "Q1";
    const fy = searchParams.get("fy") || `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`;
    const vendorId = searchParams.get("vendorId");

    const org = await prisma.organization.findFirst({
      where: { users: { some: { id: userId } } },
    });

    // Quarter date ranges
    const fyStart = parseInt(fy.split("-")[0]);
    const quarterRanges: Record<string, { from: Date; to: Date }> = {
      Q1: { from: new Date(fyStart, 3, 1), to: new Date(fyStart, 5, 30) },
      Q2: { from: new Date(fyStart, 6, 1), to: new Date(fyStart, 8, 30) },
      Q3: { from: new Date(fyStart, 9, 1), to: new Date(fyStart, 11, 31) },
      Q4: { from: new Date(fyStart + 1, 0, 1), to: new Date(fyStart + 1, 2, 31) },
    };

    const range = quarterRanges[quarter] || quarterRanges.Q1;

    const where: Record<string, unknown> = {
      userId,
      date: { gte: range.from, lte: range.to },
    };
    if (vendorId) where.vendorId = vendorId;

    const expenses = await prisma.expense.findMany({
      where,
      include: { category: true },
      orderBy: { date: "asc" },
    });

    // Group by vendor
    const vendorMap: Record<string, { vendor: string; expenses: typeof expenses; totalPaid: number; tdsDeducted: number }> = {};

    for (const e of expenses) {
      const vendor = e.vendor || "Unknown";
      if (!vendorMap[vendor]) vendorMap[vendor] = { vendor, expenses: [], totalPaid: 0, tdsDeducted: 0 };
      vendorMap[vendor].expenses.push(e);
      vendorMap[vendor].totalPaid += Number(e.amount);
      // Simplified TDS calc: 10% for professional services, 2% for contractors, 1% otherwise
      const cat = e.category?.name?.toLowerCase() || "";
      const tdsRate = cat.includes("professional") || cat.includes("consulting") ? 0.10
        : cat.includes("contract") ? 0.02 : 0.01;
      vendorMap[vendor].tdsDeducted += Math.round(Number(e.amount) * tdsRate);
    }

    const certificates = Object.values(vendorMap).map((v) => ({
      certificateNumber: `F16A-${quarter}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
      deductorName: org?.name || "Company",
      deductorTAN: org?.gstNumber ? `TAN${org.gstNumber.slice(2, 12)}` : "TANXXXXXXX",
      deducteeName: v.vendor,
      quarter,
      financialYear: fy,
      totalAmountPaid: v.totalPaid,
      totalTdsDeducted: v.tdsDeducted,
      dateRange: { from: range.from.toISOString().slice(0, 10), to: range.to.toISOString().slice(0, 10) },
      transactionCount: v.expenses.length,
    }));

    return NextResponse.json({
      certificates,
      summary: {
        quarter,
        fy,
        totalVendors: certificates.length,
        totalPaid: certificates.reduce((s, c) => s + c.totalAmountPaid, 0),
        totalTds: certificates.reduce((s, c) => s + c.totalTdsDeducted, 0),
      },
    });
  } catch (error) {
    console.error("Form 16A error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
