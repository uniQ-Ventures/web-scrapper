import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createHmac } from "crypto";

interface InboundEvent {
  productId: string;
  event: string;
  summary: string;
  data: Record<string, unknown>;
  timestamp: string;
}

function verifySignature(body: string, signature: string): boolean {
  const secret = process.env.WEBHOOK_SECRET;
  if (!secret) return true; // Accept all in dev mode
  const expected = createHmac("sha256", secret).update(body).digest("hex");
  return expected === signature;
}

async function processEvent(event: InboundEvent) {
  const { productId, event: eventType, data } = event;

  // Auto-create expenses from other modules
  if (eventType === "offer.accepted" && productId === "hiring") {
    const salary = (data.salary as number) || 0;
    const candidateName = (data.candidateName as string) || "New Hire";
    const userId = (data.userId as string) || "demo-user";

    await prisma.expense.create({
      data: {
        userId,
        description: `Hiring: ${candidateName} (annual salary)`,
        amount: salary,
        date: new Date(),
        vendor: "Internal",
        source: `${productId}.${eventType}`,
        sourceId: data.offerId as string,
        department: "hr",
        isRecurring: true,
      },
    });

    return { action: "expense.created", amount: salary };
  }

  if (eventType === "deal.closed" && productId === "uniqlabs") {
    const amount = (data.dealValue as number) || 0;
    const clientName = (data.clientName as string) || "Client";
    const userId = (data.userId as string) || "demo-user";

    await prisma.revenue.create({
      data: {
        userId,
        month: new Date(),
        amount,
        type: (data.recurring as boolean) ? "recurring" : "one-time",
        source: `${productId}.${eventType}`,
        sourceId: data.dealId as string,
      },
    });

    return { action: "revenue.created", amount };
  }

  if (eventType === "campaign.launched" && productId === "gtm") {
    const budget = (data.budget as number) || 0;
    const campaignName = (data.campaignName as string) || "Marketing Campaign";
    const userId = (data.userId as string) || "demo-user";

    await prisma.expense.create({
      data: {
        userId,
        description: `Campaign: ${campaignName}`,
        amount: budget,
        date: new Date(),
        vendor: (data.platform as string) || "Marketing",
        source: `${productId}.${eventType}`,
        sourceId: data.campaignId as string,
        department: "marketing",
      },
    });

    return { action: "expense.created", amount: budget };
  }

  if (eventType === "subscription.renewed") {
    const amount = (data.amount as number) || 0;
    const userId = (data.userId as string) || "demo-user";

    await prisma.revenue.create({
      data: {
        userId,
        month: new Date(),
        amount,
        type: "recurring",
        source: `${productId}.${eventType}`,
        sourceId: data.subscriptionId as string,
      },
    });

    return { action: "revenue.created", amount };
  }

  return { action: "event.logged", note: "No automatic processing for this event type" };
}

export async function POST(request: NextRequest) {
  try {
    const bodyText = await request.text();

    // Verify HMAC signature
    const signature = request.headers.get("x-webhook-signature") || "";
    if (!verifySignature(bodyText, signature)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const event: InboundEvent = JSON.parse(bodyText);

    if (!event.productId || !event.event) {
      return NextResponse.json(
        { error: "productId and event are required" },
        { status: 400 }
      );
    }

    const result = await processEvent(event);

    return NextResponse.json({
      received: true,
      processed: result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Inbound webhook error:", error);
    return NextResponse.json(
      { error: "Failed to process webhook" },
      { status: 500 }
    );
  }
}
