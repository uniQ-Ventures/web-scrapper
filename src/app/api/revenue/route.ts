import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUserId } from "@/lib/auth";

export async function GET() {
  try {
    const revenues = await prisma.revenue.findMany({
      where: { userId: await getAuthUserId() },
      include: { client: true },
      orderBy: { month: "desc" },
    });

    return NextResponse.json({ revenues });
  } catch (error) {
    console.error("List revenue error:", error);
    return NextResponse.json({ error: "Failed to list revenue" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { month, amount, type, source, notes, clientId } = body;

    if (!month || !amount) {
      return NextResponse.json(
        { error: "month and amount are required" },
        { status: 400 }
      );
    }

    const revenue = await prisma.revenue.create({
      data: {
        userId: await getAuthUserId(),
        month: new Date(month),
        amount,
        type: type || "recurring",
        source,
        notes,
        clientId: clientId || undefined,
      },
      include: { client: true },
    });

    return NextResponse.json({ revenue }, { status: 201 });
  } catch (error) {
    console.error("Create revenue error:", error);
    return NextResponse.json({ error: "Failed to create revenue" }, { status: 500 });
  }
}
