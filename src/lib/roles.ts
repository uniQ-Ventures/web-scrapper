/**
 * Role-based access control (RBAC)
 * Roles: admin (full), accountant (finance ops), viewer (read only), approver (approve expenses)
 */

export type Role = "admin" | "accountant" | "viewer" | "approver";

export interface Permission {
  resource: string;
  actions: ("create" | "read" | "update" | "delete" | "approve")[];
}

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  admin: [
    { resource: "*", actions: ["create", "read", "update", "delete", "approve"] },
  ],
  accountant: [
    { resource: "invoices", actions: ["create", "read", "update"] },
    { resource: "expenses", actions: ["create", "read", "update"] },
    { resource: "revenue", actions: ["create", "read", "update"] },
    { resource: "vendors", actions: ["create", "read", "update"] },
    { resource: "bank", actions: ["create", "read", "update"] },
    { resource: "payroll", actions: ["create", "read", "update"] },
    { resource: "reports", actions: ["read"] },
    { resource: "reconciliation", actions: ["create", "read", "update"] },
    { resource: "recurring", actions: ["create", "read", "update"] },
    { resource: "tds", actions: ["read"] },
    { resource: "gst", actions: ["read"] },
  ],
  viewer: [
    { resource: "invoices", actions: ["read"] },
    { resource: "expenses", actions: ["read"] },
    { resource: "revenue", actions: ["read"] },
    { resource: "reports", actions: ["read"] },
    { resource: "budgets", actions: ["read"] },
    { resource: "compliance", actions: ["read"] },
  ],
  approver: [
    { resource: "expenses", actions: ["read", "approve"] },
    { resource: "invoices", actions: ["read", "approve"] },
    { resource: "payroll", actions: ["read", "approve"] },
    { resource: "reports", actions: ["read"] },
  ],
};

export function hasPermission(
  role: Role,
  resource: string,
  action: "create" | "read" | "update" | "delete" | "approve"
): boolean {
  const permissions = ROLE_PERMISSIONS[role];
  if (!permissions) return false;

  return permissions.some((p) => {
    const resourceMatch = p.resource === "*" || p.resource === resource;
    const actionMatch = p.actions.includes(action);
    return resourceMatch && actionMatch;
  });
}

export const ROLE_LABELS: Record<Role, { label: string; color: string; description: string }> = {
  admin: { label: "Admin", color: "#EF4444", description: "Full access to all features" },
  accountant: { label: "Accountant", color: "#6366F1", description: "Create and manage financial data" },
  viewer: { label: "Viewer", color: "#22C55E", description: "Read-only access to reports" },
  approver: { label: "Approver", color: "#F59E0B", description: "Approve expenses and payroll" },
};
