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
  PieChart as PieChartIcon,
  BarChart3,
} from "lucide-react";
import { SkeletonKPI } from "@/components/skeleton";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
  Cell,
  PieChart,
  Pie,
} from "recharts";

interface DashboardData {
  monthlyRevenue: number;
  burnRate: number;
  runwayMonths: number;
  outstandingInvoices: { count: number; total: number };
  totalExpensesThisMonth: number;
  revenueGrowth: number;
  burnRateDetails: { trend: string; average3Month: number };
  runway: { projectedRunOutDate?: string; cashInBank: number };
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

const CHART_COLORS = ["#6366F1", "#A855F7", "#EC4899", "#F59E0B", "#22C55E", "#3B82F6"];

const formatINR = (n: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);

const formatShort = (n: number) => {
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(1)}Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(0)}K`;
  return `₹${n}`;
};

/* eslint-disable @typescript-eslint/no-explicit-any */
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border-color)",
        borderRadius: 8,
        padding: "10px 14px",
        boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
      }}
    >
      <p style={{ margin: 0, fontSize: 12, color: "var(--text-secondary)", marginBottom: 6 }}>
        {label}
      </p>
      {payload.map((p: any) => (
        <p
          key={p.name}
          style={{ margin: 0, fontSize: 13, fontWeight: 600, color: p.color }}
        >
          {p.name}: {formatINR(p.value)}
        </p>
      ))}
    </div>
  );
}
/* eslint-enable @typescript-eslint/no-explicit-any */

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
      value: formatINR(data?.monthlyRevenue ?? 0),
      change: data?.revenueGrowth ?? 0,
      color: "green" as const,
      icon: <TrendingUp size={20} />,
      sub: `ARR ${formatINR(data?.revenueDetails?.currentARR ?? 0)}`,
    },
    {
      label: "Burn Rate",
      value: formatINR(data?.burnRate ?? 0),
      change: null,
      color: "red" as const,
      icon: <Flame size={20} />,
      sub: `Trend: ${data?.burnRateDetails?.trend ?? "stable"}`,
    },
    {
      label: "Runway",
      value: data?.runwayMonths === Infinity ? "∞" : `${data?.runwayMonths ?? 0} mo`,
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
      sub: formatINR(data?.outstandingInvoices?.total ?? 0),
    },
  ];

  const history = data?.revenueDetails?.history ?? [];
  const cfProjections = cashFlow?.projections ?? [];
  const expenseCategories = (pnl?.expenses ?? []).slice(0, 6);
  const expTotal = pnl?.totalExpenses || 1;

  // Pie chart data
  const pieData = expenseCategories.map((cat, i) => ({
    name: cat.label,
    value: cat.amount,
    color: CHART_COLORS[i % CHART_COLORS.length],
  }));

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
                <span className={`kpi-change ${kpi.change > 0 ? "up" : kpi.change < 0 ? "down" : "neutral"}`}>
                  {kpi.change > 0 ? <ArrowUpRight size={12} /> : kpi.change < 0 ? <ArrowDownRight size={12} /> : <Minus size={12} />}
                  {Math.abs(kpi.change)}%
                </span>
              )}
              <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{kpi.sub}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row 1: Revenue Trend + Quick Actions */}
      <div className="section-grid">
        <div className="chart-container">
          <div className="chart-header">
            <h3><DollarSign size={16} style={{ display: "inline", verticalAlign: "middle", marginRight: 4 }} />Revenue Trend</h3>
            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Last 6 months</span>
          </div>
          {history.length > 0 ? (
            <div style={{ width: "100%", height: 220 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={history} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366F1" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: "var(--text-secondary)" }} tickFormatter={(v) => v.slice(5)} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "var(--text-secondary)" }} tickFormatter={formatShort} axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTooltip />} />
                  <Area type="monotone" dataKey="amount" name="Revenue" stroke="#6366F1" strokeWidth={2.5} fill="url(#revenueGrad)" dot={{ r: 4, fill: "#6366F1", strokeWidth: 0 }} activeDot={{ r: 6 }} />
                </AreaChart>
              </ResponsiveContainer>
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
            marginTop: 24, padding: 16,
            background: "var(--bg-input)", borderRadius: "var(--radius-md)",
          }}>
            <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>CASH IN BANK</p>
            <p style={{ fontSize: 24, fontWeight: 800, letterSpacing: -1 }}>
              {formatINR(data?.runway?.cashInBank ?? 0)}
            </p>
          </div>
        </div>
      </div>

      {/* Charts Row 2: Cash Flow Projection + Expense Breakdown */}
      <div className="section-grid" style={{ marginTop: 24 }}>
        <div className="chart-container">
          <div className="chart-header">
            <h3><BarChart3 size={16} style={{ display: "inline", verticalAlign: "middle", marginRight: 4 }} />Cash Flow Projection</h3>
            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Next 6 months</span>
          </div>
          {cfProjections.length > 0 ? (
            <div style={{ width: "100%", height: 220 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={cfProjections} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: "var(--text-secondary)" }} tickFormatter={(v) => v.split(" ")[0]} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "var(--text-secondary)" }} tickFormatter={formatShort} axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTooltip />} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="inflow" name="Inflow" fill="#22C55E" radius={[4, 4, 0, 0]} barSize={16} />
                  <Bar dataKey="outflow" name="Outflow" fill="#F43F5E" radius={[4, 4, 0, 0]} barSize={16} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="empty-state" style={{ padding: 40 }}>
              <BarChart3 size={32} style={{ opacity: 0.3 }} />
              <p style={{ marginTop: 8 }}>Add data to see projections</p>
            </div>
          )}
        </div>

        <div className="chart-container">
          <div className="chart-header">
            <h3><PieChartIcon size={16} style={{ display: "inline", verticalAlign: "middle", marginRight: 4 }} />Top Expenses</h3>
            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>This month</span>
          </div>
          {pieData.length > 0 ? (
            <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
              <div style={{ width: 140, height: 140, flexShrink: 0 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={35}
                      outerRadius={60}
                      paddingAngle={3}
                      strokeWidth={0}
                    >
                      {pieData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatINR(Number(value))} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
                {expenseCategories.map((cat, i) => {
                  const pct = Math.round((cat.amount / expTotal) * 100);
                  return (
                    <div key={cat.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12 }}>
                      <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ width: 8, height: 8, borderRadius: "50%", background: CHART_COLORS[i % CHART_COLORS.length], display: "inline-block", flexShrink: 0 }} />
                        <span style={{ fontWeight: 500 }}>{cat.label}</span>
                      </span>
                      <span style={{ color: "var(--text-secondary)", whiteSpace: "nowrap" }}>{pct}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="empty-state" style={{ padding: 40 }}>
              <PieChartIcon size={32} style={{ opacity: 0.3 }} />
              <p style={{ marginTop: 8 }}>No expenses this month</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
