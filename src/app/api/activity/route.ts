import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const resource = searchParams.get("resource") || "";
    const action = searchParams.get("action") || "";
    const limit = Math.min(Number(searchParams.get("limit")) || 50, 100);

    const where: Record<string, unknown> = {};
    if (resource) where.resource = resource;
    if (action) where.action = action;

    const activities = await prisma.activityLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        user: {
          select: { id: true, fullName: true, email: true, role: true, avatarUrl: true },
        },
      },
    });

    return NextResponse.json({ activities });
  } catch (error) {
    console.error("Activity feed error:", error);
    return NextResponse.json({ error: "Failed to load activity feed" }, { status: 500 });
  }
}
