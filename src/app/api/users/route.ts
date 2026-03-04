import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkPermission, logActivity } from "@/lib/rbac";

export async function GET() {
  try {
    const check = await checkPermission("read");
    if (!check.allowed) {
      return NextResponse.json({ error: check.error }, { status: check.status });
    }

    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        avatarUrl: true,
        createdAt: true,
        _count: {
          select: {
            expenses: true,
            invoices: true,
            activityLogs: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ users });
  } catch (error) {
    console.error("List users error:", error);
    return NextResponse.json({ error: "Failed to list users" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const check = await checkPermission("manage_users");
    if (!check.allowed) {
      return NextResponse.json({ error: check.error }, { status: check.status });
    }

    const body = await request.json();
    const { email, fullName, role } = body;

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const validRoles = ["admin", "accountant", "viewer", "approver"];
    if (role && !validRoles.includes(role)) {
      return NextResponse.json({ error: `Invalid role. Must be one of: ${validRoles.join(", ")}` }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "User with this email already exists" }, { status: 409 });
    }

    const user = await prisma.user.create({
      data: {
        email,
        fullName: fullName || email.split("@")[0],
        role: role || "viewer",
        organizationId: check.user.id ? undefined : undefined,
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        createdAt: true,
      },
    });

    await logActivity(check.user.id, "created", "user", user.id, { email, role: role || "viewer" });

    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    console.error("Create user error:", error);
    return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
  }
}
