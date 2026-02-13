# Module Contribution — Finance

> **Agent instructions**: Break Finance into UniQ Labs modules using the `.uniqlabs.modules/` mapping layer. Read the master spec at `../uniqlabs-hub/MODULE_CONTRIBUTION.md` first.

## Product Overview

Finance is a **startup-focused accounting & runway management platform**. It manages invoices, expenses, cash flow projections, P&L reports, and provides financial intelligence for founders.

## Module Breakdown

### New Modules to Contribute

| Module ID | Name | Description | Backend? | Complexity |
|-----------|------|-------------|:--------:|:----------:|
| `invoice-manager` | Invoice Manager | Invoice CRUD with PDF generation, email sending, and payment tracking | Yes (`api-only`) | intermediate |
| `expense-tracker` | Expense Tracker | Expense categorization, receipt upload, and approval workflows | No | intermediate |
| `cashflow-projector` | Cash Flow Projector | Forward-looking cash flow projections with scenario modeling | No | advanced |
| `pnl-report` | P&L Report | Profit & loss reporting with period comparison and drill-down | No | intermediate |
| `runway-calculator` | Runway Calculator | Burn rate and runway projection with configurable assumptions | No | basic |

### Existing UniQ Labs Modules to Reuse

- `dashboard-layout` — main shell
- `data-table` — invoice lists, expense lists
- `charts` — financial charts, cash flow graphs
- `form-builder` — invoice/expense creation forms
- `csv-import-export` — financial data export
- `approval-flow` — expense approvals
- `stats-cards` — financial KPIs (burn rate, runway, revenue)
- `notifications` — payment reminders, overdue alerts

## Directory Structure

```
finance/
├── src/
├── .uniqlabs.modules/
│   ├── index.json
│   ├── invoice-manager/
│   │   ├── manifest.ts
│   │   ├── preview.tsx
│   │   └── backend.ts           # PDF + email service
│   ├── expense-tracker/
│   │   ├── manifest.ts
│   │   └── preview.tsx
│   ├── cashflow-projector/
│   │   ├── manifest.ts
│   │   └── preview.tsx
│   ├── pnl-report/
│   │   ├── manifest.ts
│   │   └── preview.tsx
│   └── runway-calculator/
│       ├── manifest.ts
│       └── preview.tsx
```
