import { NextRequest, NextResponse } from "next/server";
import { getAuthUserId } from "@/lib/auth";
import { projectCashFlow } from "@/lib/financial-intelligence";

export async function GET(request: NextRequest) {
  try {
    const userId = await getAuthUserId();
    const { searchParams } = new URL(request.url);
    const months = parseInt(searchParams.get("months") || "6", 10);

    const projection = await projectCashFlow(userId, Math.min(months, 24));

    return NextResponse.json(projection);
  } catch (error) {
    console.error("Cash flow projection error:", error);
    return NextResponse.json(
      { error: "Failed to generate cash flow projection" },
      { status: 500 }
    );
  }
}
