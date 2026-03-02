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
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";

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

const CHART_COLORS = ["#6366F1", "#A855F7", "#EC4899", "#F43F5E", "#F59E0B", "#22C55E", "#3B82F6", "#14B8A6"];

const fmt = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

const fmtShort = (n: number) => {
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(1)}Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(0)}K`;
  return `₹${n}`;
};

/* eslint-disable @typescript-eslint/no-explicit-any */
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "var(--bg-card)", border: "1px solid var(--border-color)",
      borderRadius: 8, padding: "10px 14px", boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
    }}>
      <p style={{ margin: 0, fontSize: 12, color: "var(--text-secondary)", marginBottom: 6 }}>{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ margin: 0, fontSize: 13, fontWeight: 600, color: p.color }}>
          {p.name}: {fmt(p.value)}
        </p>
      ))}
    </div>
  );
}
/* eslint-enable @typescript-eslint/no-explicit-any */

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

  const downloadCSV = () => {
    window.open("/api/reports/pnl/csv", "_blank");
    toast("Downloading P&L CSV...", "info");
  };

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "pnl", label: "Profit & Loss", icon: <BarChart3 size={16} /> },
    { id: "cashflow", label: "Cash Flow", icon: <TrendingUp size={16} /> },
    { id: "tax", label: "GST Summary", icon: <Calculator size={16} /> },
  ];

  // P&L combined chart data
  const pnlChartData = pnl ? [
    ...pnl.revenue.map((r) => ({ name: r.label, type: "Revenue", amount: r.amount })),
    ...pnl.expenses.map((e) => ({ name: e.label, type: "Expense", amount: e.amount })),
  ] : [];

  // Tax pie data
  const taxPieData = tax ? [
    { name: "Output Tax", value: tax.outputTax, color: "#F59E0B" },
    { name: "Input Credit", value: tax.inputTaxCredit, color: "#22C55E" },
  ] : [];

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
                  <div className="kpi-value" style={{ fontSize: 22 }}>{pnl.profitMargin.toFixed(1)}%</div>
                </div>
              </div>

              {/* Revenue vs Expenses Chart */}
              <div className="section-grid" style={{ marginBottom: 24 }}>
                <div className="chart-container">
                  <div className="chart-header">
                    <h3><DollarSign size={16} style={{ display: "inline", verticalAlign: "middle", marginRight: 6 }} />Revenue Breakdown</h3>
                  </div>
                  {pnl.revenue.length > 0 ? (
                    <div style={{ width: "100%", height: 240 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={pnl.revenue} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" horizontal={false} />
                          <XAxis type="number" tick={{ fontSize: 11, fill: "var(--text-secondary)" }} tickFormatter={fmtShort} axisLine={false} tickLine={false} />
                          <YAxis type="category" dataKey="label" tick={{ fontSize: 12, fill: "var(--text-primary)" }} width={100} axisLine={false} tickLine={false} />
                          <Tooltip content={<ChartTooltip />} />
                          <Bar dataKey="amount" name="Revenue" fill="#22C55E" radius={[0, 6, 6, 0]} barSize={20} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="empty-state" style={{ padding: 40 }}>
                      <p style={{ color: "var(--text-muted)" }}>No revenue data</p>
                    </div>
                  )}
                </div>

                <div className="chart-container">
                  <div className="chart-header">
                    <h3><Landmark size={16} style={{ display: "inline", verticalAlign: "middle", marginRight: 6 }} />Expense Breakdown</h3>
                  </div>
                  {pnl.expenses.length > 0 ? (
                    <div style={{ width: "100%", height: 240 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={pnl.expenses} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" horizontal={false} />
                          <XAxis type="number" tick={{ fontSize: 11, fill: "var(--text-secondary)" }} tickFormatter={fmtShort} axisLine={false} tickLine={false} />
                          <YAxis type="category" dataKey="label" tick={{ fontSize: 12, fill: "var(--text-primary)" }} width={100} axisLine={false} tickLine={false} />
                          <Tooltip content={<ChartTooltip />} />
                          <Bar dataKey="amount" name="Expense" radius={[0, 6, 6, 0]} barSize={20}>
                            {pnl.expenses.map((_: unknown, i: number) => (
                              <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="empty-state" style={{ padding: 40 }}>
                      <p style={{ color: "var(--text-muted)" }}>No expense data</p>
                    </div>
                  )}
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

              {/* Cash Flow AreaChart */}
              <div className="chart-container" style={{ marginBottom: 24 }}>
                <div className="chart-header">
                  <h3>Monthly Cash Flow</h3>
                </div>
                {cashFlow.projections.length > 0 ? (
                  <div style={{ width: "100%", height: 280 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={cashFlow.projections} margin={{ top: 8, right: 16, left: -10, bottom: 0 }}>
                        <defs>
                          <linearGradient id="inflowGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#22C55E" stopOpacity={0.2} />
                            <stop offset="95%" stopColor="#22C55E" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="outflowGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#F43F5E" stopOpacity={0.2} />
                            <stop offset="95%" stopColor="#F43F5E" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                        <XAxis dataKey="month" tick={{ fontSize: 11, fill: "var(--text-secondary)" }} tickFormatter={(v) => v.split(" ")[0]} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 11, fill: "var(--text-secondary)" }} tickFormatter={fmtShort} axisLine={false} tickLine={false} />
                        <Tooltip content={<ChartTooltip />} />
                        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                        <Area type="monotone" dataKey="inflow" name="Inflow" stroke="#22C55E" strokeWidth={2} fill="url(#inflowGrad)" dot={{ r: 3, fill: "#22C55E", strokeWidth: 0 }} />
                        <Area type="monotone" dataKey="outflow" name="Outflow" stroke="#F43F5E" strokeWidth={2} fill="url(#outflowGrad)" dot={{ r: 3, fill: "#F43F5E", strokeWidth: 0 }} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="empty-state" style={{ padding: 40 }}>
                    <p style={{ color: "var(--text-muted)" }}>No projections available</p>
                  </div>
                )}
              </div>

              {/* Cash Flow Table */}
              <div className="table-container">
                <div className="table-header"><h3>Monthly Breakdown</h3></div>
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
                <div className="kpi-card" style={{ borderColor: tax.netPayable > 0 ? "rgba(239,68,68,0.2)" : "rgba(34,197,94,0.2)" }}>
                  <div className="kpi-label">Net GST Payable</div>
                  <div className="kpi-value" style={{ fontSize: 22, color: tax.netPayable > 0 ? "var(--accent-red)" : "var(--accent-green)" }}>
                    {fmt(tax.netPayable)}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                    {tax.netPayable > 0 ? "Payable to government" : "Credit available"}
                  </div>
                </div>
              </div>

              <div className="section-grid">
                {/* GST Pie Chart */}
                <div className="chart-container">
                  <div className="chart-header"><h3>GST Breakdown</h3></div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <div style={{ width: 200, height: 200 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={taxPieData}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={80}
                            paddingAngle={4}
                            strokeWidth={0}
                          >
                            {taxPieData.map((entry, i) => (
                              <Cell key={i} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value) => fmt(Number(value))} />
                          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                {/* GST Computation */}
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
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
