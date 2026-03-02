"use client";

import { useState, useEffect } from "react";
import {
  Repeat,
  Plus,
  X,
  Pause,
  Play,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
} from "lucide-react";
import { useToast } from "@/components/toast";

interface RecurringExpense {
  id: string;
  description: string;
  amount: number;
  frequency: string;
  nextDueDate: string;
  lastCreated: string | null;
  isActive: boolean;
  vendor: string | null;
  categoryId: string | null;
}

interface Category {
  id: string;
  name: string;
}

const fmt = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

const FREQ_LABELS: Record<string, string> = {
  weekly: "Weekly",
  monthly: "Monthly",
  quarterly: "Quarterly",
  yearly: "Yearly",
};

export default function RecurringPage() {
  const { toast } = useToast();
  const [items, setItems] = useState<RecurringExpense[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [processing, setProcessing] = useState(false);

  // Form
  const [desc, setDesc] = useState("");
  const [amount, setAmount] = useState("");
  const [frequency, setFrequency] = useState("monthly");
  const [vendor, setVendor] = useState("");
  const [categoryId, setCategoryId] = useState("");

  async function load() {
    setLoading(true);
    try {
      const [recRes, catRes] = await Promise.all([
        fetch("/api/recurring-expenses").then((r) => r.json()),
        fetch("/api/categories").then((r) => r.json()).catch(() => ({ categories: [] })),
      ]);
      setItems(recRes.recurringExpenses || []);
      setCategories(catRes.categories || catRes || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function create() {
    if (!desc || !amount) return;
    try {
      const res = await fetch("/api/recurring-expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: desc,
          amount: Number(amount),
          frequency,
          vendor: vendor || undefined,
          categoryId: categoryId || undefined,
        }),
      });
      if (!res.ok) {
        toast("Failed to create", "error");
        return;
      }
      toast("Recurring expense created", "success");
      setShowForm(false);
      setDesc(""); setAmount(""); setFrequency("monthly"); setVendor(""); setCategoryId("");
      load();
    } catch (err) {
      console.error(err);
      toast("Failed to create", "error");
    }
  }

  async function deactivate(id: string) {
    try {
      await fetch(`/api/recurring-expenses?id=${id}`, { method: "DELETE" });
      toast("Recurring expense paused", "success");
      load();
    } catch (err) {
      console.error(err);
    }
  }

  async function processDue() {
    setProcessing(true);
    try {
      const res = await fetch("/api/recurring-expenses", { method: "PATCH" });
      const data = await res.json();
      toast(`${data.processed} expenses created`, "success");
      load();
    } catch (err) {
      console.error(err);
      toast("Failed to process", "error");
    } finally {
      setProcessing(false);
    }
  }

  const active = items.filter((i) => i.isActive);
  const paused = items.filter((i) => !i.isActive);
  const monthlyTotal = active.reduce((sum, i) => {
    const multiplier = i.frequency === "weekly" ? 4.33 : i.frequency === "quarterly" ? 1 / 3 : i.frequency === "yearly" ? 1 / 12 : 1;
    return sum + i.amount * multiplier;
  }, 0);

  const dueCount = active.filter((i) => new Date(i.nextDueDate) <= new Date()).length;

  return (
    <div>
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h2 style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Repeat size={24} /> Recurring Expenses
          </h2>
          <p>Subscriptions, rent, salaries — automated</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {dueCount > 0 && (
            <button className="btn btn-secondary" onClick={processDue} disabled={processing}>
              <RefreshCw size={16} className={processing ? "spin" : ""} />
              Process {dueCount} Due
            </button>
          )}
          <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
            <Plus size={16} /> Add Recurring
          </button>
        </div>
      </div>

      {/* Create Form */}
      {showForm && (
        <div style={{
          padding: 24, marginBottom: 24, background: "var(--bg-card)",
          borderRadius: 12, border: "1px solid var(--border-color)",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
            <h3 style={{ margin: 0 }}>New Recurring Expense</h3>
            <button style={{ background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer" }} onClick={() => setShowForm(false)}>
              <X size={18} />
            </button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 4, display: "block" }}>Description *</label>
              <input className="input" value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="e.g. AWS Hosting" />
            </div>
            <div>
              <label style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 4, display: "block" }}>Amount (₹) *</label>
              <input className="input" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="30000" />
            </div>
            <div>
              <label style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 4, display: "block" }}>Frequency</label>
              <select className="input" value={frequency} onChange={(e) => setFrequency(e.target.value)}>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 4, display: "block" }}>Vendor</label>
              <input className="input" value={vendor} onChange={(e) => setVendor(e.target.value)} placeholder="e.g. Amazon Web Services" />
            </div>
            <div>
              <label style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 4, display: "block" }}>Category</label>
              <select className="input" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                <option value="">Select category</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>
          <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end" }}>
            <button className="btn btn-primary" onClick={create} disabled={!desc || !amount}>Create</button>
          </div>
        </div>
      )}

      {/* KPIs */}
      <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)", marginBottom: 24 }}>
        <div className="kpi-card">
          <div className="kpi-label">Active Subscriptions</div>
          <div className="kpi-value" style={{ fontSize: 28 }}>{active.length}</div>
        </div>
        <div className="kpi-card amber">
          <div className="kpi-label">Monthly Commitment</div>
          <div className="kpi-value" style={{ fontSize: 22 }}>{fmt(monthlyTotal)}</div>
        </div>
        <div className="kpi-card" style={{ borderColor: dueCount > 0 ? "rgba(239,68,68,0.3)" : "rgba(34,197,94,0.2)" }}>
          <div className="kpi-label">Due Now</div>
          <div className="kpi-value" style={{ fontSize: 28, color: dueCount > 0 ? "var(--accent-red)" : "var(--accent-green)" }}>
            {dueCount}
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Annual Cost</div>
          <div className="kpi-value" style={{ fontSize: 22 }}>{fmt(monthlyTotal * 12)}</div>
        </div>
      </div>

      {/* Active Items */}
      {loading ? (
        <div style={{ textAlign: "center", padding: 40, color: "var(--text-secondary)" }}>Loading...</div>
      ) : active.length === 0 && paused.length === 0 ? (
        <div style={{
          textAlign: "center", padding: 60, background: "var(--bg-card)",
          borderRadius: 16, border: "1px solid var(--border-color)",
        }}>
          <Repeat size={40} style={{ opacity: 0.3, marginBottom: 12 }} />
          <h3 style={{ margin: "0 0 8px" }}>No recurring expenses</h3>
          <p style={{ color: "var(--text-secondary)", margin: 0 }}>
            Add subscriptions, rent, and other recurring costs to automate expense tracking
          </p>
        </div>
      ) : (
        <>
          {active.length > 0 && (
            <div className="table-container" style={{ marginBottom: 24 }}>
              <div className="table-header">
                <h3><Play size={16} style={{ display: "inline", verticalAlign: "middle", marginRight: 6 }} />Active ({active.length})</h3>
              </div>
              <table>
                <thead>
                  <tr>
                    <th>Description</th>
                    <th>Vendor</th>
                    <th style={{ textAlign: "right" }}>Amount</th>
                    <th>Frequency</th>
                    <th>Next Due</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {active.map((item) => {
                    const isDue = new Date(item.nextDueDate) <= new Date();
                    return (
                      <tr key={item.id}>
                        <td style={{ fontWeight: 500 }}>{item.description}</td>
                        <td style={{ color: "var(--text-secondary)" }}>{item.vendor || "—"}</td>
                        <td style={{ textAlign: "right", fontWeight: 600 }}>{fmt(item.amount)}</td>
                        <td>
                          <span style={{
                            padding: "2px 8px", borderRadius: 4, fontSize: 11, fontWeight: 600,
                            background: "rgba(99,102,241,0.15)", color: "#818CF8",
                          }}>
                            {FREQ_LABELS[item.frequency] || item.frequency}
                          </span>
                        </td>
                        <td>
                          <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13 }}>
                            <Calendar size={12} />
                            {new Date(item.nextDueDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                          </span>
                        </td>
                        <td>
                          {isDue ? (
                            <span style={{ display: "flex", alignItems: "center", gap: 4, color: "#F43F5E", fontSize: 12, fontWeight: 600 }}>
                              <AlertTriangle size={12} /> Due
                            </span>
                          ) : (
                            <span style={{ display: "flex", alignItems: "center", gap: 4, color: "#22C55E", fontSize: 12 }}>
                              <CheckCircle2 size={12} /> Scheduled
                            </span>
                          )}
                        </td>
                        <td>
                          <button
                            onClick={() => deactivate(item.id)}
                            style={{ background: "none", border: "none", color: "var(--text-tertiary)", cursor: "pointer", padding: 4 }}
                            title="Pause"
                          >
                            <Pause size={14} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {paused.length > 0 && (
            <div className="table-container" style={{ opacity: 0.6 }}>
              <div className="table-header">
                <h3><Pause size={16} style={{ display: "inline", verticalAlign: "middle", marginRight: 6 }} />Paused ({paused.length})</h3>
              </div>
              <table>
                <thead>
                  <tr>
                    <th>Description</th>
                    <th>Vendor</th>
                    <th style={{ textAlign: "right" }}>Amount</th>
                    <th>Frequency</th>
                  </tr>
                </thead>
                <tbody>
                  {paused.map((item) => (
                    <tr key={item.id}>
                      <td>{item.description}</td>
                      <td style={{ color: "var(--text-secondary)" }}>{item.vendor || "—"}</td>
                      <td style={{ textAlign: "right" }}>{fmt(item.amount)}</td>
                      <td>{FREQ_LABELS[item.frequency] || item.frequency}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
