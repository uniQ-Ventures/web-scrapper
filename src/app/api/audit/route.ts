import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUserId } from "@/lib/auth";

/**
 * GET /api/audit — Activity log
 * POST /api/audit — Log an action
 */

interface AuditEntry {
  action: string;
  resource: string;
  resourceId?: string;
  details?: string;
  userId: string;
  timestamp: Date;
}

// In-memory audit log (in production, this would be a DB table)
const auditLog: AuditEntry[] = [];

export async function GET(request: NextRequest) {
  try {
    const userId = await getAuthUserId();
    const { searchParams } = new URL(request.url);
    const limit = Number(searchParams.get("limit") || 50);
    const resource = searchParams.get("resource");

    let entries = auditLog.filter((e) => true); // All for now
    if (resource) entries = entries.filter((e) => e.resource === resource);

    entries.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    entries = entries.slice(0, limit);

    return NextResponse.json({
      entries: entries.map((e) => ({
        action: e.action,
        resource: e.resource,
        resourceId: e.resourceId,
        details: e.details,
        timestamp: e.timestamp.toISOString(),
      })),
      total: auditLog.length,
    });
  } catch (error) {
    console.error("Audit error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthUserId();
    const body = await request.json();
    const { action, resource, resourceId, details } = body;

    auditLog.push({
      action,
      resource,
      resourceId,
      details,
      userId,
      timestamp: new Date(),
    });

    // Keep last 1000 entries
    if (auditLog.length > 1000) auditLog.splice(0, auditLog.length - 1000);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Audit log error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
