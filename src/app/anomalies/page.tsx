"use client";

import { useState, useEffect } from "react";
import { AlertTriangle, RefreshCw, Shield, TrendingUp, Zap } from "lucide-react";

interface Anomaly {
  type: string; severity: string; title: string;
  description: string; amount?: number; threshold?: number;
}

const SEVERITY_STYLES: Record<string, { bg: string; border: string; color: string; icon: string }> = {
  high: { bg: "rgba(239,68,68,0.06)", border: "rgba(239,68,68,0.2)", color: "#EF4444", icon: "🔴" },
  medium: { bg: "rgba(245,158,11,0.06)", border: "rgba(245,158,11,0.2)", color: "#F59E0B", icon: "🟡" },
  low: { bg: "rgba(34,197,94,0.06)", border: "rgba(34,197,94,0.2)", color: "#22C55E", icon: "🟢" },
};

export default function AnomaliesPage() {
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [summary, setSummary] = useState({ total: 0, high: 0, medium: 0, low: 0 });
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/anomalies");
      const data = await res.json();
      setAnomalies(data.anomalies || []);
      setSummary(data.summary || { total: 0, high: 0, medium: 0, low: 0 });
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  return (
    <div>
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h2 style={{ display: "flex", alignItems: "center", gap: 8 }}><AlertTriangle size={24} /> Anomaly Detection</h2>
          <p>AI-powered spending pattern analysis and budget alerts</p>
        </div>
        <button className="btn btn-secondary" onClick={load} style={{ fontSize: 12, padding: "6px 14px" }}>
          <RefreshCw size={14} /> Re-scan
        </button>
      </div>

      {/* KPIs */}
      <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)", marginBottom: 24 }}>
        <div className="kpi-card"><div className="kpi-label">Total Alerts</div><div className="kpi-value" style={{ fontSize: 28 }}>{summary.total}</div></div>
        <div className="kpi-card" style={{ borderColor: "rgba(239,68,68,0.2)" }}><div className="kpi-label">🔴 High</div><div className="kpi-value" style={{ fontSize: 28, color: "#EF4444" }}>{summary.high}</div></div>
        <div className="kpi-card amber"><div className="kpi-label">🟡 Medium</div><div className="kpi-value" style={{ fontSize: 28, color: "#F59E0B" }}>{summary.medium}</div></div>
        <div className="kpi-card green"><div className="kpi-label">🟢 Low</div><div className="kpi-value" style={{ fontSize: 28, color: "#22C55E" }}>{summary.low}</div></div>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 60, color: "var(--text-secondary)" }}>Scanning spending patterns...</div>
      ) : anomalies.length === 0 ? (
        <div style={{ textAlign: "center", padding: 80, background: "var(--bg-card)", borderRadius: 16, border: "1px solid var(--border-color)" }}>
          <Shield size={48} style={{ opacity: 0.3, marginBottom: 16, color: "#22C55E" }} />
          <h3 style={{ margin: "0 0 8px", color: "#22C55E" }}>All Clear</h3>
          <p style={{ margin: 0, color: "var(--text-secondary)" }}>No spending anomalies detected. Your finances look healthy!</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {anomalies.map((a, i) => {
            const style = SEVERITY_STYLES[a.severity] || SEVERITY_STYLES.low;
            return (
              <div key={i} style={{
                padding: "18px 22px", borderRadius: 12,
                background: style.bg, border: `1px solid ${style.border}`,
                borderLeft: `4px solid ${style.color}`,
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <span style={{ fontWeight: 700, fontSize: 14 }}>
                    {style.icon} {a.title}
                  </span>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <span style={{
                      padding: "2px 8px", borderRadius: 4, fontSize: 10, fontWeight: 700,
                      textTransform: "uppercase", background: `${style.color}22`, color: style.color,
                    }}>
                      {a.severity}
                    </span>
                    <span style={{
                      padding: "2px 8px", borderRadius: 4, fontSize: 10, fontWeight: 600,
                      background: "rgba(255,255,255,0.05)", color: "var(--text-secondary)",
                    }}>
                      {a.type.replace("_", " ")}
                    </span>
                  </div>
                </div>
                <p style={{ margin: 0, fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5 }}>{a.description}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
