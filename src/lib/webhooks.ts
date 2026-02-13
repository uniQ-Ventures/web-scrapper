/**
 * Heartbeat Protocol — Webhook Event Sender
 *
 * Sends domain events to the Founder OS Orchestrator webhooks.
 * Events are fire-and-forget; failures are logged but not re-thrown.
 * Signed with HMAC-SHA256 for authenticity.
 */

import { createHmac } from "crypto";

const ORCHESTRATOR_URL = process.env.ORCHESTRATOR_URL;
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;

interface WebhookEvent {
  type: string;
  source: "finance";
  payload: Record<string, unknown>;
  timestamp: string;
}

function signPayload(body: string, timestamp: string): string {
  if (!WEBHOOK_SECRET) return "";
  const data = `${timestamp}.${body}`;
  return createHmac("sha256", WEBHOOK_SECRET).update(data).digest("hex");
}

export async function sendWebhookEvent(
  type: string,
  payload: Record<string, unknown>
): Promise<void> {
  if (!ORCHESTRATOR_URL) {
    console.warn("[webhook] ORCHESTRATOR_URL not configured, skipping event:", type);
    return;
  }

  const event: WebhookEvent = {
    type,
    source: "finance",
    payload,
    timestamp: new Date().toISOString(),
  };

  try {
    const body = JSON.stringify(event);
    const timestamp = Date.now().toString();
    const signature = signPayload(body, timestamp);

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (signature) {
      headers["X-Webhook-Signature"] = `sha256=${signature}`;
      headers["X-Webhook-Timestamp"] = timestamp;
    }

    const res = await fetch(`${ORCHESTRATOR_URL}/api/webhooks/events`, {
      method: "POST",
      headers,
      body,
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) {
      console.error(`[webhook] Failed to send ${type}: ${res.status} ${res.statusText}`);
    }
  } catch (error) {
    console.error(`[webhook] Error sending ${type}:`, error);
  }
}

// Convenience helpers for common Finance events
export const webhookEvents = {
  invoiceCreated: (invoiceId: string, total: number) =>
    sendWebhookEvent("invoice.created", { invoiceId, total }),

  invoiceSent: (invoiceId: string, total: number) =>
    sendWebhookEvent("invoice.sent", { invoiceId, total }),

  invoicePaid: (invoiceId: string, total: number) =>
    sendWebhookEvent("invoice.paid", { invoiceId, total }),

  expenseLogged: (expenseId: string, amount: number, category?: string) =>
    sendWebhookEvent("expense.logged", { expenseId, amount, category }),

  runwayAlert: (runwayMonths: number) =>
    sendWebhookEvent("runway.alert", { runwayMonths }),

  revenueRecorded: (revenueId: string, amount: number) =>
    sendWebhookEvent("revenue.recorded", { revenueId, amount }),

  monthlyReport: (report: {
    totalRevenue: number;
    totalExpenses: number;
    netIncome: number;
    runwayMonths: number;
    month: string;
  }) => sendWebhookEvent("finance.monthly-report", report),

  runwayCritical: (runwayMonths: number, cashInBank: number) =>
    sendWebhookEvent("finance.runway-critical", {
      runwayMonths,
      cashInBank,
      severity: runwayMonths <= 1 ? "critical" : "warning",
      message: `Runway is ${runwayMonths} month(s) — immediate action required`,
    }),

  budgetExceeded: (category: string, spent: number, limit: number) =>
    sendWebhookEvent("finance.budget-exceeded", {
      category,
      spent,
      limit,
      overage: spent - limit,
      message: `Budget for "${category}" exceeded: ₹${spent.toLocaleString()} / ₹${limit.toLocaleString()}`,
    }),
};
