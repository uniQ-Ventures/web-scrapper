import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUserId } from "@/lib/auth";

export async function GET() {
  try {
    const clients = await prisma.client.findMany({
      where: { userId: await getAuthUserId() },
      orderBy: { name: "asc" },
    });
    return NextResponse.json({ clients });
  } catch (error) {
    console.error("List clients error:", error);
    return NextResponse.json({ error: "Failed to list clients" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, phone, company, gstNumber, address } = body;

    if (!name) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    const client = await prisma.client.create({
      data: {
        userId: await getAuthUserId(),
        name,
        email,
        phone,
        company,
        gstNumber,
        address,
      },
    });

    return NextResponse.json({ client }, { status: 201 });
  } catch (error) {
    console.error("Create client error:", error);
    return NextResponse.json({ error: "Failed to create client" }, { status: 500 });
  }
}
