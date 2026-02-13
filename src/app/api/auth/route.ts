import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const userId = "demo-user";

  const user = await prisma.user.upsert({
    where: { email: "demo@finance.app" },
    update: {},
    create: {
      id: userId,
      email: "demo@finance.app",
      fullName: "Demo User",
    },
  });

  return NextResponse.json({ user });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { email, fullName } = body;

  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  const user = await prisma.user.upsert({
    where: { email },
    update: { fullName },
    create: { email, fullName },
  });

  return NextResponse.json({ user });
}
