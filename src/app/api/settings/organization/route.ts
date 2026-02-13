import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUserId } from "@/lib/auth";

export async function GET() {
  try {
    const userId = await getAuthUserId();
    const org = await prisma.organization.findFirst({
      where: { users: { some: { id: userId } } },
    });

    return NextResponse.json({
      organization: org || {
        name: "",
        currency: "INR",
        gstNumber: "",
        address: "",
        logoUrl: "",
        alertSettings: JSON.stringify({ runwayWarningMonths: 3, budgetAlertThreshold: 0.8 }),
      },
    });
  } catch (error) {
    console.error("Get org settings error:", error);
    return NextResponse.json({ error: "Failed to load settings" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const userId = await getAuthUserId();
    const body = await request.json();
    const { name, currency, gstNumber, address, logoUrl, alertSettings, cashInBank } = body;

    let org = await prisma.organization.findFirst({
      where: { users: { some: { id: userId } } },
    });

    if (org) {
      org = await prisma.organization.update({
        where: { id: org.id },
        data: {
          name: name ?? org.name,
          currency: currency ?? org.currency,
          gstNumber: gstNumber !== undefined ? gstNumber : org.gstNumber,
          address: address !== undefined ? address : org.address,
          logoUrl: logoUrl !== undefined ? logoUrl : org.logoUrl,
          alertSettings: alertSettings !== undefined
            ? (typeof alertSettings === "string" ? alertSettings : JSON.stringify(alertSettings))
            : org.alertSettings,
          cashInBank: cashInBank !== undefined ? cashInBank : org.cashInBank,
        },
      });
    } else {
      org = await prisma.organization.create({
        data: {
          name: name || "My Company",
          currency: currency || "INR",
          gstNumber,
          address,
          logoUrl,
          alertSettings: alertSettings
            ? (typeof alertSettings === "string" ? alertSettings : JSON.stringify(alertSettings))
            : JSON.stringify({ runwayWarningMonths: 3, budgetAlertThreshold: 0.8 }),
          users: { connect: { id: userId } },
        },
      });
    }

    return NextResponse.json({ organization: org });
  } catch (error) {
    console.error("Update org settings error:", error);
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }
}
