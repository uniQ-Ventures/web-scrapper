import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "./prisma";

export async function getSessionUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return null;

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: { organization: true },
  });

  return user;
}

export async function getOrCreateSessionUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return null;

  let user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: { organization: true },
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        email: session.user.email,
        fullName: session.user.name || undefined,
        avatarUrl: session.user.image || undefined,
      },
      include: { organization: true },
    });
  }

  return user;
}

export async function requireUser() {
  const user = await getOrCreateSessionUser();
  if (!user) {
    throw new Error("Unauthorized");
  }
  return user;
}

const DEMO_USER_ID = "demo-user-00000000-0000-0000-0000";
const DEMO_ORG_ID = "demo-org-00000000-0000-0000-0000";

export async function getAuthUserId(): Promise<string> {
  const user = await getSessionUser();
  if (user) return user.id;

  if (process.env.NODE_ENV === "development") {
    // Ensure demo user + org actually exist in the database
    const existing = await prisma.user.findUnique({
      where: { id: DEMO_USER_ID },
    });
    if (!existing) {
      await prisma.organization.upsert({
        where: { id: DEMO_ORG_ID },
        update: {},
        create: {
          id: DEMO_ORG_ID,
          name: "Demo Company",
          currency: "INR",
          cashInBank: 500000,
        },
      });
      await prisma.user.create({
        data: {
          id: DEMO_USER_ID,
          email: "demo@founderos.dev",
          fullName: "Demo User",
          organizationId: DEMO_ORG_ID,
        },
      });
    }
    return DEMO_USER_ID;
  }

  throw new Error("Unauthorized");
}

export function getUserId(user: { id: string }) {
  return user.id;
}
