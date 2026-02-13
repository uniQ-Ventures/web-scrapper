"use client";

import { useState, useEffect } from "react";
import { Plus, X, TrendingUp, DollarSign, ArrowUpRight, ArrowDownRight, Minus, BarChart3 } from "lucide-react";
import { useToast } from "@/components/toast";
import { SkeletonTable } from "@/components/skeleton";

interface Revenue {
  id: string;
  month: string;
  amount: string;
  type: string;
  source?: string;
  client?: { name: string };
}

interface MrrData {
  mrr: number;
  arr: number;
  burnRate?: { currentMonth: number; previousMonth: number; trend: string };
  runway?: { runwayMonths: number; cashInBank: number };
}

export default function RevenuePage() {
  const { toast } = useToast();
  const [revenues, setRevenues] = useState<Revenue[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [amount, setAmount] = useState("");
  const [type, setType] = useState("recurring");
  const [source, setSource] = useState("");
  const [mrrData, setMrrData] = useState<MrrData | null>(null);

  useEffect(() => {
    loadRevenue();
    loadMrrData();
  }, []);

  const loadRevenue = () => {
    fetch("/api/revenue")
      .then((res) => res.json())
      .then((d) => {
        setRevenues(d.revenues || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  const loadMrrData = () => {
    fetch("/api/v1/copilot/query", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: "getRunway" }),
    })
      .then((res) => res.json())
      .then((d) => setMrrData(d.data || d))
      .catch(() => { });
  };

  const createRevenue = async () => {
    if (!month || !amount) return;

    await fetch("/api/revenue", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        month: `${month}-01`,
        amount: Number(amount),
        type,
        source,
      }),
    });
    setShowCreate(false);
    setAmount("");
    setSource("");
    loadRevenue();
    loadMrrData();
    toast("Revenue recorded", "success");
  };

  const formatCurrency = (n: number | string) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(Number(n));

  const totalRevenue = revenues.reduce((sum, r) => sum + Number(r.amount), 0);
  const recurringRevenue = revenues
    .filter((r) => r.type === "recurring")
    .reduce((sum, r) => sum + Number(r.amount), 0);
  const oneTimeRevenue = revenues
    .filter((r) => r.type === "one-time")
    .reduce((sum, r) => sum + Number(r.amount), 0);

  const currentMRR = mrrData?.mrr ?? recurringRevenue;
  const currentARR = mrrData?.arr ?? recurringRevenue * 12;

  const groupedByMonth = revenues.reduce(
    (acc, r) => {
      const key = new Date(r.month).toISOString().slice(0, 7);
      acc[key] = (acc[key] || 0) + Number(r.amount);
      return acc;
    },
    {} as Record<string, number>
  );

  const recurringByMonth = revenues
    .filter((r) => r.type === "recurring")
    .reduce(
      (acc, r) => {
        const key = new Date(r.month).toISOString().slice(0, 7);
        acc[key] = (acc[key] || 0) + Number(r.amount);
        return acc;
      },
      {} as Record<string, number>
    );

  const sortedMonths = Object.entries(groupedByMonth)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6);
  const maxVal = Math.max(...sortedMonths.map(([, v]) => v), 1);

  const sortedMrrMonths = Object.entries(recurringByMonth)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6);
  const maxMrr = Math.max(...sortedMrrMonths.map(([, v]) => v), 1);

  const mrrGrowth = sortedMrrMonths.length >= 2
    ? ((sortedMrrMonths[sortedMrrMonths.length - 1][1] - sortedMrrMonths[sortedMrrMonths.length - 2][1]) / sortedMrrMonths[sortedMrrMonths.length - 2][1]) * 100
    : 0;

  return (
    <div>
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h2>Revenue</h2>
          <p>Track your MRR, ARR, and revenue growth</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
          <Plus size={16} /> Record Revenue
        </button>
      </div>

      {/* MRR / ARR KPIs */}
      <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)", marginBottom: 24 }}>
        <div className="kpi-card green">
          <div className="kpi-icon green"><DollarSign size={20} /></div>
          <div className="kpi-label">Total Revenue</div>
          <div className="kpi-value" style={{ fontSize: 24 }}>{formatCurrency(totalRevenue)}</div>
        </div>
        <div className="kpi-card purple">
          <div className="kpi-icon purple"><TrendingUp size={20} /></div>
          <div className="kpi-label">Current MRR</div>
          <div className="kpi-value" style={{ fontSize: 24 }}>{formatCurrency(currentMRR)}</div>
          {mrrGrowth !== 0 && (
            <span className={`kpi-change ${mrrGrowth > 0 ? "up" : mrrGrowth < 0 ? "down" : "neutral"}`}>
              {mrrGrowth > 0 ? <ArrowUpRight size={12} /> : mrrGrowth < 0 ? <ArrowDownRight size={12} /> : <Minus size={12} />}
              {Math.abs(Math.round(mrrGrowth))}%
            </span>
          )}
        </div>
        <div className="kpi-card blue">
          <div className="kpi-icon blue"><BarChart3 size={20} /></div>
          <div className="kpi-label">Current ARR</div>
          <div className="kpi-value" style={{ fontSize: 24 }}>{formatCurrency(currentARR)}</div>
        </div>
        <div className="kpi-card amber">
          <div className="kpi-label">One-Time Revenue</div>
          <div className="kpi-value" style={{ fontSize: 24 }}>{formatCurrency(oneTimeRevenue)}</div>
        </div>
      </div>

      {/* MRR Trend Chart */}
      {sortedMrrMonths.length > 0 && (
        <div className="chart-container" style={{ marginBottom: 24 }}>
          <div className="chart-header">
            <h3>MRR Trend</h3>
            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Last {sortedMrrMonths.length} months</span>
          </div>
          <div className="chart-bars">
            {sortedMrrMonths.map(([m, v]) => (
              <div key={m} className="chart-bar-wrapper">
                <div
                  className="chart-bar"
                  style={{
                    height: `${Math.max((v / maxMrr) * 100, 3)}%`,
                    background: "linear-gradient(180deg, var(--brand-primary), rgba(108, 92, 231, 0.4))",
                  }}
                  title={`MRR: ${formatCurrency(v)}`}
                />
                <span className="chart-bar-label">{m.slice(5)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Revenue Chart */}
      <div className="chart-container" style={{ marginBottom: 24 }}>
        <div className="chart-header">
          <h3>Monthly Revenue</h3>
        </div>
        {sortedMonths.length > 0 ? (
          <div className="chart-bars">
            {sortedMonths.map(([m, v]) => (
              <div key={m} className="chart-bar-wrapper">
                <div
                  className="chart-bar revenue"
                  style={{ height: `${Math.max((v / maxVal) * 100, 3)}%` }}
                  title={formatCurrency(v)}
                />
                <span className="chart-bar-label">{m.slice(5)}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state" style={{ padding: 32 }}>
            <p>No revenue data yet</p>
          </div>
        )}
      </div>

      {/* Revenue List */}
      <div className="table-container">
        <div className="table-header">
          <h3>Revenue Records</h3>
        </div>
        <table>
          <thead>
            <tr>
              <th>Month</th>
              <th>Type</th>
              <th>Source</th>
              <th>Client</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5}><SkeletonTable rows={4} /></td></tr>
            ) : revenues.length === 0 ? (
              <tr>
                <td colSpan={5}>
                  <div className="empty-state" style={{ padding: 60 }}>
                    <div style={{
                      width: 56, height: 56, borderRadius: "50%",
                      background: "rgba(34, 197, 94, 0.1)",
                      display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16,
                    }}>
                      <TrendingUp size={24} style={{ color: "var(--accent-green)" }} />
                    </div>
                    <h3>No revenue recorded</h3>
                    <p>Start tracking your monthly recurring revenue</p>
                    <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
                      <Plus size={16} /> Record Revenue
                    </button>
                  </div>
                </td>
              </tr>
            ) : (
              revenues.map((rev) => (
                <tr key={rev.id}>
                  <td style={{ fontWeight: 600 }}>
                    {new Date(rev.month).toLocaleDateString("en-IN", { month: "long", year: "numeric" })}
                  </td>
                  <td>
                    <span className={`badge ${rev.type === "recurring" ? "sent" : "draft"}`}>
                      {rev.type}
                    </span>
                  </td>
                  <td style={{ color: "var(--text-secondary)" }}>{rev.source || "—"}</td>
                  <td>{rev.client?.name || "—"}</td>
                  <td style={{ fontWeight: 700, color: "var(--accent-green)" }}>
                    {formatCurrency(rev.amount)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Create Revenue Modal */}
      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Record Revenue</h3>
              <button className="btn btn-ghost" onClick={() => setShowCreate(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Month</label>
                <input
                  className="form-input"
                  type="month"
                  value={month}
                  onChange={(e) => setMonth(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Amount (₹)</label>
                <input
                  className="form-input"
                  type="number"
                  placeholder="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Type</label>
                <select className="form-input" value={type} onChange={(e) => setType(e.target.value)}>
                  <option value="recurring">Recurring (MRR)</option>
                  <option value="one-time">One-Time</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Source</label>
                <input
                  className="form-input"
                  placeholder="e.g., Product, Consulting"
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                />
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={createRevenue}>
                <TrendingUp size={16} /> Record
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
