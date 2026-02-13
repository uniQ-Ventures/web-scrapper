import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const pool = new pg.Pool({
  connectionString:
    process.env.DATABASE_URL || "postgresql://localhost:5432/finance",
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const DEFAULT_CATEGORIES = [
  { name: "Salaries", icon: "👥", color: "#6366f1" },
  { name: "Infrastructure", icon: "🖥️", color: "#f59e0b" },
  { name: "Marketing", icon: "📣", color: "#ec4899" },
  { name: "Software", icon: "💿", color: "#8b5cf6" },
  { name: "Office", icon: "🏢", color: "#14b8a6" },
  { name: "Misc", icon: "📦", color: "#64748b" },
];

async function main() {
  console.log("🌱 Seeding finance database...");

  const org = await prisma.organization.upsert({
    where: { id: "seed-org-001" },
    update: {},
    create: {
      id: "seed-org-001",
      name: "UniQ Ventures",
      currency: "INR",
      cashInBank: 500000,
      gstNumber: "29AABCU9603R1ZM",
    },
  });
  console.log(`  ✅ Organization: ${org.name}`);

  const user = await prisma.user.upsert({
    where: { email: "nidish@uniqventures.com" },
    update: { organizationId: org.id },
    create: {
      id: "seed-user-001",
      email: "nidish@uniqventures.com",
      fullName: "Nidish Ramakrishnan",
      organizationId: org.id,
    },
  });
  console.log(`  ✅ User: ${user.fullName}`);

  for (const cat of DEFAULT_CATEGORIES) {
    await prisma.expenseCategory.upsert({
      where: { userId_name: { userId: user.id, name: cat.name } },
      update: {},
      create: {
        name: cat.name,
        icon: cat.icon,
        color: cat.color,
        userId: user.id,
        organizationId: org.id,
      },
    });
  }
  console.log(`  ✅ Expense categories: ${DEFAULT_CATEGORIES.length} created`);

  const account = await prisma.account.upsert({
    where: { id: "seed-account-001" },
    update: {},
    create: {
      id: "seed-account-001",
      name: "Primary Bank Account",
      type: "bank",
      currentBalance: 500000,
      currency: "INR",
      userId: user.id,
      organizationId: org.id,
    },
  });
  console.log(`  ✅ Account: ${account.name}`);

  console.log("\n🎉 Seed complete!");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
