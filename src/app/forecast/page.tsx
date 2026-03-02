"use client";

import { useState, useEffect } from "react";
import { TrendingUp, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LineChart, Line, ReferenceLine } from "recharts";

interface MonthData {
  month: string; label: string; revenue: number; expenses: number;
  profit: number; isForecasted?: boolean;
}

interface Scenario {
  label: string; monthlyRevenue: number; monthlyExpenses: number;
  monthlyProfit: number; annualProfit: number;
}

interface Metrics {
  avgMonthlyRevenue: number; avgMonthlyExpenses: number;
  avgMonthlyProfit: number; growthRate: number; runway: number;
}

const fmt = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

export default function ForecastPage() {
  const [historical, setHistorical] = useState<MonthData[]>([]);
  const [forecast, setForecast] = useState<MonthData[]>([]);
  const [scenarios, setScenarios] = useState<Record<string, Scenario>>({});
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/forecast").then((r) => r.json()).then((data) => {
      setHistorical(data.historical || []);
      setForecast(data.forecast || []);
      setScenarios(data.scenarios || {});
      setMetrics(data.metrics || null);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const allData = [...historical, ...forecast.map((f) => ({ ...f, isForecasted: true }))];

  return (
    <div>
      <div className="page-header">
        <h2 style={{ display: "flex", alignItems: "center", gap: 8 }}><TrendingUp size={24} /> Financial Forecast</h2>
        <p>Revenue trends, cash flow modeling & scenario analysis</p>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 60, color: "var(--text-secondary)" }}>Loading forecast...</div>
      ) : (
        <>
          {/* KPIs */}
          {metrics && (
            <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)", marginBottom: 24 }}>
              <div className="kpi-card">
                <div className="kpi-label">Avg Revenue/Mo</div>
                <div className="kpi-value" style={{ fontSize: 20 }}>{fmt(metrics.avgMonthlyRevenue)}</div>
              </div>
              <div className="kpi-card">
                <div className="kpi-label">Avg Expenses/Mo</div>
                <div className="kpi-value" style={{ fontSize: 20 }}>{fmt(metrics.avgMonthlyExpenses)}</div>
              </div>
              <div className="kpi-card" style={{ borderColor: metrics.avgMonthlyProfit >= 0 ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)" }}>
                <div className="kpi-label">Avg Profit/Mo</div>
                <div className="kpi-value" style={{ fontSize: 20, color: metrics.avgMonthlyProfit >= 0 ? "#22C55E" : "#EF4444" }}>{fmt(metrics.avgMonthlyProfit)}</div>
              </div>
              <div className="kpi-card">
                <div className="kpi-label">Revenue Growth</div>
                <div className="kpi-value" style={{ fontSize: 20, display: "flex", alignItems: "center", gap: 4 }}>
                  {metrics.growthRate >= 0 ? <ArrowUpRight size={18} color="#22C55E" /> : <ArrowDownRight size={18} color="#EF4444" />}
                  <span style={{ color: metrics.growthRate >= 0 ? "#22C55E" : "#EF4444" }}>{metrics.growthRate}%</span>
                </div>
              </div>
            </div>
          )}

          {/* Revenue & Expense Trend Chart */}
          <div className="chart-container" style={{ marginBottom: 24 }}>
            <div className="chart-header"><h3>Revenue vs Expenses — 6mo history + 6mo forecast</h3></div>
            <div style={{ height: 320 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={allData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="var(--text-tertiary)" />
                  <YAxis tick={{ fontSize: 11 }} stroke="var(--text-tertiary)" tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(value) => fmt(Number(value))} contentStyle={{ background: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: 8, fontSize: 12 }} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                  <ReferenceLine x={historical[historical.length - 1]?.label} stroke="#6366F1" strokeDasharray="3 3" label={{ value: "Today", fill: "#6366F1", fontSize: 11 }} />
                  <Bar dataKey="revenue" name="Revenue" fill="#22C55E" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expenses" name="Expenses" fill="#EF4444" radius={[4, 4, 0, 0]} opacity={0.7} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Profit Trend Line */}
          <div className="chart-container" style={{ marginBottom: 24 }}>
            <div className="chart-header"><h3>Profit Trend & Projection</h3></div>
            <div style={{ height: 240 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={allData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="var(--text-tertiary)" />
                  <YAxis tick={{ fontSize: 11 }} stroke="var(--text-tertiary)" tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(value) => fmt(Number(value))} contentStyle={{ background: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: 8, fontSize: 12 }} />
                  <ReferenceLine y={0} stroke="rgba(255,255,255,0.15)" />
                  <ReferenceLine x={historical[historical.length - 1]?.label} stroke="#6366F1" strokeDasharray="3 3" />
                  <Line type="monotone" dataKey="profit" name="Profit" stroke="#F59E0B" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Scenario Analysis */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 24 }}>
            {Object.entries(scenarios).map(([key, s]) => {
              const colors: Record<string, string> = { optimistic: "#22C55E", base: "#6366F1", conservative: "#EF4444" };
              return (
                <div key={key} className="table-container" style={{ padding: 20 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: colors[key], display: "inline-block" }} />
                    <h4 style={{ margin: 0, fontSize: 13 }}>{s.label}</h4>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>Monthly Revenue</span>
                      <span style={{ fontWeight: 600 }}>{fmt(s.monthlyRevenue)}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>Monthly Expenses</span>
                      <span style={{ fontWeight: 600 }}>{fmt(s.monthlyExpenses)}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 10, borderTop: "1px solid var(--border-color)" }}>
                      <span style={{ fontSize: 12, fontWeight: 700 }}>Monthly Profit</span>
                      <span style={{ fontWeight: 800, color: s.monthlyProfit >= 0 ? "#22C55E" : "#EF4444" }}>{fmt(s.monthlyProfit)}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ fontSize: 12, fontWeight: 700 }}>Annual Projection</span>
                      <span style={{ fontWeight: 800, color: s.annualProfit >= 0 ? "#22C55E" : "#EF4444" }}>{fmt(s.annualProfit)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
