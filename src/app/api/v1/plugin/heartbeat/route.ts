import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const startTime = Date.now();

/**
 * GET /api/v1/plugin/heartbeat
 *
 * Returns health status for the Founder OS orchestrator.
 * Used by the heartbeat protocol to monitor sidechain health.
 */
export async function GET() {
  const uptimeMs = Date.now() - startTime;

  try {
    // Database health check
    await prisma.$queryRawUnsafe("SELECT 1");

    // Active user count (users with activity in last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const activeUsers = await prisma.user.count({
      where: { updatedAt: { gte: thirtyDaysAgo } },
    });

    return NextResponse.json({
      status: "healthy",
      product: "finance",
      version: "0.1.0",
      uptime: {
        ms: uptimeMs,
        human: formatUptime(uptimeMs),
      },
      database: "connected",
      activeUsers,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[heartbeat] Health check failed:", error);
    return NextResponse.json(
      {
        status: "unhealthy",
        product: "finance",
        version: "0.1.0",
        uptime: { ms: uptimeMs, human: formatUptime(uptimeMs) },
        database: "disconnected",
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}

function formatUptime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}
