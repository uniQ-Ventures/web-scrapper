import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkPermission, logActivity, Role } from "@/lib/rbac";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const check = await checkPermission("manage_users");
    if (!check.allowed) {
      return NextResponse.json({ error: check.error }, { status: check.status });
    }

    const { id } = await params;
    const body = await request.json();

    const validRoles: Role[] = ["admin", "accountant", "viewer", "approver"];
    if (body.role && !validRoles.includes(body.role)) {
      return NextResponse.json({ error: `Invalid role` }, { status: 400 });
    }

    const user = await prisma.user.update({
      where: { id },
      data: {
        ...(body.fullName && { fullName: body.fullName }),
        ...(body.role && { role: body.role }),
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        createdAt: true,
      },
    });

    await logActivity(check.user.id, "updated", "user", id, { role: body.role });

    return NextResponse.json({ user });
  } catch (error: unknown) {
    console.error("Update user error:", error);
    const prismaError = error as { code?: string };
    if (prismaError.code === "P2025") {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
  }
}
