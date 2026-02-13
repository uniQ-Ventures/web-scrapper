# Finance — Sidechain

> Accounting, invoicing, expense tracking, runway projections, and GST compliance.

## Vertical
**Accounting & Financial Operations** — Every startup needs to know: How much money do we have? How fast are we burning? When do we run out?

## Standalone Value
A standalone finance tool for startups that handles:
- **Invoicing** — Create, send, track invoices (GST-compliant for India)
- **Expense Tracking** — Categorize and monitor expenses
- **Revenue Tracking** — MRR, ARR, customer revenue
- **Runway Calculator** — Cash in bank ÷ monthly burn = months left
- **Burn Rate** — Monthly operating expenses visualization
- **Financial Reports** — P&L, cash flow, balance sheet (simplified)

## Founder OS Integration (Heartbeat)
| KPI | Description |
|-----|-------------|
| Monthly Revenue | Current MRR/ARR |
| Burn Rate | Monthly operating cost |
| Runway | Months of cash remaining |
| Outstanding Invoices | Unpaid invoice count + total |

| Event | Trigger |
|-------|---------|
| `invoice.created` | New invoice generated |
| `invoice.paid` | Payment received |
| `expense.logged` | New expense recorded |
| `runway.warning` | Runway drops below threshold |

## Copilot Queries & Actions
- **Queries**: `getRunway`, `getBurnRate`, `getRevenue`, `getUnpaidInvoices`, `getExpenses`
- **Actions**: `createInvoice`, `logExpense`, `generateReport`, `sendInvoiceReminder`

## Tech Stack
- **Framework**: Next.js 16 (App Router)
- **Database**: PostgreSQL + Prisma ORM
- **Auth**: NextAuth.js v4 (Google OAuth)
- **Port**: 3008 (Strictly enforced)

## Status: ✅ Completed
- [x] Database & Schema (Prisma)
- [x] Authentication (Google OAuth)
- [x] Invoicing & Expenses
- [x] Recurring Revenue (MRR/ARR)
- [x] Copilot Chatbot UI
- [x] Receipt Upload

## Running Locally

```bash
# Install dependencies
npm install

# Setup database
npx prisma generate
npx prisma db push
npx prisma db seed

# Start server (Port 3008)
npm run dev
```
