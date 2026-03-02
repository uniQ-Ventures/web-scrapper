# Finance Suite — Blueprint

## Overview
- **Template ID**: `finance-suite`
- **Category**: Finance & Accounting
- **Tagline**: Complete financial management with invoicing, expense tracking, GST, and P&L
- **Primary Color**: `#6366F1`
- **Emoji**: 💰
- **Stack**: Next.js 16 · Prisma 7 · PostgreSQL · Recharts · Gemini AI

---

## Presets

### small-business
- **Name**: Small Business Finance
- **Overrides**: `currency: INR`, `taxRate: 18`, auto expense categories, GST reports

### startup
- **Name**: Startup Finance
- **Overrides**: Runway + burn rate focus, fundraising metrics, budget vs actuals

### freelancer
- **Name**: Freelancer
- **Overrides**: Invoice-centric, simplified categories, single-user, no team payroll

---

## Modules

### 1. Finance Dashboard
**Components**: `page.tsx` (Dashboard)
**API Routes**:
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/dashboard` | Revenue, burn rate, runway, outstanding invoices, ARR |

**Prisma Models**: Organization, User (aggregations)
**Config**: `currency`, `fiscalYearStart`, `runwayAlertMonths`

---

### 2. Invoice Manager
**Components**: `invoices/page.tsx`
**API Routes**:
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/invoices` | List with filters, pagination |
| POST | `/api/invoices` | Create with line items, GST |
| GET | `/api/invoices/[id]` | Single invoice detail |
| PATCH | `/api/invoices/[id]/[action]` | Mark paid/sent/void |
| POST | `/api/invoices/[id]/pdf` | Generate PDF |
| POST | `/api/invoices/[id]/email` | Send via Resend |

**Prisma Models**: Invoice, InvoiceLineItem, Client
**Config**: `invoicePrefix`, `defaultPaymentTerms`, `gstRate`, `companyLogo`

---

### 3. Expense Tracker
**Components**: `expenses/page.tsx`
**API Routes**:
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/expenses` | List with category/date filters |
| POST | `/api/expenses` | Create expense |
| PATCH | `/api/expenses/[id]` | Update |
| POST | `/api/expenses/[id]/receipt` | Upload receipt |

**Prisma Models**: Expense, ExpenseCategory, Account
**Config**: `defaultCategories[]`, `receiptUploadEnabled`, `approvalWorkflow`

---

### 4. Revenue Tracking
**Components**: `revenue/page.tsx`
**API Routes**:
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/revenue` | List revenue entries |
| POST | `/api/revenue` | Record revenue |

**Prisma Models**: Revenue, Client
**Config**: `revenueTypes[]`, `arrEnabled`

---

### 5. Reports & Analytics
**Components**: `reports/page.tsx` (P&L, Cash Flow, GST tabs)
**API Routes**:
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/reports/pnl` | Profit & Loss statement |
| GET | `/api/reports/pnl/csv` | P&L CSV export |
| GET | `/api/reports/cashflow` | Cash flow projections |
| GET | `/api/reports/tax` | GST summary |

**Prisma Models**: derived from Invoice, Expense, Revenue
**Config**: `reportPeriod`, `projectionMonths`

---

### 6. Budget & Forecast
**Components**: `budgets/page.tsx`
**API Routes**:
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/budgets` | List budgets with actuals |
| POST | `/api/budgets` | Set budget threshold |
| DELETE | `/api/budgets` | Remove budget |

**Prisma Models**: BudgetThreshold
**Config**: `budgetCategories[]`, `defaultAlertThreshold`

---

### 7. Bank Transactions
**Components**: `bank/page.tsx`
**API Routes**:
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/bank/import` | Upload CSV bank statement |
| GET | `/api/bank/transactions` | List with filters, pagination |
| PATCH | `/api/bank/transactions` | Update category/vendor |
| GET | `/api/bank/accounts` | List bank accounts |
| POST | `/api/bank/accounts` | Add bank account |

**Prisma Models**: BankAccount, BankTransaction, ImportBatch
**Config**: `supportedBanks[]`, `aiCategorizationEnabled`

---

### 8. Data Import
**Components**: `import/page.tsx` (step wizard)
**API Routes**:
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/import/csv` | Multi-step: detect → preview → import |
| GET | `/api/categories` | List expense categories |
| POST | `/api/categories` | Create category |

**Prisma Models**: ImportBatch, Expense, Revenue, Invoice (targets)
**Config**: `importTargets[]`, `columnAutoDetect`

---

### 9. Settings
**Components**: `settings/page.tsx`
**API Routes**:
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/settings/organization` | Current org settings |
| PATCH | `/api/settings/organization` | Update settings |
| GET | `/api/clients` | Client list |
| POST | `/api/clients` | Create client |

**Prisma Models**: Organization, Client
**Config**: `currency`, `gstNumber`, `companyName`, `logo`

---

### 10. AI Copilot
**Components**: `copilot-panel.tsx`
**API Routes**:
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/copilot/chat` | Natural language queries |
| POST | `/api/v1/copilot/query` | Structured queries |
| POST | `/api/v1/copilot/action` | Mutations (create invoice, log expense) |

**Dependencies**: `@google/generative-ai` (Gemini Pro)
**Config**: `aiModel`, `aiTemperature`, `enabledActions[]`

---

### 11. Plugin Integration (Founder OS)
**API Routes**:
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/plugin/manifest` | Product capabilities |
| GET | `/api/v1/plugin/dashboard` | Live KPIs |
| GET | `/api/v1/plugin/heartbeat` | Health check |
| POST | `/api/v1/auth/founder-os-token` | SSO token exchange |
| POST | `/api/v1/webhooks/inbound` | Webhook receiver |

**Config**: `founderOsCoreUrl`, `webhookSecret`

---

## Database Schema Summary

| Model | Key Fields | Relations |
|-------|-----------|-----------|
| Organization | name, currency, cashInBank, gstNumber | users, clients, invoices, expenses, revenues |
| User | email, fullName | organization → many resources |
| Client | name, email, company, gstNumber | invoices, revenues |
| Invoice | invoiceNumber, status, total, issueDate, dueDate | lineItems, client |
| InvoiceLineItem | description, quantity, unitPrice, gstRate, cgst, sgst, igst | invoice |
| Expense | description, amount, date, vendor | category, account |
| ExpenseCategory | name, icon, color | expenses |
| Revenue | month, amount, type, source | client |
| Account | name, type, currentBalance | expenses |
| BudgetThreshold | category, monthlyLimit, alertAt | organization |
| BankAccount | name, bankName, accountNumber, ifscCode | transactions |
| BankTransaction | date, description, amount, type, category, hash | bankAccount, importBatch |
| ImportBatch | type, fileName, rowCount, status | transactions |

---

## Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| next | ^16.1.6 | Framework |
| react | ^19.0.0 | UI |
| prisma | ^7.3.0 | ORM |
| @prisma/client | ^7.3.0 | DB client |
| @prisma/adapter-pg | ^7.3.0 | PostgreSQL adapter |
| recharts | ^2.x | Interactive charts |
| @google/generative-ai | ^0.24.1 | Gemini AI copilot |
| lucide-react | ^0.563.0 | Icons |
| next-auth | ^4.24.11 | Authentication |
| resend | ^4.x | Email sending |
| jspdf | ^3.x | PDF generation |
