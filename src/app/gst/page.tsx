"use client";

import { useState, useEffect } from "react";
import { FileText, Calendar, ArrowDown, ArrowUp, Minus } from "lucide-react";

interface GSTR3BData {
  type: string;
  period: string;
  filingDue: string;
  outwardSupplies: {
    taxableValue: number;
    cgst: number; sgst: number; igst: number;
    totalTax: number; invoiceCount: number;
  };
  inputTaxCredit: {
    cgst: number; sgst: number; igst: number;
    totalITC: number; expenseCount: number;
  };
  netTaxPayable: {
    cgst: number; sgst: number; igst: number; total: number;
  };
}

interface GSTR1Entry {
  invoiceNumber: string;
  invoiceDate: string;
  customerName: string;
  customerGSTIN: string;
  taxableValue: number;
  cgst: number; sgst: number; igst: number;
  invoiceValue: number;
}

interface GSTR1Data {
  type: string;
  period: string;
  filingDue: string;
  b2b: { count: number; entries: GSTR1Entry[]; totalTaxable: number; totalTax: number };
  b2c: { count: number; totalTaxable: number; cgst: number; sgst: number; igst: number };
  totalInvoices: number;
}

const fmt = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(n);

export default function GSTReturnsPage() {
  const [view, setView] = useState<"gstr3b" | "gstr1">("gstr3b");
  const [data3b, setData3b] = useState<GSTR3BData | null>(null);
  const [data1, setData1] = useState<GSTR1Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().slice(0, 7);
  });

  async function load() {
    setLoading(true);
    try {
      const [r3b, r1] = await Promise.all([
        fetch(`/api/gst/returns?type=gstr3b&month=${month}`).then((r) => r.json()),
        fetch(`/api/gst/returns?type=gstr1&month=${month}`).then((r) => r.json()),
      ]);
      setData3b(r3b);
      setData1(r1);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [month]);

  return (
    <div>
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h2 style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <FileText size={24} /> GST Returns
          </h2>
          <p>GSTR-1 Sales Register & GSTR-3B Monthly Summary</p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            type="month" value={month}
            onChange={(e) => setMonth(e.target.value)}
            style={{
              background: "var(--bg-secondary)", border: "1px solid var(--border-color)",
              borderRadius: 8, padding: "6px 12px", color: "var(--text-primary)", fontSize: 13,
            }}
          />
        </div>
      </div>

      {/* Toggle */}
      <div style={{
        display: "flex", gap: 4, marginBottom: 20,
        background: "var(--bg-secondary)", padding: 4, borderRadius: 8, width: "fit-content",
      }}>
        {(["gstr3b", "gstr1"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setView(t)}
            style={{
              padding: "8px 20px", borderRadius: 6, border: "none", fontSize: 13,
              fontWeight: 600, cursor: "pointer",
              background: view === t ? "var(--bg-card)" : "transparent",
              color: view === t ? "var(--text-primary)" : "var(--text-secondary)",
              boxShadow: view === t ? "0 1px 3px rgba(0,0,0,0.2)" : "none",
            }}
          >
            {t === "gstr3b" ? "GSTR-3B (Summary)" : "GSTR-1 (Sales)"}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 60, color: "var(--text-secondary)" }}>Loading GST data...</div>
      ) : view === "gstr3b" && data3b ? (
        <>
          {/* Filing Due */}
          <div style={{
            padding: "12px 20px", marginBottom: 20, background: "var(--bg-card)",
            borderRadius: 10, border: "1px solid var(--border-color)",
            display: "flex", justifyContent: "space-between", alignItems: "center",
          }}>
            <span style={{ fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
              <Calendar size={14} /> GSTR-3B due: <strong>{data3b.filingDue}</strong>
            </span>
            <span style={{ padding: "3px 10px", borderRadius: 6, fontSize: 11, fontWeight: 700, background: "rgba(234,179,8,0.15)", color: "#F59E0B" }}>PENDING</span>
          </div>

          {/* 3B Summary Table */}
          <div className="table-container" style={{ padding: 24 }}>
            <h3 style={{ marginBottom: 16 }}>GSTR-3B Summary — {data3b.period}</h3>
            <table>
              <thead>
                <tr>
                  <th>Particulars</th>
                  <th style={{ textAlign: "right" }}>CGST</th>
                  <th style={{ textAlign: "right" }}>SGST</th>
                  <th style={{ textAlign: "right" }}>IGST</th>
                  <th style={{ textAlign: "right" }}>Total</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ fontWeight: 600 }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <ArrowUp size={14} color="#EF4444" /> Outward Supplies ({data3b.outwardSupplies.invoiceCount} invoices)
                    </span>
                  </td>
                  <td style={{ textAlign: "right" }}>{fmt(data3b.outwardSupplies.cgst)}</td>
                  <td style={{ textAlign: "right" }}>{fmt(data3b.outwardSupplies.sgst)}</td>
                  <td style={{ textAlign: "right" }}>{fmt(data3b.outwardSupplies.igst)}</td>
                  <td style={{ textAlign: "right", fontWeight: 700 }}>{fmt(data3b.outwardSupplies.totalTax)}</td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 600 }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <ArrowDown size={14} color="#22C55E" /> Input Tax Credit ({data3b.inputTaxCredit.expenseCount} expenses)
                    </span>
                  </td>
                  <td style={{ textAlign: "right", color: "var(--accent-green)" }}>- {fmt(data3b.inputTaxCredit.cgst)}</td>
                  <td style={{ textAlign: "right", color: "var(--accent-green)" }}>- {fmt(data3b.inputTaxCredit.sgst)}</td>
                  <td style={{ textAlign: "right", color: "var(--accent-green)" }}>- {fmt(data3b.inputTaxCredit.igst)}</td>
                  <td style={{ textAlign: "right", color: "var(--accent-green)", fontWeight: 700 }}>- {fmt(data3b.inputTaxCredit.totalITC)}</td>
                </tr>
                <tr style={{ fontSize: 16, fontWeight: 800, borderTop: "2px solid var(--border-color)" }}>
                  <td>
                    <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <Minus size={14} /> Net Tax Payable
                    </span>
                  </td>
                  <td style={{ textAlign: "right" }}>{fmt(data3b.netTaxPayable.cgst)}</td>
                  <td style={{ textAlign: "right" }}>{fmt(data3b.netTaxPayable.sgst)}</td>
                  <td style={{ textAlign: "right" }}>{fmt(data3b.netTaxPayable.igst)}</td>
                  <td style={{ textAlign: "right", color: data3b.netTaxPayable.total > 0 ? "#EF4444" : "#22C55E" }}>
                    {fmt(data3b.netTaxPayable.total)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Taxable Supply KPI */}
          <div style={{
            marginTop: 16, padding: "14px 20px", background: "var(--bg-card)",
            borderRadius: 10, border: "1px solid var(--border-color)",
            display: "flex", justifyContent: "space-between",
          }}>
            <span>Taxable Value of Outward Supplies</span>
            <span style={{ fontWeight: 700, fontSize: 16 }}>{fmt(data3b.outwardSupplies.taxableValue)}</span>
          </div>
        </>
      ) : view === "gstr1" && data1 ? (
        <>
          {/* Filing Due */}
          <div style={{
            padding: "12px 20px", marginBottom: 20, background: "var(--bg-card)",
            borderRadius: 10, border: "1px solid var(--border-color)",
            display: "flex", justifyContent: "space-between", alignItems: "center",
          }}>
            <span style={{ fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
              <Calendar size={14} /> GSTR-1 due: <strong>{data1.filingDue}</strong>
            </span>
            <span style={{ fontSize: 13 }}>Total Invoices: <strong>{data1.totalInvoices}</strong></span>
          </div>

          {/* B2B Sales */}
          {data1.b2b.count > 0 && (
            <div className="table-container" style={{ marginBottom: 16 }}>
              <div className="table-header">
                <h3>B2B Sales — Registered Buyers ({data1.b2b.count})</h3>
              </div>
              <table>
                <thead>
                  <tr>
                    <th>Invoice</th>
                    <th>Date</th>
                    <th>Customer</th>
                    <th>GSTIN</th>
                    <th style={{ textAlign: "right" }}>Taxable</th>
                    <th style={{ textAlign: "right" }}>Tax</th>
                    <th style={{ textAlign: "right" }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {data1.b2b.entries.map((e, i) => (
                    <tr key={i}>
                      <td style={{ fontWeight: 600 }}>{e.invoiceNumber}</td>
                      <td>{e.invoiceDate}</td>
                      <td>{e.customerName}</td>
                      <td style={{ fontSize: 11, fontFamily: "monospace" }}>{e.customerGSTIN}</td>
                      <td style={{ textAlign: "right" }}>{fmt(e.taxableValue)}</td>
                      <td style={{ textAlign: "right", color: "#F59E0B" }}>{fmt(e.cgst + e.sgst + e.igst)}</td>
                      <td style={{ textAlign: "right", fontWeight: 700 }}>{fmt(e.invoiceValue)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ fontWeight: 700 }}>
                    <td colSpan={4}>B2B Total</td>
                    <td style={{ textAlign: "right" }}>{fmt(data1.b2b.totalTaxable)}</td>
                    <td style={{ textAlign: "right", color: "#F59E0B" }}>{fmt(data1.b2b.totalTax)}</td>
                    <td style={{ textAlign: "right" }}>{fmt(data1.b2b.totalTaxable + data1.b2b.totalTax)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          {/* B2C Summary */}
          {data1.b2c.count > 0 && (
            <div className="table-container" style={{ padding: 24 }}>
              <h3 style={{ marginBottom: 12 }}>B2C Sales — Unregistered Buyers ({data1.b2c.count})</h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 16 }}>
                <div>
                  <p style={{ margin: 0, fontSize: 11, color: "var(--text-secondary)" }}>TAXABLE VALUE</p>
                  <p style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>{fmt(data1.b2c.totalTaxable)}</p>
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: 11, color: "var(--text-secondary)" }}>CGST</p>
                  <p style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>{fmt(data1.b2c.cgst)}</p>
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: 11, color: "var(--text-secondary)" }}>SGST</p>
                  <p style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>{fmt(data1.b2c.sgst)}</p>
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: 11, color: "var(--text-secondary)" }}>IGST</p>
                  <p style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>{fmt(data1.b2c.igst)}</p>
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        <div style={{ textAlign: "center", padding: 60, color: "var(--text-secondary)" }}>No data for this period</div>
      )}
    </div>
  );
}
