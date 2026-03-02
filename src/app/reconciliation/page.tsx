"use client";

import { useState, useEffect } from "react";
import {
  GitMerge,
  Check,
  X,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  RefreshCw,
  Link2,
} from "lucide-react";
import { useToast } from "@/components/toast";

interface Suggestion {
  type: string;
  id: string;
  description: string;
  amount: number;
  date: string;
  confidence: number;
}

interface UnmatchedTxn {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: string;
  category: string | null;
  suggestions: Suggestion[];
  bestMatch: Suggestion | null;
}

interface Summary {
  totalUnmatched: number;
  withSuggestions: number;
  autoMatchable: number;
}

const fmt = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

export default function ReconciliationPage() {
  const { toast } = useToast();
  const [items, setItems] = useState<UnmatchedTxn[]>([]);
  const [summary, setSummary] = useState<Summary>({ totalUnmatched: 0, withSuggestions: 0, autoMatchable: 0 });
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/reconciliation");
      const data = await res.json();
      setItems(data.unmatched || []);
      setSummary(data.summary || { totalUnmatched: 0, withSuggestions: 0, autoMatchable: 0 });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function confirmMatch(txnId: string, matchType: string, matchId: string) {
    try {
      await fetch("/api/reconciliation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transactionId: txnId, matchType, matchId }),
      });
      toast("Transaction reconciled", "success");
      setItems((prev) => prev.filter((i) => i.id !== txnId));
      setSummary((prev) => ({ ...prev, totalUnmatched: prev.totalUnmatched - 1 }));
    } catch (err) {
      console.error(err);
      toast("Failed to reconcile", "error");
    }
  }

  async function dismissTxn(txnId: string) {
    try {
      await fetch("/api/reconciliation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transactionId: txnId }),
      });
      toast("Marked as reconciled", "success");
      setItems((prev) => prev.filter((i) => i.id !== txnId));
      setSummary((prev) => ({ ...prev, totalUnmatched: prev.totalUnmatched - 1 }));
    } catch (err) {
      console.error(err);
    }
  }

  async function autoMatchAll() {
    const autoItems = items.filter((i) => i.bestMatch && i.bestMatch.confidence >= 0.9);
    let matched = 0;
    for (const item of autoItems) {
      try {
        await fetch("/api/reconciliation", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            transactionId: item.id,
            matchType: item.bestMatch!.type,
            matchId: item.bestMatch!.id,
          }),
        });
        matched++;
      } catch { /* skip */ }
    }
    toast(`${matched} transactions auto-reconciled`, "success");
    load();
  }

  return (
    <div>
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h2 style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <GitMerge size={24} /> Reconciliation
          </h2>
          <p>Match bank transactions to expenses and invoices</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-secondary" onClick={load}>
            <RefreshCw size={16} /> Refresh
          </button>
          {summary.autoMatchable > 0 && (
            <button className="btn btn-primary" onClick={autoMatchAll}>
              <Link2 size={16} /> Auto-Match {summary.autoMatchable}
            </button>
          )}
        </div>
      </div>

      {/* KPIs */}
      <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)", marginBottom: 24 }}>
        <div className="kpi-card" style={{ borderColor: summary.totalUnmatched > 0 ? "rgba(234,179,8,0.3)" : "rgba(34,197,94,0.2)" }}>
          <div className="kpi-label">Unmatched</div>
          <div className="kpi-value" style={{ fontSize: 28 }}>{summary.totalUnmatched}</div>
        </div>
        <div className="kpi-card green">
          <div className="kpi-label">With Suggestions</div>
          <div className="kpi-value" style={{ fontSize: 28 }}>{summary.withSuggestions}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Auto-Matchable (90%+)</div>
          <div className="kpi-value" style={{ fontSize: 28, color: "#6366F1" }}>{summary.autoMatchable}</div>
        </div>
      </div>

      {/* Transaction List */}
      {loading ? (
        <div style={{ textAlign: "center", padding: 40, color: "var(--text-secondary)" }}>Loading transactions...</div>
      ) : items.length === 0 ? (
        <div style={{
          textAlign: "center", padding: 60, background: "var(--bg-card)",
          borderRadius: 16, border: "1px solid var(--border-color)",
        }}>
          <CheckCircle2 size={48} style={{ color: "#22C55E", marginBottom: 12 }} />
          <h3 style={{ margin: "0 0 8px" }}>All Reconciled!</h3>
          <p style={{ color: "var(--text-secondary)", margin: 0 }}>
            All bank transactions have been matched. Import more transactions to continue.
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {items.map((txn) => (
            <div
              key={txn.id}
              style={{
                padding: 20, background: "var(--bg-card)", borderRadius: 12,
                border: `1px solid ${txn.bestMatch ? "rgba(99,102,241,0.2)" : "var(--border-color)"}`,
              }}
            >
              {/* Transaction Header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{
                      padding: "2px 6px", borderRadius: 4, fontSize: 10, fontWeight: 700, letterSpacing: 0.5,
                      background: txn.type === "credit" ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)",
                      color: txn.type === "credit" ? "#22C55E" : "#F43F5E",
                    }}>
                      {txn.type === "credit" ? "IN" : "OUT"}
                    </span>
                    <span style={{ fontWeight: 600, fontSize: 14 }}>{txn.description}</span>
                  </div>
                  <div style={{ display: "flex", gap: 12, marginTop: 4, fontSize: 12, color: "var(--text-secondary)" }}>
                    <span>{new Date(txn.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
                    {txn.category && <span>• {txn.category}</span>}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>{fmt(txn.amount)}</div>
                </div>
              </div>

              {/* Match Suggestions */}
              {txn.suggestions.length > 0 ? (
                <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: 12 }}>
                  <p style={{ margin: "0 0 8px", fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: 0.5 }}>
                    Suggested Matches
                  </p>
                  {txn.suggestions.map((match, i) => (
                    <div
                      key={i}
                      style={{
                        display: "flex", justifyContent: "space-between", alignItems: "center",
                        padding: "8px 12px", borderRadius: 8, marginBottom: 4,
                        background: match.confidence >= 0.9 ? "rgba(34,197,94,0.06)" : "rgba(255,255,255,0.02)",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
                        <ArrowRight size={12} style={{ color: "var(--text-tertiary)" }} />
                        <span style={{ fontSize: 13 }}>{match.description}</span>
                        <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                          {fmt(match.amount)}
                        </span>
                        <span style={{
                          padding: "1px 6px", borderRadius: 4, fontSize: 10, fontWeight: 600,
                          background: match.confidence >= 0.9 ? "rgba(34,197,94,0.15)" : match.confidence >= 0.7 ? "rgba(234,179,8,0.15)" : "rgba(255,255,255,0.06)",
                          color: match.confidence >= 0.9 ? "#22C55E" : match.confidence >= 0.7 ? "#F59E0B" : "var(--text-secondary)",
                        }}>
                          {Math.round(match.confidence * 100)}%
                        </span>
                      </div>
                      <button
                        onClick={() => confirmMatch(txn.id, match.type, match.id)}
                        className="btn btn-primary"
                        style={{ padding: "4px 12px", fontSize: 12 }}
                      >
                        <Check size={12} /> Match
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 12, color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: 4 }}>
                    <AlertCircle size={12} /> No matches found
                  </span>
                  <button
                    onClick={() => dismissTxn(txn.id)}
                    style={{ background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer", fontSize: 12, display: "flex", alignItems: "center", gap: 4 }}
                  >
                    <X size={12} /> Dismiss
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
