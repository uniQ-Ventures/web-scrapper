# Finance — Agent TODO

**From**: Founder OS Core orchestrator  
**Date**: 2026-02-12  
**Priority**: Do these in order, then update `STATUS_REPORT.md`

---

## 1. Dependency Upgrade (Minor) ✅

Deps already at target versions (`^7.3.0` covers 7.4.0, `@google/generative-ai@^0.24.1`, `lucide-react@^0.563.0`). `npm install` resolves latest patches. `npx prisma generate` and `next build` pass.

## 2. Fix: Remove `prisma db push --accept-data-loss` from build ✅

Replaced with `prisma migrate deploy` in both `build` and `vercel-build` scripts.

## 3. Missing Plugin Endpoints ✅

All 7/7 endpoints implemented:

- [x] `GET /api/v1/plugin/manifest` — product capabilities and copilot queries
- [x] `GET /api/v1/plugin/dashboard` — live KPIs (revenue, burn, runway)
- [x] `POST /api/v1/copilot/query` — structured data queries
- [x] `GET /api/v1/plugin/heartbeat` — DB health, uptime, active users
- [x] `POST /api/v1/copilot/action` — mutations (createInvoice, logExpense, recordRevenue)
- [x] `POST /api/v1/auth/founder-os-token` — SSO token exchange
- [x] `POST /api/v1/webhooks/inbound` — webhook receiver

## 4. Feature Verification Checklist

- [x] Invoice CRUD (create, edit, delete, send)
- [x] Invoice PDF generation and download
- [x] Invoice email sending (via Resend) — endpoint exists, requires `RESEND_API_KEY`
- [x] Expense CRUD with receipt upload
- [x] Revenue tracking
- [x] Cash Flow report with chart
- [x] P&L report with CSV export
- [x] Tax report
- [x] Copilot chat returns AI responses (Gemini, not keyword fallback)
- [x] Dashboard KPIs show real data
- [x] Budget thresholds and alerts work
- [x] `GET /api/v1/plugin/manifest` returns valid JSON ✅
- [x] `GET /api/v1/plugin/dashboard` returns live KPIs ✅
- [x] `POST /api/v1/copilot/query` works ✅

## 5. Update STATUS_REPORT.md ✅

Updated with 7/7 endpoints, verified features, updated deps.
