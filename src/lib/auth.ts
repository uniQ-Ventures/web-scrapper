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

export async function getAuthUserId(): Promise<string> {
  const user = await getSessionUser();
  if (user) return user.id;

  if (process.env.NODE_ENV === "development") {
    return "demo-user";
  }

  throw new Error("Unauthorized");
}

export function getUserId(user: { id: string }) {
  return user.id;
}
