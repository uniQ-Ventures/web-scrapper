# Finance — Agent Instructions

> **Product**: Finance — Invoicing, Expense Tracking & Runway
> **Status**: 🟢 95% — Feature complete (invoicing, expenses, P&L, copilot)
> **Priority**: NextAuth upgrade + production deployment
> **Timebox**: MVP scaffold by Feb 20 | Functional by Feb 27
> **Port**: 3008

---

## Context

Read these files first:
- `README.md` — product brief with KPIs, queries, actions
- `../ARCHITECTURE.md` — Layer 1 + Sidechains overview
- `../TECH_STANDARDS.md` — stack standards (FOLLOW THIS EXACTLY)
- `../THEME_STANDARDS.md` — use CSS variables from day one
- `../MOBILE_STANDARDS.md` — build mobile-first from scratch
- `../AGENT_HANDOFF_PROTOCOL.md` — status report format
- `../heartbeat-protocol.md` — sidechain communication spec
- `../MULTI_TENANT_ARCHITECTURE.md` — data spaces, orgId scoping, agent orchestration
- `../DEPLOYMENT_ARCHITECTURE.md` — Vercel Pro deployment, shared DB, cron setup

---

## Stack (Non-Negotiable)

```
Next.js 15+ (App Router) + TypeScript
PostgreSQL + Prisma ORM
NextAuth.js (Google OAuth)
Tailwind CSS + shadcn/ui + Lucide Icons
Google Gemini — with multi-model abstraction
Deploy to Vercel
```

---

## What to Build — MVP Features

### Core: Invoicing
- Create invoices (line items, tax/GST, discounts)
- Invoice PDF generation
- Track status: DRAFT → SENT → PAID → OVERDUE
- Client management (name, email, billing address)
- Send invoice via email (Resend)

### Core: Expense Tracking
- Log expenses (amount, category, date, receipt)
- Categories: Salaries, Infrastructure, Marketing, Software, Office, Misc
- Monthly/weekly expense summaries

### Core: Revenue Tracking
- Manual revenue entry or auto-from-invoices
- MRR / ARR calculations
- Revenue by client

### Core: Runway Calculator
- Cash in bank (manual entry)
- Monthly burn rate (auto from expenses)
- Runway = cash ÷ burn rate
- Visual runway projection chart

### Dashboard
- Monthly revenue vs expenses (chart)
- Current runway (months remaining)
- Outstanding invoices (count + total)
- Burn rate trend

### Embedded Copilot (MANDATORY)

Every product MUST have its own **embedded AI copilot chatbot** in the product UI. This is a core ecosystem principle.

**What to build:**
- Collapsible chat panel on the right side of the UI
- Powered by Gemini (via multi-model AI abstraction layer)
- Context-aware: knows about invoices, expenses, revenue, runway
- Example queries:
  - "What's our current runway?"
  - "Show me overdue invoices"
  - "How much did we spend on infrastructure this month?"
  - "Create an invoice for [client] for $5,000"
  - "What's our MRR trend?"
  - "Compare this month's burn to last month"

**No duplication rule:** The in-app copilot MUST use the same `/api/v1/copilot` endpoint that Founder OS calls. One implementation, two consumers (the UI + the orchestrator).

### Founder OS Integration (bake in from the start)
1. `GET /api/v1/plugin/manifest`
2. `GET /api/v1/plugin/dashboard`
3. `GET/POST /api/v1/copilot/*` endpoints
4. Webhook events: `invoice.created`, `invoice.paid`, `expense.logged`, `runway.warning`

---

## Prisma Schema Starter

```prisma
model Organization {
  id        String     @id @default(uuid())
  name      String
  currency  String     @default("INR")
  cashInBank Float     @default(0)
  clients   Client[]
  invoices  Invoice[]
  expenses  Expense[]
}

model Client {
  id             String       @id @default(uuid())
  organizationId String
  organization   Organization @relation(...)
  name           String
  email          String?
  address        String?      @db.Text
  invoices       Invoice[]
  createdAt      DateTime     @default(now())
}

model Invoice {
  id             String       @id @default(uuid())
  organizationId String
  organization   Organization @relation(...)
  clientId       String
  client         Client       @relation(...)
  number         String       // INV-001
  status         String       @default("DRAFT")
  lineItems      String       @db.Text // JSON
  subtotal       Float
  taxRate        Float        @default(18) // GST
  taxAmount      Float
  total          Float
  dueDate        DateTime?
  paidAt         DateTime?
  createdAt      DateTime     @default(now())
}

model Expense {
  id             String       @id @default(uuid())
  organizationId String
  organization   Organization @relation(...)
  description    String
  amount         Float
  category       String
  date           DateTime
  receiptUrl     String?
  createdAt      DateTime     @default(now())
}
```

---

## Setup Commands

```bash
npx -y create-next-app@latest ./ --typescript --tailwind --eslint --app --src-dir --use-npm
npm install @prisma/client @google/generative-ai next-auth lucide-react
npm install -D prisma
npx prisma init
```

---

## Key Principle: No Duplication

The standalone copilot chatbot in the UI MUST use the same underlying logic as the `/api/v1/copilot` endpoint. The UI calls the endpoint directly. Founder OS also calls the endpoint. One implementation, two consumers.

---

## Multi-Tenancy & Alignment

Read `../MULTI_TENANT_ARCHITECTURE.md` — data spaces, orgId scoping, agent orchestration
- `../DEPLOYMENT_ARCHITECTURE.md` — Vercel Pro deployment, shared DB, cron setup

### Status
- orgId scoping: ✅ Done (16 refs)
- Next.js 16.1.6 ✅
- Prisma 7.3 ✅

### ⚠️ Dependency Upgrade REQUIRED
- NextAuth **4.24 → 5.0-beta.30** — CRITICAL for Founder OS SSO compatibility. NextAuth v5 uses App Router callbacks, v4 uses Pages Router — incompatible with ecosystem JWT format.

### Game-Changer: Copilot-as-Endpoint
Your embedded copilot IS the endpoint Founder OS calls. When a founder asks "what's my runway?", Founder OS routes to YOUR `/api/v1/copilot`. Your copilot must also be callable by other products' AI workers (e.g., a GTM agent asking "do we have budget for this deal?" or a Hiring agent asking "can we afford another hire?").

## Self-Testing (MANDATORY)

Before filing a status report, you MUST verify your work:
1. `npm run build` — zero build errors
2. `npm run lint` — zero lint errors
3. `browser` tool check — verify UI renders at `http://localhost:3008`

If you find errors, FIX THEM inside the current session. Do not leave broken builds.

## After Every Session

Update `STATUS_REPORT.md` in this folder per `../AGENT_HANDOFF_PROTOCOL.md`.
