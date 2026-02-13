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

    return NextResponse.json(report);
  } catch (error) {
    console.error("P&L report error:", error);
    return NextResponse.json(
      { error: "Failed to generate P&L report" },
      { status: 500 }
    );
  }
}
