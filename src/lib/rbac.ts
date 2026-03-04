/**
 * RBAC (Role-Based Access Control) Middleware
 *
 * Roles: admin, accountant, viewer, approver
 *
 * Permissions:
 * - admin:      Full access (read, write, delete, manage users)
 * - accountant: Read + Write (create/edit invoices, expenses, reports)
 * - approver:   Read + Approve/Reject expenses
 * - viewer:     Read-only access
 */

import { prisma } from "@/lib/prisma";

export type Role = "admin" | "accountant" | "viewer" | "approver";
export type Permission = "read" | "write" | "delete" | "approve" | "manage_users";

const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  admin: ["read", "write", "delete", "approve", "manage_users"],
  accountant: ["read", "write", "delete"],
  approver: ["read", "approve"],
  viewer: ["read"],
};

const DEFAULT_USER_ID = "demo-user-00000000-0000-0000-0000";

export function hasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function getAllPermissions(role: Role): Permission[] {
  return ROLE_PERMISSIONS[role] || [];
}

/**
 * Get current user with role. In production, this would read from session.
 */
export async function getCurrentUser() {
  const user = await prisma.user.findUnique({
    where: { id: DEFAULT_USER_ID },
    select: { id: true, email: true, fullName: true, role: true },
  });

  return user ? { ...user, role: (user.role as Role) || "admin" } : null;
}

/**
 * Check if current user has required permission.
 * Returns { allowed: true, user } or { allowed: false, error }.
 */
export async function checkPermission(permission: Permission) {
  const user = await getCurrentUser();

  if (!user) {
    return { allowed: false as const, error: "Unauthorized", status: 401 };
  }

  if (!hasPermission(user.role, permission)) {
    return {
      allowed: false as const,
      error: `Insufficient permissions. Role '${user.role}' does not have '${permission}' access.`,
      status: 403,
    };
  }

  return { allowed: true as const, user };
}

/**
 * Log an activity to the ActivityLog table.
 */
export async function logActivity(
  userId: string,
  action: string,
  resource: string,
  resourceId?: string,
  metadata?: Record<string, unknown>
) {
  try {
    await prisma.activityLog.create({
      data: {
        action,
        resource,
        resourceId: resourceId || null,
        metadata: metadata ? JSON.stringify(metadata) : null,
        userId,
      },
    });
  } catch (error) {
    console.error("[rbac] Failed to log activity:", error);
  }
}
