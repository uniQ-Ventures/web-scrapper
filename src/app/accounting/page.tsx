"use client";

import { useState, useEffect } from "react";
import { BookOpen, Plus, X } from "lucide-react";
import { useToast } from "@/components/toast";

interface Account {
  code: string; name: string; type: string; subtype: string; balance: number;
}

interface BalanceSheet {
  assets: { current: Account[]; fixed: Account[]; total: number };
  liabilities: { current: Account[]; nonCurrent: Account[]; total: number };
  equity: { items: Account[]; total: number };
  totalLiabilitiesAndEquity: number;
  isBalanced: boolean;
}

const fmt = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

const TYPE_COLORS: Record<string, string> = {
  asset: "#22C55E", liability: "#EF4444", equity: "#6366F1", revenue: "#F59E0B", expense: "#EC4899",
};

export default function AccountingPage() {
  const { toast } = useToast();
  const [view, setView] = useState<"chart" | "balance-sheet" | "journal">("chart");
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [bs, setBs] = useState<BalanceSheet | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      if (view === "balance-sheet") {
        const res = await fetch("/api/accounting/chart?view=balance-sheet");
        const data = await res.json();
        setBs(data.balanceSheet);
      } else {
        const res = await fetch("/api/accounting/chart");
        const data = await res.json();
        setAccounts(data.accounts || []);
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [view]);

  const grouped = accounts.reduce((acc, a) => {
    if (!acc[a.type]) acc[a.type] = [];
    acc[a.type].push(a);
    return acc;
  }, {} as Record<string, Account[]>);

  return (
    <div>
      <div className="page-header">
        <h2 style={{ display: "flex", alignItems: "center", gap: 8 }}><BookOpen size={24} /> Accounting</h2>
        <p>Chart of Accounts, Journal Entries & Balance Sheet</p>
      </div>

      <div style={{ display: "flex", gap: 4, marginBottom: 20, background: "var(--bg-secondary)", padding: 4, borderRadius: 8, width: "fit-content" }}>
        {(["chart", "balance-sheet", "journal"] as const).map((v) => (
          <button key={v} onClick={() => setView(v)} style={{
            padding: "8px 20px", borderRadius: 6, border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer",
            background: view === v ? "var(--bg-card)" : "transparent",
            color: view === v ? "var(--text-primary)" : "var(--text-secondary)",
            boxShadow: view === v ? "0 1px 3px rgba(0,0,0,0.2)" : "none",
          }}>
            {v === "chart" ? "Chart of Accounts" : v === "balance-sheet" ? "Balance Sheet" : "Journal"}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 60, color: "var(--text-secondary)" }}>Loading...</div>
      ) : view === "chart" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {Object.entries(grouped).map(([type, accts]) => (
            <div key={type} className="table-container">
              <div className="table-header" style={{ display: "flex", justifyContent: "space-between" }}>
                <h3 style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ width: 10, height: 10, borderRadius: "50%", background: TYPE_COLORS[type] || "#666", display: "inline-block" }} />
                  {type.charAt(0).toUpperCase() + type.slice(1)}s ({accts.length})
                </h3>
              </div>
              <table>
                <thead><tr><th>Code</th><th>Account Name</th><th>Subtype</th></tr></thead>
                <tbody>
                  {accts.map((a) => (
                    <tr key={a.code}>
                      <td><span style={{ fontFamily: "monospace", fontSize: 12, fontWeight: 700, color: TYPE_COLORS[type] }}>{a.code}</span></td>
                      <td style={{ fontWeight: 500 }}>{a.name}</td>
                      <td><span style={{ padding: "2px 8px", borderRadius: 4, fontSize: 11, background: "rgba(255,255,255,0.04)" }}>{a.subtype}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      ) : view === "balance-sheet" && bs ? (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          {/* Assets */}
          <div className="table-container" style={{ padding: 24 }}>
            <h3 style={{ color: "#22C55E", marginBottom: 16 }}>Assets</h3>
            <h4 style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 8 }}>CURRENT ASSETS</h4>
            {bs.assets.current.map((a) => (
              <div key={a.code} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: 13 }}>
                <span>{a.name}</span><span style={{ fontWeight: 600 }}>{fmt(a.balance)}</span>
              </div>
            ))}
            <h4 style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 16, marginBottom: 8 }}>FIXED ASSETS</h4>
            {bs.assets.fixed.map((a) => (
              <div key={a.code} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: 13 }}>
                <span>{a.name}</span><span style={{ fontWeight: 600 }}>{fmt(a.balance)}</span>
              </div>
            ))}
            <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", marginTop: 12, borderTop: "2px solid var(--border-color)", fontSize: 16, fontWeight: 800 }}>
              <span>Total Assets</span><span style={{ color: "#22C55E" }}>{fmt(bs.assets.total)}</span>
            </div>
          </div>

          {/* Liabilities & Equity */}
          <div className="table-container" style={{ padding: 24 }}>
            <h3 style={{ color: "#EF4444", marginBottom: 16 }}>Liabilities & Equity</h3>
            <h4 style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 8 }}>CURRENT LIABILITIES</h4>
            {bs.liabilities.current.map((a) => (
              <div key={a.code} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: 13 }}>
                <span>{a.name}</span><span style={{ fontWeight: 600 }}>{fmt(a.balance)}</span>
              </div>
            ))}
            <h4 style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 16, marginBottom: 8 }}>EQUITY</h4>
            {bs.equity.items.map((a) => (
              <div key={a.code} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: 13 }}>
                <span>{a.name}</span><span style={{ fontWeight: 600 }}>{fmt(a.balance)}</span>
              </div>
            ))}
            <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", marginTop: 12, borderTop: "2px solid var(--border-color)", fontSize: 16, fontWeight: 800 }}>
              <span>Total L&E</span><span style={{ color: "#6366F1" }}>{fmt(bs.totalLiabilitiesAndEquity)}</span>
            </div>
            <div style={{ marginTop: 8, textAlign: "center" }}>
              <span style={{ padding: "4px 12px", borderRadius: 6, fontSize: 11, fontWeight: 700, background: bs.isBalanced ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)", color: bs.isBalanced ? "#22C55E" : "#EF4444" }}>
                {bs.isBalanced ? "✓ BALANCED" : "✗ UNBALANCED"}
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ textAlign: "center", padding: 60, background: "var(--bg-card)", borderRadius: 16, border: "1px solid var(--border-color)" }}>
          <BookOpen size={40} style={{ opacity: 0.3, marginBottom: 12 }} />
          <h3 style={{ margin: "0 0 8px" }}>Journal Entries</h3>
          <p style={{ margin: 0, color: "var(--text-secondary)" }}>Record double-entry journal transactions via the API</p>
        </div>
      )}
    </div>
  );
}
