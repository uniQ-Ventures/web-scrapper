import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUserId } from "@/lib/auth";

export async function GET() {
  try {
    const userId = await getAuthUserId();
    const accounts = await prisma.account.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ accounts });
  } catch (error) {
    console.error("List accounts error:", error);
    return NextResponse.json({ error: "Failed to list accounts" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, type, currentBalance, currency } = body;

    if (!name) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    const account = await prisma.account.create({
      data: {
        userId: await getAuthUserId(),
        name,
        type: type || "bank",
        currentBalance: currentBalance || 0,
        currency: currency || "INR",
      },
    });

    return NextResponse.json({ account }, { status: 201 });
  } catch (error) {
    console.error("Create account error:", error);
    return NextResponse.json({ error: "Failed to create account" }, { status: 500 });
  }
}
