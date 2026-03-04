import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const userId = "demo-user-00000000-0000-0000-0000";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";

    const where: Record<string, unknown> = { userId };

    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { extractedVendor: { contains: search, mode: "insensitive" } },
        { extractedCategory: { contains: search, mode: "insensitive" } },
        { fileName: { contains: search, mode: "insensitive" } },
      ];
    }

    const receipts = await prisma.receipt.findMany({
      where,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        fileName: true,
        mimeType: true,
        status: true,
        confidence: true,
        extractedAmount: true,
        extractedVendor: true,
        extractedDate: true,
        extractedGst: true,
        extractedCategory: true,
        extractedData: true,
        expenseId: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ receipts });
  } catch (error) {
    console.error("List receipts error:", error);
    return NextResponse.json({ error: "Failed to list receipts" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const receipt = await prisma.receipt.create({
      data: {
        fileName: body.fileName || "receipt.jpg",
        mimeType: body.mimeType || "image/jpeg",
        imageData: body.imageData || "",
        status: body.status || "pending",
        confidence: body.confidence,
        extractedData: body.extractedData ? JSON.stringify(body.extractedData) : null,
        extractedAmount: body.extractedAmount,
        extractedVendor: body.extractedVendor,
        extractedDate: body.extractedDate ? new Date(body.extractedDate) : null,
        extractedGst: body.extractedGst,
        extractedCategory: body.extractedCategory,
        expenseId: body.expenseId,
        userId,
      },
    });

    return NextResponse.json({ receipt }, { status: 201 });
  } catch (error) {
    console.error("Create receipt error:", error);
    return NextResponse.json({ error: "Failed to create receipt" }, { status: 500 });
  }
}
