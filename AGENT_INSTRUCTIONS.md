# 🎯 Agent Instructions — Finance Suite → UniQLabs Hub Ingestion

> **You are an AI agent responsible for making this a COMPLETE, PRODUCTION-GRADE FULL-STACK application and preparing it for ingestion into UniQLabs Hub.**

## Critical Context

UniQLabs Hub assembles **full-stack applications** — not just frontends. Every module must include:
- **Frontend** — React components (production-grade UI)
- **Backend** — API routes with real business logic
- **Database** — Prisma models with relationships

When this app gets ingested into the hub, its modules are used to **generate and deploy real working applications**.

## Your Mission

This application (`finance`) is a **Finance/Accounting** app with ~9,500 lines. Your job is to:

1. **Audit** the full stack — frontend, backend APIs, database schema
2. **Upgrade** everything to production quality
3. **Produce a `blueprint.md`** describing the complete full-stack module breakdown

---

## Step 1: Audit the Full Stack

```bash
find src -type f -name "*.tsx" | head -40
find src/app/api -name "route.ts" 2>/dev/null
find src -name "*.routes.ts" -o -name "*.controller.ts" 2>/dev/null
cat prisma/schema.prisma 2>/dev/null
```

## Step 2: Upgrade to 100%

### Frontend Quality
- [ ] Sleek financial dashboards — proper currency formatting, number animations
- [ ] Color-coded status badges (paid/pending/overdue)
- [ ] Dark-mode compatible — CSS variables
- [ ] Interactive — date range pickers, category filters, drill-down charts
- [ ] Charts with `recharts` — cash flow, revenue vs expenses, category breakdown

### Backend Quality
- [ ] Every API has **proper error handling**, input validation
- [ ] Pagination, search, date-range filtering
- [ ] Proper decimal handling for financial amounts
- [ ] TypeScript types for all request/response

### Database Quality
- [ ] Prisma schema with proper relations, indexes
- [ ] Decimal types for money fields
- [ ] Enums (InvoiceStatus, ExpenseCategory, PaymentMethod)
- [ ] Seed data with realistic financial transactions

### Expected Full-Stack Features

| Feature | Frontend | Backend | Database |
|---------|----------|---------|----------|
| **Finance Dashboard** | Revenue/expense/profit stats, runway, trending | `GET /api/dashboard/stats` | Aggregations |
| **Invoice Manager** | Invoice list, create form, line items, PDF preview | `GET/POST/PATCH /api/invoices`, `POST /api/invoices/[id]/send` | Invoice, InvoiceItem, Client |
| **Expense Tracker** | Categorized list, receipt upload, approval | `GET/POST /api/expenses`, `PATCH /api/expenses/[id]/approve` | Expense, ExpenseCategory, Receipt |
| **Cash Flow** | Income vs expense chart, projection, runway | `GET /api/reports/cashflow` | Derived from transactions |
| **P&L Report** | Revenue breakdown, expenses by category, net income | `GET /api/reports/pnl` | Derived from invoices + expenses |
| **Budget & Forecast** | Budget vs actual, variance, projections | `GET/POST /api/budgets` | Budget, BudgetCategory |
| **Accounts** | Chart of accounts, bank connections | `GET/POST /api/accounts` | Account, Transaction |
| **Settings** | Currency, tax rates, fiscal year, categories | `GET/PATCH /api/settings` | Settings |

## Step 3: Create `blueprint.md`

Create `blueprint.md` at repo root with **full-stack** module breakdown. Each module MUST have:
- **Components** list
- **API Routes** with methods, paths, and descriptions
- **Prisma Models** with key fields
- **Config Schema** with parameterizable values

```markdown
# Finance Suite

## Overview
- **Template ID**: `finance-suite`
- **Category**: Finance
- **Tagline**: Complete financial management with invoicing, expenses, and P&L
- **Primary Color**: `#10b981`
- **Emoji**: 💰

## Presets

### small-business
- **Name**: Small Business
- **Overrides**: currency, tax rate, expense categories

### startup
- **Name**: Startup Finance
- **Overrides**: runway focus, burn rate metrics

### freelancer
- **Name**: Freelancer
- **Overrides**: invoice-centric, simplified categories
```

## What Success Looks Like

1. **Every page** is polished — looks like a real QuickBooks/FreshBooks
2. **Every API** has real accounting logic, proper decimal handling
3. **Database** has proper financial modeling (double-entry ready)
4. `blueprint.md` documents ALL three layers
5. The app builds and runs end-to-end
