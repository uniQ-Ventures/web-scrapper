"use client";

import { useState, useEffect } from "react";
import {
  TrendingUp,
  Flame,
  Clock,
  FileText,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  DollarSign,
  CreditCard,
  PieChart,
  BarChart3,
} from "lucide-react";
import { SkeletonKPI } from "@/components/skeleton";

interface DashboardData {
  monthlyRevenue: number;
  burnRate: number;
  runwayMonths: number;
  outstandingInvoices: { count: number; total: number };
  totalExpensesThisMonth: number;
  revenueGrowth: number;
  runway: { cashInBank: number; projectedRunOutDate: string | null };
  burnRateDetails: { trend: string; average3Month: number };
  revenueDetails: { currentARR: number; history: { month: string; amount: number }[] };
}

interface CashFlowData {
  projections: { month: string; inflow: number; outflow: number; net: number; balance: number }[];
  currentBalance: number;
  projectedRunway: number;
}

interface PnLData {
  expenses: { label: string; amount: number }[];
  totalExpenses: number;
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [cashFlow, setCashFlow] = useState<CashFlowData | null>(null);
  const [pnl, setPnl] = useState<PnLData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/dashboard").then((res) => res.json()),
      fetch("/api/reports/cashflow").then((res) => res.json()).catch(() => null),
      fetch("/api/reports/pnl").then((res) => res.json()).catch(() => null),
    ]).then(([dashData, cfData, pnlData]) => {
      setData(dashData);
      setCashFlow(cfData);
      setPnl(pnlData);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(n);

  if (loading) {
    return (
      <div>
        <div className="page-header">
          <h2>Dashboard</h2>
          <p>Your financial overview at a glance</p>
        </div>
        <div className="kpi-grid">
          {[1, 2, 3, 4].map((i) => <SkeletonKPI key={i} />)}
        </div>
      </div>
    );
  }

  const kpis = [
    {
      label: "Monthly Revenue",
      value: formatCurrency(data?.monthlyRevenue ?? 0),
      change: data?.revenueGrowth ?? 0,
      color: "green" as const,
      icon: <TrendingUp size={20} />,
      sub: `ARR ${formatCurrency(data?.revenueDetails?.currentARR ?? 0)}`,
    },
    {
      label: "Burn Rate",
      value: formatCurrency(data?.burnRate ?? 0),
      change: null,
      color: "red" as const,
      icon: <Flame size={20} />,
      sub: `Trend: ${data?.burnRateDetails?.trend ?? "stable"}`,
    },
    {
      label: "Runway",
      value:
        data?.runwayMonths === Infinity
          ? "∞"
          : `${data?.runwayMonths ?? 0} mo`,
      change: null,
      color: (data?.runwayMonths ?? 0) > 12
        ? "green" as const
        : (data?.runwayMonths ?? 0) > 6
          ? "amber" as const
          : "red" as const,
      icon: <Clock size={20} />,
      sub: data?.runway?.projectedRunOutDate
        ? `Until ${new Date(data.runway.projectedRunOutDate).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}`
        : "Sustainable",
    },
    {
      label: "Outstanding",
      value: `${data?.outstandingInvoices?.count ?? 0}`,
      change: null,
      color: "amber" as const,
      icon: <FileText size={20} />,
      sub: formatCurrency(data?.outstandingInvoices?.total ?? 0),
    },
  ];

  const history = data?.revenueDetails?.history ?? [];
  const maxAmount = Math.max(...history.map((h) => h.amount), 1);

  // Cash flow chart data
  const cfProjections = cashFlow?.projections ?? [];
  const cfMax = Math.max(...cfProjections.map((p) => Math.max(p.inflow, p.outflow)), 1);

  // Expense categories for pie chart
  const expenseCategories = (pnl?.expenses ?? []).slice(0, 5);
  const expTotal = pnl?.totalExpenses || 1;
  const categoryColors = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6", "#8b5cf6"];

  return (
    <div>
      <div className="page-header">
        <h2>Dashboard</h2>
        <p>Your financial overview at a glance</p>
      </div>

      {/* KPI Grid */}
      <div className="kpi-grid">
        {kpis.map((kpi) => (
          <div key={kpi.label} className={`kpi-card ${kpi.color}`}>
            <div className={`kpi-icon ${kpi.color}`}>{kpi.icon}</div>
            <div className="kpi-label">{kpi.label}</div>
            <div className="kpi-value">{kpi.value}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {kpi.change !== null && (
                <span
                  className={`kpi-change ${kpi.change > 0 ? "up" : kpi.change < 0 ? "down" : "neutral"}`}
                >
                  {kpi.change > 0 ? (
                    <ArrowUpRight size={12} />
                  ) : kpi.change < 0 ? (
                    <ArrowDownRight size={12} />
                  ) : (
                    <Minus size={12} />
                  )}
                  {Math.abs(kpi.change)}%
                </span>
              )}
              <span
                style={{ fontSize: 12, color: "var(--text-muted)" }}
              >
                {kpi.sub}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row 1: Revenue Trend + Quick Actions */}
      <div className="section-grid">
        <div className="chart-container">
          <div className="chart-header">
            <h3>Revenue Trend</h3>
            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Last 6 months</span>
          </div>
          {history.length > 0 ? (
            <div className="chart-bars">
              {history.map((h) => (
                <div key={h.month} className="chart-bar-wrapper">
                  <div
                    className="chart-bar revenue"
                    style={{ height: `${Math.max((h.amount / maxAmount) * 100, 3)}%` }}
                    title={formatCurrency(h.amount)}
                  />
                  <span className="chart-bar-label">{h.month.slice(5)}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state" style={{ padding: 40 }}>
              <DollarSign size={32} style={{ opacity: 0.3 }} />
              <p style={{ marginTop: 8 }}>No revenue data yet</p>
            </div>
          )}
        </div>

        <div className="chart-container">
          <div className="chart-header">
            <h3>Quick Actions</h3>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <a href="/invoices" className="btn btn-primary" style={{ justifyContent: "center" }}>
              <FileText size={16} /> Create Invoice
            </a>
            <a href="/expenses" className="btn btn-secondary" style={{ justifyContent: "center" }}>
              <CreditCard size={16} /> Log Expense
            </a>
            <a href="/revenue" className="btn btn-secondary" style={{ justifyContent: "center" }}>
              <TrendingUp size={16} /> Record Revenue
            </a>
          </div>
          <div style={{
            marginTop: 24,
            padding: 16,
            background: "var(--bg-input)",
            borderRadius: "var(--radius-md)",
          }}>
            <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>CASH IN BANK</p>
            <p style={{ fontSize: 24, fontWeight: 800, letterSpacing: -1 }}>
              {formatCurrency(data?.runway?.cashInBank ?? 0)}
            </p>
          </div>
        </div>
      </div>

      {/* Charts Row 2: Cash Flow Projection + Expense Breakdown */}
      <div className="section-grid" style={{ marginTop: 24 }}>
        <div className="chart-container">
          <div className="chart-header">
            <h3><BarChart3 size={16} style={{ display: "inline", verticalAlign: "middle", marginRight: 6 }} />Cash Flow Projection</h3>
            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Next 6 months</span>
          </div>
          {cfProjections.length > 0 ? (
            <>
              <div style={{ display: "flex", gap: 16, marginBottom: 12 }}>
                <span style={{ fontSize: 11, display: "flex", alignItems: "center", gap: 4 }}>
                  <span style={{ width: 10, height: 10, borderRadius: 2, background: "var(--accent-green)", display: "inline-block" }} />
                  Inflow
                </span>
                <span style={{ fontSize: 11, display: "flex", alignItems: "center", gap: 4 }}>
                  <span style={{ width: 10, height: 10, borderRadius: 2, background: "var(--accent-red)", display: "inline-block" }} />
                  Outflow
                </span>
              </div>
              <div className="chart-bars">
                {cfProjections.map((p) => (
                  <div key={p.month} className="chart-bar-wrapper" style={{ gap: 4 }}>
                    <div style={{ display: "flex", gap: 3, alignItems: "flex-end", height: "100%" }}>
                      <div
                        className="chart-bar revenue"
                        style={{ height: `${Math.max((p.inflow / cfMax) * 100, 3)}%`, width: 16 }}
                        title={`Inflow: ${formatCurrency(p.inflow)}`}
                      />
                      <div
                        className="chart-bar expense"
                        style={{ height: `${Math.max((p.outflow / cfMax) * 100, 3)}%`, width: 16 }}
                        title={`Outflow: ${formatCurrency(p.outflow)}`}
                      />
                    </div>
                    <span className="chart-bar-label">{p.month.split(" ")[0]}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="empty-state" style={{ padding: 40 }}>
              <BarChart3 size={32} style={{ opacity: 0.3 }} />
              <p style={{ marginTop: 8 }}>Add data to see projections</p>
            </div>
          )}
        </div>

        <div className="chart-container">
          <div className="chart-header">
            <h3><PieChart size={16} style={{ display: "inline", verticalAlign: "middle", marginRight: 6 }} />Top Expenses</h3>
            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>This month</span>
          </div>
          {expenseCategories.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {expenseCategories.map((cat, i) => {
                const pct = Math.round((cat.amount / expTotal) * 100);
                return (
                  <div key={cat.label}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, fontSize: 13 }}>
                      <span style={{ fontWeight: 500 }}>{cat.label}</span>
                      <span style={{ color: "var(--text-secondary)" }}>{formatCurrency(cat.amount)}</span>
                    </div>
                    <div style={{
                      height: 6,
                      borderRadius: 3,
                      background: "var(--bg-tertiary, rgba(255,255,255,0.06))",
                      overflow: "hidden",
                    }}>
                      <div style={{
                        height: "100%",
                        width: `${pct}%`,
                        borderRadius: 3,
                        background: categoryColors[i % categoryColors.length],
                        transition: "width 0.6s ease-out",
                      }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="empty-state" style={{ padding: 40 }}>
              <PieChart size={32} style={{ opacity: 0.3 }} />
              <p style={{ marginTop: 8 }}>No expenses this month</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
