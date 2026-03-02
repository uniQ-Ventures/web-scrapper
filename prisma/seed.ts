import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const pool = new pg.Pool({
  connectionString:
    process.env.DATABASE_URL || "postgresql://localhost:5432/finance",
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const CATEGORIES = [
  { name: "Salaries", icon: "👥", color: "#6366f1" },
  { name: "Infrastructure", icon: "🖥️", color: "#f59e0b" },
  { name: "Marketing", icon: "📣", color: "#ec4899" },
  { name: "Software", icon: "💿", color: "#8b5cf6" },
  { name: "Office", icon: "🏢", color: "#14b8a6" },
  { name: "Travel", icon: "✈️", color: "#ef4444" },
  { name: "Professional Services", icon: "⚖️", color: "#84cc16" },
  { name: "Misc", icon: "📦", color: "#64748b" },
];

async function main() {
  console.log("🌱 Seeding finance database...\n");

  // ── Organization ──────────────────────────────────────────
  const org = await prisma.organization.upsert({
    where: { id: "seed-org-001" },
    update: {},
    create: {
      id: "seed-org-001",
      name: "UniQ Ventures",
      currency: "INR",
      cashInBank: 2850000,
      gstNumber: "29AABCU9603R1ZM",
      address: "4th Floor, WeWork Galaxy\nResidency Road, Bangalore 560025",
    },
  });
  console.log(`  ✅ Organization: ${org.name}`);

  // ── User ──────────────────────────────────────────────────
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

  // ── Expense Categories ────────────────────────────────────
  const categoryMap: Record<string, string> = {};
  for (const cat of CATEGORIES) {
    const c = await prisma.expenseCategory.upsert({
      where: { userId_name: { userId: user.id, name: cat.name } },
      update: {},
      create: { name: cat.name, icon: cat.icon, color: cat.color, userId: user.id, organizationId: org.id },
    });
    categoryMap[cat.name] = c.id;
  }
  console.log(`  ✅ Expense categories: ${CATEGORIES.length}`);

  // ── Account ───────────────────────────────────────────────
  const account = await prisma.account.upsert({
    where: { id: "seed-account-001" },
    update: {},
    create: {
      id: "seed-account-001",
      name: "HDFC Current Account",
      type: "bank",
      currentBalance: 2850000,
      currency: "INR",
      userId: user.id,
      organizationId: org.id,
    },
  });
  console.log(`  ✅ Account: ${account.name}`);

  // ── Clients ───────────────────────────────────────────────
  const clients = [
    { id: "seed-client-001", name: "Acme Corp", email: "billing@acme.in", company: "Acme Technologies Pvt Ltd", gstNumber: "27AABCS1234D1ZM" },
    { id: "seed-client-002", name: "TechFlow Solutions", email: "accounts@techflow.io", company: "TechFlow Solutions LLP", gstNumber: "29BBBCT5678E1ZN" },
    { id: "seed-client-003", name: "StartupXYZ", email: "finance@startupxyz.com", company: "StartupXYZ India Pvt Ltd", gstNumber: "06CCCCS9012F1ZP" },
  ];

  for (const c of clients) {
    await prisma.client.upsert({
      where: { id: c.id },
      update: {},
      create: { ...c, userId: user.id, organizationId: org.id },
    });
  }
  console.log(`  ✅ Clients: ${clients.length}`);

  // ── Invoices (8 invoices with line items) ─────────────────
  const invoices = [
    { id: "seed-inv-001", number: "INV-2026-001", clientId: "seed-client-001", status: "paid", total: 354000, subtotal: 300000, taxTotal: 54000, daysAgo: 45, paidDaysAgo: 40 },
    { id: "seed-inv-002", number: "INV-2026-002", clientId: "seed-client-002", status: "paid", total: 177000, subtotal: 150000, taxTotal: 27000, daysAgo: 38, paidDaysAgo: 30 },
    { id: "seed-inv-003", number: "INV-2026-003", clientId: "seed-client-001", status: "sent", total: 472000, subtotal: 400000, taxTotal: 72000, daysAgo: 20 },
    { id: "seed-inv-004", number: "INV-2026-004", clientId: "seed-client-003", status: "paid", total: 118000, subtotal: 100000, taxTotal: 18000, daysAgo: 30, paidDaysAgo: 22 },
    { id: "seed-inv-005", number: "INV-2026-005", clientId: "seed-client-002", status: "overdue", total: 236000, subtotal: 200000, taxTotal: 36000, daysAgo: 60 },
    { id: "seed-inv-006", number: "INV-2026-006", clientId: "seed-client-003", status: "sent", total: 88500, subtotal: 75000, taxTotal: 13500, daysAgo: 10 },
    { id: "seed-inv-007", number: "INV-2026-007", clientId: "seed-client-001", status: "draft", total: 590000, subtotal: 500000, taxTotal: 90000, daysAgo: 5 },
    { id: "seed-inv-008", number: "INV-2026-008", clientId: "seed-client-002", status: "paid", total: 295000, subtotal: 250000, taxTotal: 45000, daysAgo: 15, paidDaysAgo: 8 },
  ];

  for (const inv of invoices) {
    const issueDate = new Date(Date.now() - inv.daysAgo * 86400000);
    const dueDate = new Date(issueDate.getTime() + 30 * 86400000);
    const paidAt = inv.paidDaysAgo ? new Date(Date.now() - inv.paidDaysAgo * 86400000) : undefined;

    await prisma.invoice.upsert({
      where: { id: inv.id },
      update: {},
      create: {
        id: inv.id,
        invoiceNumber: inv.number,
        status: inv.status,
        issueDate,
        dueDate,
        subtotal: inv.subtotal,
        taxTotal: inv.taxTotal,
        total: inv.total,
        paidAt,
        userId: user.id,
        organizationId: org.id,
        clientId: inv.clientId,
      },
    });

    // Add a line item for each
    await prisma.invoiceLineItem.upsert({
      where: { id: `${inv.id}-item-1` },
      update: {},
      create: {
        id: `${inv.id}-item-1`,
        description: `Professional services — ${inv.number}`,
        quantity: 1,
        unitPrice: inv.subtotal,
        amount: inv.subtotal,
        gstRate: 18,
        cgst: inv.taxTotal / 2,
        sgst: inv.taxTotal / 2,
        igst: 0,
        total: inv.total,
        invoiceId: inv.id,
      },
    });
  }
  console.log(`  ✅ Invoices: ${invoices.length} with line items`);

  // ── Expenses (20 realistic entries) ───────────────────────
  const expenses = [
    { desc: "Team salaries — January", amount: 420000, category: "Salaries", vendor: "Payroll", daysAgo: 45 },
    { desc: "Team salaries — February", amount: 435000, category: "Salaries", vendor: "Payroll", daysAgo: 15 },
    { desc: "AWS hosting — January", amount: 28500, category: "Infrastructure", vendor: "Amazon Web Services", daysAgo: 40 },
    { desc: "AWS hosting — February", amount: 31200, category: "Infrastructure", vendor: "Amazon Web Services", daysAgo: 10 },
    { desc: "Google Ads Q1 campaign", amount: 75000, category: "Marketing", vendor: "Google LLC", daysAgo: 35 },
    { desc: "LinkedIn Ads — Feb", amount: 25000, category: "Marketing", vendor: "LinkedIn", daysAgo: 12 },
    { desc: "Figma annual license", amount: 18000, category: "Software", vendor: "Figma Inc", daysAgo: 60 },
    { desc: "Notion team plan", amount: 8400, category: "Software", vendor: "Notion Labs", daysAgo: 30 },
    { desc: "GitHub Team", amount: 12600, category: "Software", vendor: "GitHub", daysAgo: 28 },
    { desc: "Vercel Pro plan", amount: 6000, category: "Infrastructure", vendor: "Vercel", daysAgo: 25 },
    { desc: "Office rent — January", amount: 45000, category: "Office", vendor: "ABC Realty", daysAgo: 42 },
    { desc: "Office rent — February", amount: 45000, category: "Office", vendor: "ABC Realty", daysAgo: 12 },
    { desc: "Airtel broadband", amount: 2999, category: "Office", vendor: "Bharti Airtel", daysAgo: 8 },
    { desc: "Client meeting — Acme travel", amount: 12800, category: "Travel", vendor: "MakeMyTrip", daysAgo: 20 },
    { desc: "Team dinner — sprint retro", amount: 6500, category: "Misc", vendor: "Olive Garden", daysAgo: 18 },
    { desc: "Legal — contract review", amount: 25000, category: "Professional Services", vendor: "Sharma & Associates", daysAgo: 22 },
    { desc: "CA fees — GST filing", amount: 15000, category: "Professional Services", vendor: "PKR & Co", daysAgo: 32 },
    { desc: "Uber business rides — Jan", amount: 4200, category: "Travel", vendor: "Uber India", daysAgo: 38 },
    { desc: "Office supplies — stationery", amount: 3500, category: "Office", vendor: "Staples India", daysAgo: 15 },
    { desc: "HDFC Ergo Group Insurance", amount: 48000, category: "Misc", vendor: "HDFC Ergo", daysAgo: 55 },
  ];

  for (let i = 0; i < expenses.length; i++) {
    const exp = expenses[i];
    await prisma.expense.upsert({
      where: { id: `seed-exp-${String(i + 1).padStart(3, "0")}` },
      update: {},
      create: {
        id: `seed-exp-${String(i + 1).padStart(3, "0")}`,
        description: exp.desc,
        amount: exp.amount,
        date: new Date(Date.now() - exp.daysAgo * 86400000),
        vendor: exp.vendor,
        categoryId: categoryMap[exp.category],
        accountId: account.id,
        userId: user.id,
        organizationId: org.id,
      },
    });
  }
  console.log(`  ✅ Expenses: ${expenses.length}`);

  // ── Revenue (6 months) ────────────────────────────────────
  const revenueData = [
    { month: -5, amount: 380000, type: "recurring", source: "Project retainers" },
    { month: -4, amount: 420000, type: "recurring", source: "Project retainers" },
    { month: -3, amount: 510000, type: "recurring", source: "Project retainers" },
    { month: -2, amount: 475000, type: "recurring", source: "Project retainers" },
    { month: -1, amount: 550000, type: "recurring", source: "Project retainers" },
    { month: 0, amount: 620000, type: "recurring", source: "Project retainers" },
    { month: -3, amount: 150000, type: "one-time", source: "Acme setup fee" },
    { month: -1, amount: 75000, type: "one-time", source: "TechFlow consulting" },
  ];

  for (let i = 0; i < revenueData.length; i++) {
    const r = revenueData[i];
    const monthDate = new Date();
    monthDate.setMonth(monthDate.getMonth() + r.month);
    monthDate.setDate(1);

    await prisma.revenue.upsert({
      where: { id: `seed-rev-${String(i + 1).padStart(3, "0")}` },
      update: {},
      create: {
        id: `seed-rev-${String(i + 1).padStart(3, "0")}`,
        month: monthDate,
        amount: r.amount,
        type: r.type,
        source: r.source,
        userId: user.id,
        organizationId: org.id,
      },
    });
  }
  console.log(`  ✅ Revenue: ${revenueData.length} entries across 6 months`);

  // ── Budget Thresholds (5) ─────────────────────────────────
  const budgets = [
    { category: "Salaries", limit: 500000, alert: 0.9 },
    { category: "Infrastructure", limit: 40000, alert: 0.8 },
    { category: "Marketing", limit: 100000, alert: 0.7 },
    { category: "Software", limit: 45000, alert: 0.8 },
    { category: "Office", limit: 55000, alert: 0.8 },
  ];

  for (let i = 0; i < budgets.length; i++) {
    const b = budgets[i];
    await prisma.budgetThreshold.upsert({
      where: { id: `seed-budget-${String(i + 1).padStart(3, "0")}` },
      update: {},
      create: {
        id: `seed-budget-${String(i + 1).padStart(3, "0")}`,
        category: b.category,
        monthlyLimit: b.limit,
        alertAt: b.alert,
        organizationId: org.id,
      },
    });
  }
  console.log(`  ✅ Budget thresholds: ${budgets.length}`);

  // ── Bank Account + Transactions (15) ──────────────────────
  const bankAccount = await prisma.bankAccount.upsert({
    where: { id: "seed-bank-001" },
    update: {},
    create: {
      id: "seed-bank-001",
      name: "HDFC Current Account",
      bankName: "HDFC Bank",
      accountNumber: "50200012345678",
      ifscCode: "HDFC0001234",
      currentBalance: 2850000,
      userId: user.id,
    },
  });
  console.log(`  ✅ Bank account: ${bankAccount.name}`);

  const bankTxns = [
    { desc: "NEFT/ACME CORP/INV-001", amount: 354000, type: "credit", category: "Client Payment", daysAgo: 40 },
    { desc: "UPI/AMAZON/AWS HOSTING", amount: 28500, type: "debit", category: "Cloud & Infra", daysAgo: 38 },
    { desc: "NEFT/TECHFLOW/INV-002", amount: 177000, type: "credit", category: "Client Payment", daysAgo: 30 },
    { desc: "NEFT/PAYROLL JAN 2026", amount: 420000, type: "debit", category: "Payroll", daysAgo: 45 },
    { desc: "ONLINE/GOOGLE ADS", amount: 75000, type: "debit", category: "Marketing", daysAgo: 35 },
    { desc: "UPI/FIGMA/ANNUAL", amount: 18000, type: "debit", category: "Software & SaaS", daysAgo: 60 },
    { desc: "NEFT/ABC REALTY/RENT JAN", amount: 45000, type: "debit", category: "Rent & Office", daysAgo: 42 },
    { desc: "NEFT/STARTUPXYZ/INV-004", amount: 118000, type: "credit", category: "Client Payment", daysAgo: 22 },
    { desc: "NEFT/PAYROLL FEB 2026", amount: 435000, type: "debit", category: "Payroll", daysAgo: 15 },
    { desc: "UPI/LINKEDIN/ADS FEB", amount: 25000, type: "debit", category: "Marketing", daysAgo: 12 },
    { desc: "NEFT/ABC REALTY/RENT FEB", amount: 45000, type: "debit", category: "Rent & Office", daysAgo: 12 },
    { desc: "NEFT/TECHFLOW/INV-008", amount: 295000, type: "credit", category: "Client Payment", daysAgo: 8 },
    { desc: "UPI/AWS/FEB HOSTING", amount: 31200, type: "debit", category: "Cloud & Infra", daysAgo: 10 },
    { desc: "BANK SERVICE CHARGE FEB", amount: 590, type: "debit", category: "Bank Charges", daysAgo: 5 },
    { desc: "IMPS/AIRTEL/BROADBAND", amount: 2999, type: "debit", category: "Telecom & Internet", daysAgo: 8 },
  ];

  let balance = 2850000;
  for (let i = 0; i < bankTxns.length; i++) {
    const tx = bankTxns[i];
    if (tx.type === "credit") balance += tx.amount;
    else balance -= tx.amount;

    await prisma.bankTransaction.upsert({
      where: { id: `seed-btx-${String(i + 1).padStart(3, "0")}` },
      update: {},
      create: {
        id: `seed-btx-${String(i + 1).padStart(3, "0")}`,
        date: new Date(Date.now() - tx.daysAgo * 86400000),
        description: tx.desc,
        amount: tx.amount,
        type: tx.type,
        balance,
        category: tx.category,
        confidence: 0.85,
        source: "seed",
        hash: `seed-hash-${i + 1}`,
        bankAccountId: bankAccount.id,
        userId: user.id,
      },
    });
  }
  console.log(`  ✅ Bank transactions: ${bankTxns.length}`);

  console.log("\n🎉 Seed complete! The dashboard should now show rich data.");
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
