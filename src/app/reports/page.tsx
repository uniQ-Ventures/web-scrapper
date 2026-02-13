"use client";

import { useState, useEffect } from "react";
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  FileDown,
  Calculator,
  Landmark,
} from "lucide-react";
import { useToast } from "@/components/toast";
import { SkeletonTable, SkeletonCard } from "@/components/skeleton";

type Tab = "pnl" | "cashflow" | "tax";

interface PnLData {
  revenue: { label: string; amount: number }[];
  expenses: { label: string; amount: number }[];
  totalRevenue: number;
  totalExpenses: number;
  netIncome: number;
  profitMargin: number;
}

interface CashFlowData {
  projections: { month: string; inflow: number; outflow: number; net: number; balance: number }[];
  currentBalance: number;
  projectedRunway: number;
}

interface TaxData {
  outputTax: number;
  inputTaxCredit: number;
  netPayable: number;
  invoiceCount: number;
  expenseCount: number;
}

export default function ReportsPage() {
  const { toast } = useToast();
  const [tab, setTab] = useState<Tab>("pnl");
  const [loading, setLoading] = useState(true);
  const [pnl, setPnl] = useState<PnLData | null>(null);
  const [cashFlow, setCashFlow] = useState<CashFlowData | null>(null);
  const [tax, setTax] = useState<TaxData | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/reports/pnl").then((r) => r.json()).catch(() => null),
      fetch("/api/reports/cashflow").then((r) => r.json()).catch(() => null),
      fetch("/api/reports/tax").then((r) => r.json()).catch(() => null),
    ]).then(([p, c, t]) => {
      setPnl(p);
      setCashFlow(c);
      setTax(t);
      setLoading(false);
    });
  }, []);

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

  const downloadCSV = () => {
    window.open("/api/reports/pnl/csv", "_blank");
    toast("Downloading P&L CSV...", "info");
  };

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "pnl", label: "Profit & Loss", icon: <BarChart3 size={16} /> },
    { id: "cashflow", label: "Cash Flow", icon: <TrendingUp size={16} /> },
    { id: "tax", label: "GST Summary", icon: <Calculator size={16} /> },
  ];

  return (
    <div>
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h2>Reports</h2>
          <p>Financial intelligence and reporting</p>
        </div>
        {tab === "pnl" && (
          <button className="btn btn-secondary" onClick={downloadCSV}>
            <FileDown size={16} /> Export CSV
          </button>
        )}
      </div>

      {/* Tab navigation */}
      <div style={{
        display: "flex", gap: 4, marginBottom: 24,
        background: "var(--bg-secondary)", padding: 4,
        borderRadius: "var(--radius)", width: "fit-content",
      }}>
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "8px 16px", borderRadius: "var(--radius-sm)",
              border: "none", fontSize: 13, fontWeight: 500, cursor: "pointer",
              transition: "all 0.2s",
              background: tab === t.id ? "var(--bg-card)" : "transparent",
              color: tab === t.id ? "var(--text-primary)" : "var(--text-secondary)",
              boxShadow: tab === t.id ? "0 1px 3px rgba(0,0,0,0.2)" : "none",
            }}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ display: "grid", gap: 16 }}>
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : (
        <>
          {/* P&L Tab */}
          {tab === "pnl" && pnl && (
            <>
              {/* Summary KPIs */}
              <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)", marginBottom: 24 }}>
                <div className="kpi-card green">
                  <div className="kpi-label">Total Revenue</div>
                  <div className="kpi-value" style={{ fontSize: 22 }}>{fmt(pnl.totalRevenue)}</div>
                </div>
                <div className="kpi-card red">
                  <div className="kpi-label">Total Expenses</div>
                  <div className="kpi-value" style={{ fontSize: 22 }}>{fmt(pnl.totalExpenses)}</div>
                </div>
                <div className="kpi-card" style={{ borderColor: pnl.netIncome >= 0 ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)" }}>
                  <div className="kpi-label">Net Income</div>
                  <div className="kpi-value" style={{ fontSize: 22, color: pnl.netIncome >= 0 ? "var(--accent-green)" : "var(--accent-red)" }}>
                    {fmt(pnl.netIncome)}
                  </div>
                </div>
                <div className="kpi-card amber">
                  <div className="kpi-label">Profit Margin</div>
                  <div className="kpi-value" style={{ fontSize: 22 }}>
                    {pnl.profitMargin.toFixed(1)}%
                  </div>
                </div>
              </div>

              {/* Revenue breakdown */}
              <div className="section-grid" style={{ marginBottom: 24 }}>
                <div className="table-container">
                  <div className="table-header">
                    <h3><DollarSign size={16} style={{ display: "inline", verticalAlign: "middle", marginRight: 6 }} />Revenue Breakdown</h3>
                  </div>
                  <table>
                    <thead><tr><th>Source</th><th style={{ textAlign: "right" }}>Amount</th></tr></thead>
                    <tbody>
                      {pnl.revenue.length > 0 ? pnl.revenue.map((r) => (
                        <tr key={r.label}>
                          <td>{r.label}</td>
                          <td style={{ textAlign: "right", fontWeight: 600, color: "var(--accent-green)" }}>{fmt(r.amount)}</td>
                        </tr>
                      )) : (
                        <tr><td colSpan={2} style={{ textAlign: "center", color: "var(--text-muted)", padding: 20 }}>No revenue data</td></tr>
                      )}
                      <tr style={{ fontWeight: 700, borderTop: "2px solid var(--border-color)" }}>
                        <td>Total</td>
                        <td style={{ textAlign: "right" }}>{fmt(pnl.totalRevenue)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="table-container">
                  <div className="table-header">
                    <h3><Landmark size={16} style={{ display: "inline", verticalAlign: "middle", marginRight: 6 }} />Expense Breakdown</h3>
                  </div>
                  <table>
                    <thead><tr><th>Category</th><th style={{ textAlign: "right" }}>Amount</th></tr></thead>
                    <tbody>
                      {pnl.expenses.length > 0 ? pnl.expenses.map((e) => (
                        <tr key={e.label}>
                          <td>{e.label}</td>
                          <td style={{ textAlign: "right", fontWeight: 600, color: "var(--accent-red)" }}>{fmt(e.amount)}</td>
                        </tr>
                      )) : (
                        <tr><td colSpan={2} style={{ textAlign: "center", color: "var(--text-muted)", padding: 20 }}>No expense data</td></tr>
                      )}
                      <tr style={{ fontWeight: 700, borderTop: "2px solid var(--border-color)" }}>
                        <td>Total</td>
                        <td style={{ textAlign: "right" }}>{fmt(pnl.totalExpenses)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* Cash Flow Tab */}
          {tab === "cashflow" && cashFlow && (
            <>
              <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)", marginBottom: 24 }}>
                <div className="kpi-card green">
                  <div className="kpi-label">Current Balance</div>
                  <div className="kpi-value" style={{ fontSize: 22 }}>{fmt(cashFlow.currentBalance)}</div>
                </div>
                <div className="kpi-card" style={{ borderColor: cashFlow.projectedRunway > 12 ? "rgba(34,197,94,0.2)" : "rgba(234,179,8,0.2)" }}>
                  <div className="kpi-label">Projected Runway</div>
                  <div className="kpi-value" style={{ fontSize: 22 }}>
                    {cashFlow.projectedRunway === Infinity ? "∞" : `${cashFlow.projectedRunway} months`}
                  </div>
                </div>
                <div className="kpi-card amber">
                  <div className="kpi-label">Projection Period</div>
                  <div className="kpi-value" style={{ fontSize: 22 }}>{cashFlow.projections.length} months</div>
                </div>
              </div>

              <div className="table-container">
                <div className="table-header">
                  <h3>Monthly Cash Flow Projection</h3>
                </div>
                <table>
                  <thead>
                    <tr>
                      <th>Month</th>
                      <th style={{ textAlign: "right" }}>Inflow</th>
                      <th style={{ textAlign: "right" }}>Outflow</th>
                      <th style={{ textAlign: "right" }}>Net</th>
                      <th style={{ textAlign: "right" }}>Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cashFlow.projections.map((p) => (
                      <tr key={p.month}>
                        <td style={{ fontWeight: 600 }}>{p.month}</td>
                        <td style={{ textAlign: "right", color: "var(--accent-green)" }}>{fmt(p.inflow)}</td>
                        <td style={{ textAlign: "right", color: "var(--accent-red)" }}>{fmt(p.outflow)}</td>
                        <td style={{ textAlign: "right", fontWeight: 600, color: p.net >= 0 ? "var(--accent-green)" : "var(--accent-red)" }}>{fmt(p.net)}</td>
                        <td style={{ textAlign: "right", fontWeight: 700 }}>{fmt(p.balance)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* Tax Tab */}
          {tab === "tax" && tax && (
            <>
              <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)", marginBottom: 24 }}>
                <div className="kpi-card amber">
                  <div className="kpi-label">Output Tax (Collected)</div>
                  <div className="kpi-value" style={{ fontSize: 22 }}>{fmt(tax.outputTax)}</div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>From {tax.invoiceCount} invoices</div>
                </div>
                <div className="kpi-card green">
                  <div className="kpi-label">Input Tax Credit</div>
                  <div className="kpi-value" style={{ fontSize: 22 }}>{fmt(tax.inputTaxCredit)}</div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>From {tax.expenseCount} expenses</div>
                </div>
                <div className="kpi-card" style={{
                  borderColor: tax.netPayable > 0 ? "rgba(239,68,68,0.2)" : "rgba(34,197,94,0.2)",
                }}>
                  <div className="kpi-label">Net GST Payable</div>
                  <div className="kpi-value" style={{
                    fontSize: 22,
                    color: tax.netPayable > 0 ? "var(--accent-red)" : "var(--accent-green)",
                  }}>
                    {fmt(tax.netPayable)}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                    {tax.netPayable > 0 ? "Payable to government" : "Credit available"}
                  </div>
                </div>
              </div>

              <div className="table-container" style={{ padding: 24 }}>
                <h3 style={{ marginBottom: 16 }}>GST Computation</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", borderBottom: "1px solid var(--border-color)" }}>
                    <span>Output Tax (on sales)</span>
                    <span style={{ fontWeight: 600 }}>{fmt(tax.outputTax)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", borderBottom: "1px solid var(--border-color)" }}>
                    <span>Less: Input Tax Credit</span>
                    <span style={{ fontWeight: 600, color: "var(--accent-green)" }}>- {fmt(tax.inputTaxCredit)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "16px 0", fontSize: 18, fontWeight: 800 }}>
                    <span>Net GST Payable</span>
                    <span style={{ color: tax.netPayable > 0 ? "var(--accent-red)" : "var(--accent-green)" }}>
                      {fmt(tax.netPayable)}
                    </span>
                  </div>
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
