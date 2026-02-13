# Alignment Brief — Finance

> **Mission**: You are **The Back Office**. You own invoicing, expense tracking, cash flow forecasting, and runway monitoring.

## Identity

| Field | Value |
|-------|-------|
| **Product ID** | `finance` |
| **Vertical** | Finance & Accounting |
| **Port** | 3008 |
| **AI Agents** | Penny (Bookkeeper), Dollar (Controller), Vision (CFO) |

## What You Own

- **Invoices** — Creation, sending, payment tracking
- **Expenses** — Categorization, receipts, approvals
- **Cash Flow** — Projections, burn rate, runway
- **Reports** — P&L, balance sheet, tax summaries

## What You Expose to Founder OS

### KPIs (dashboard)
| Key | Label | Type |
|-----|-------|------|
| `monthly_revenue` | Monthly Revenue | currency |
| `monthly_burn` | Monthly Burn | currency |
| `runway_months` | Runway (months) | number |
| `outstanding_invoices` | Outstanding Invoices | currency |

### Events
- `invoice.paid` — Invoice payment received
- `expense.flagged` — Unusual expense detected
- `runway.warning` — Runway below 3 months
- `report.generated` — Monthly report ready

### Copilot Queries
- `getRunway` — Current runway projection
- `getCashFlow` — Monthly cash flow breakdown
- `getExpenses` — Expense categories and trends
- `getOutstandingInvoices` — Unpaid invoices

### Copilot Actions
- `createInvoice` — Generate and send invoice
- `categorizeExpense` — Auto-categorize an expense
- `generateReport` — Create P&L or cash flow report

## What You Consume from Founder OS

- **Pricing** — Revenue model → revenue projections
- **Hiring** — Team costs → payroll burn
- **GTM** — Marketing spend → customer acquisition cost
- **CRM/Deals** — Won deals → actual revenue

## Integration Contract

```
⬜ GET  /api/v1/plugin/manifest     (implement)
⬜ GET  /api/v1/plugin/heartbeat    (implement)
⬜ GET  /api/v1/plugin/dashboard    (implement)
⬜ POST /api/v1/copilot/query       (implement)
⬜ POST /api/v1/copilot/action      (implement)
⬜ POST /api/v1/plugin/webhook      (implement)
⬜ GET  /api/v1/plugin/sso          (implement)
```
