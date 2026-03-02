import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUserId } from "@/lib/auth";
import { TDS_SECTIONS, calculateTDS, getCurrentQuarter, TDS_QUARTERS } from "@/lib/tds";

/**
 * GET /api/tds — TDS summary, quarterly breakdown, vendor-wise deductions
 */
export async function GET(request: NextRequest) {
  try {
    const userId = await getAuthUserId();
    const { searchParams } = new URL(request.url);
    const quarter = searchParams.get("quarter") || getCurrentQuarter().quarter;

    // Get expenses that have TDS applicable (vendor with PAN, professional services, rent, etc.)
    const now = new Date();
    const fy = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;

    // Map quarter to date range
    const qMap: Record<string, { start: Date; end: Date }> = {
      Q1: { start: new Date(fy, 3, 1), end: new Date(fy, 5, 30) },
      Q2: { start: new Date(fy, 6, 1), end: new Date(fy, 8, 30) },
      Q3: { start: new Date(fy, 9, 1), end: new Date(fy, 11, 31) },
      Q4: { start: new Date(fy + 1, 0, 1), end: new Date(fy + 1, 2, 31) },
    };

    const range = qMap[quarter] || qMap.Q1;

    const expenses = await prisma.expense.findMany({
      where: {
        userId,
        date: { gte: range.start, lte: range.end },
      },
      include: { category: true },
      orderBy: { date: "desc" },
    });

    // Group by vendor and calculate TDS
    const vendorTDS: Record<string, {
      vendor: string;
      totalAmount: number;
      tdsSection: string;
      tdsRate: number;
      tdsAmount: number;
      netPayable: number;
      transactions: number;
    }> = {};

    // TDS-applicable categories
    const tdsCategories = ["Professional Services", "Office", "Infrastructure"];

    for (const exp of expenses) {
      const catName = exp.category?.name || "";
      if (!tdsCategories.includes(catName) && !catName.includes("Rent")) continue;

      const vendorName = exp.vendor || "Unknown Vendor";
      const section = catName.includes("Rent") ? "194I(b)" :
        catName === "Professional Services" ? "194J(b)" :
          catName === "Infrastructure" ? "194J(a)" : "194C";

      if (!vendorTDS[vendorName]) {
        vendorTDS[vendorName] = {
          vendor: vendorName,
          totalAmount: 0,
          tdsSection: section,
          tdsRate: 0,
          tdsAmount: 0,
          netPayable: 0,
          transactions: 0,
        };
      }

      vendorTDS[vendorName].totalAmount += Number(exp.amount);
      vendorTDS[vendorName].transactions += 1;
    }

    // Calculate TDS for each vendor
    const vendorList = Object.values(vendorTDS).map((v) => {
      const calc = calculateTDS(v.totalAmount, v.tdsSection, true);
      return {
        ...v,
        tdsRate: calc.tdsRate,
        tdsAmount: calc.tdsAmount,
        netPayable: calc.netPayable,
      };
    });

    const totalTDS = vendorList.reduce((sum, v) => sum + v.tdsAmount, 0);
    const totalGross = vendorList.reduce((sum, v) => sum + v.totalAmount, 0);

    return NextResponse.json({
      quarter,
      fiscalYear: `FY ${fy}-${(fy + 1).toString().slice(2)}`,
      dateRange: { from: range.start.toISOString(), to: range.end.toISOString() },
      summary: {
        totalGross,
        totalTDS,
        totalNet: totalGross - totalTDS,
        vendorCount: vendorList.length,
        transactionCount: expenses.length,
      },
      vendors: vendorList.sort((a, b) => b.tdsAmount - a.tdsAmount),
      sections: TDS_SECTIONS,
      quarters: TDS_QUARTERS,
      currentQuarter: getCurrentQuarter(),
    });
  } catch (error) {
    console.error("TDS error:", error);
    return NextResponse.json({ error: "Failed to generate TDS report" }, { status: 500 });
  }
}
