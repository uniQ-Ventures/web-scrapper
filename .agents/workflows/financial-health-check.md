---
description: End-to-end workflow to import company financials and get health score with recommendations
---

# E2E Financial Health Testing Workflow

// turbo-all

## Objective
Import your company's past financial year data (invoices, bank statement expenses) and get an automated financial health score with AI-powered recommendations.

---

## Prerequisites

1. **Your data files ready:**
   - Bank statement as CSV (columns: Date, Description, Amount, Debit/Credit)
   - Invoices as CSV (columns: Invoice No, Client, Amount, Date, Due Date, Status)
   - Revenue as CSV (columns: Month, Amount, Source)

2. **App running locally:**
   ```bash
   cd /Users/nidishramakrishnan/Work/founderOS/finance
   npm run dev
   ```

3. **Signed in** via Google OAuth at http://localhost:3000

---

## Step 1: Import Bank Statement → Expenses

1. Navigate to **http://localhost:3000/import**
2. Select **"Expenses"** as the import target
3. Drop your bank statement CSV file
4. Map columns:
   - `Date` → Date
   - `Description` or `Narration` → Description
   - `Debit` or `Amount` → Amount
   - `Reference` → Vendor (optional)
5. Review the preview — check valid/error counts
6. Click **"Import X Expenses"**

> **Tip:** The AI auto-categorizer will try to detect column mappings. You can always adjust manually.

## Step 2: Import Invoices

1. Stay on **http://localhost:3000/import**
2. Select **"Invoices"** as the target
3. Drop your invoices CSV file
4. Map columns:
   - `Invoice Number` → Invoice Number
   - `Client Name` → Client
   - `Invoice Date` → Issue Date
   - `Due Date` → Due Date
   - `Total Amount` → Total
   - `Status` → Status (draft/sent/paid/overdue)
5. Review and import

## Step 3: Import Revenue

1. Stay on **http://localhost:3000/import**
2. Select **"Revenue"** as the target
3. Drop your monthly revenue CSV
4. Map columns:
   - `Month` → Month
   - `Amount` → Amount
   - `Source` → Source (optional)
5. Import

## Step 4: Verify Imported Data

Check each section to confirm data loaded correctly:

1. **Expenses** → http://localhost:3000/expenses — verify transaction count and amounts
2. **Invoices** → http://localhost:3000/invoices — verify invoices appear with correct status
3. **Revenue** → http://localhost:3000/revenue — verify monthly revenue entries

## Step 5: Reconcile Bank Transactions

1. Navigate to **http://localhost:3000/reconciliation**
2. The engine will auto-suggest matches between bank transactions and invoices/expenses
3. Review matches and click **"Auto-Match All"** for confident matches
4. Manually match any remaining items

## Step 6: Set Budgets

1. Navigate to **http://localhost:3000/budgets**
2. Set monthly budget limits for key categories:
   - Salaries & Wages
   - Rent
   - Marketing
   - Software & Subscriptions
   - Professional Fees

## Step 7: View Financial Health Score 🏆

1. Navigate to **http://localhost:3000/health**
2. You will see:
   - **Health Score (0-100)** with letter grade (A+ to F)
   - **6 KPI cards:** Revenue, Expenses, Profit/Loss, Cash Position, Receivables, Collection Days
   - **Top expense categories** with visual breakdown
   - **AI Recommendations** — prioritized action items sorted by urgency

### What the Health Score measures:
| Dimension | Weight | What it checks |
|-----------|--------|---------------|
| Profitability | ±20 pts | Net margins (target: 15%+) |
| Revenue Growth | ±15 pts | Quarter-over-quarter trend |
| Cash Runway | ±15 pts | Months of expenses covered by cash |
| AR Health | ±10 pts | Overdue invoice ratio |
| Budget Discipline | ±10 pts | Budget adherence rate |

## Step 8: Explore Deeper Analytics

After the health check, explore these pages:

- **http://localhost:3000/forecast** — Revenue forecast (6 months) + 3 scenario models
- **http://localhost:3000/anomalies** — Unusual spending patterns detected
- **http://localhost:3000/reports** — Detailed P&L and aging reports
- **http://localhost:3000/tds** — TDS obligations (if relevant)
- **http://localhost:3000/gst** — GST returns data (GSTR-1 / GSTR-3B)
- **http://localhost:3000/bookkeeper** — Ask AI questions like "How much did I spend on rent?"
- **http://localhost:3000/accounting** — Chart of Accounts + Balance Sheet

## Step 9: Export PDF Reports

1. P&L Statement: `GET /api/reports/pdf?type=pnl&from=2025-04-01&to=2026-03-31`
2. Specific invoice: `GET /api/reports/pdf?type=invoice&invoiceId=<id>`
3. Open in browser → Ctrl+P / Cmd+P → Save as PDF

---

## Sample CSV Formats

### Bank Statement CSV
```csv
Date,Description,Amount,Type
2025-04-05,AWS Monthly,15000,Debit
2025-04-10,Client Payment - Acme Corp,250000,Credit
2025-04-15,Office Rent,85000,Debit
```

### Invoices CSV
```csv
InvoiceNumber,Client,IssueDate,DueDate,Total,Status
INV-001,Acme Corp,2025-04-01,2025-05-01,250000,paid
INV-002,Beta LLC,2025-04-15,2025-05-15,180000,sent
```

### Revenue CSV
```csv
Month,Amount,Source
2025-04,430000,Services
2025-05,520000,Services
```
