import { NextRequest, NextResponse } from "next/server";
import { getAuthUserId } from "@/lib/auth";
import { calculateGSTSummary } from "@/lib/financial-intelligence";

export async function GET(request: NextRequest) {
  try {
    const userId = await getAuthUserId();
    const { searchParams } = new URL(request.url);

    const fromParam = searchParams.get("from");
    const toParam = searchParams.get("to");

    // Default to current quarter
    const now = new Date();
    const quarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
    const quarterEnd = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3 + 3, 0);

    const from = fromParam ? new Date(fromParam) : quarterStart;
    const to = toParam ? new Date(toParam) : quarterEnd;

    const summary = await calculateGSTSummary(userId, from, to);

    return NextResponse.json(summary);
  } catch (error) {
    console.error("GST summary error:", error);
    return NextResponse.json(
      { error: "Failed to generate GST summary" },
      { status: 500 }
    );
  }
}
