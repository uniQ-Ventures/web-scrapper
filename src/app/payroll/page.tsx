"use client";

import { useState, useEffect } from "react";
import { Users, Plus, X, Play, DollarSign } from "lucide-react";
import { useToast } from "@/components/toast";

interface Employee {
  id: string; employeeId: string; name: string; email: string;
  designation: string; department: string; basicSalary: number;
  hra: number; ctc: number; isActive: boolean;
}

interface PayrollEntry {
  id: string; employeeId: string; name: string; designation: string;
  status: string; grossPay: number; pfEmployee: number; esiEmployee: number;
  professionalTax: number; tds: number; totalDeductions: number; netPay: number;
}

interface PayrollSummary {
  totalGross: number; totalDeductions: number; totalNet: number;
  totalPfEmployer: number; totalEsiEmployer: number; employeeCount: number; companyCost: number;
}

const fmt = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

export default function PayrollPage() {
  const { toast } = useToast();
  const [view, setView] = useState<"employees" | "payroll">("employees");
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [runs, setRuns] = useState<PayrollEntry[]>([]);
  const [summary, setSummary] = useState<PayrollSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [processing, setProcessing] = useState(false);

  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));

  // Form
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [designation, setDesignation] = useState("");
  const [department, setDepartment] = useState("");
  const [basicSalary, setBasicSalary] = useState("");
  const [hra, setHra] = useState("");
  const [ctc, setCtc] = useState("");

  async function loadEmployees() {
    setLoading(true);
    const res = await fetch("/api/payroll?view=employees");
    const data = await res.json();
    setEmployees(data.employees || []);
    setLoading(false);
  }

  async function loadRuns() {
    setLoading(true);
    const res = await fetch(`/api/payroll?view=runs&month=${month}`);
    const data = await res.json();
    setRuns(data.runs || []);
    setSummary(data.summary || null);
    setLoading(false);
  }

  useEffect(() => { if (view === "employees") loadEmployees(); else loadRuns(); }, [view, month]);

  async function addEmployee() {
    if (!name || !basicSalary) return;
    try {
      const res = await fetch("/api/payroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add_employee", name, email, designation, department,
          basicSalary: Number(basicSalary), hra: Number(hra) || 0,
          ctc: Number(ctc) || Number(basicSalary) * 12,
        }),
      });
      if (!res.ok) { toast("Failed to add", "error"); return; }
      toast("Employee added", "success");
      setShowForm(false);
      setName(""); setEmail(""); setDesignation(""); setDepartment("");
      setBasicSalary(""); setHra(""); setCtc("");
      loadEmployees();
    } catch { toast("Failed", "error"); }
  }

  async function runPayroll() {
    setProcessing(true);
    try {
      const res = await fetch("/api/payroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "run_payroll", month }),
      });
      const data = await res.json();
      if (!res.ok) { toast(data.error || "Failed", "error"); return; }
      toast(`Payroll processed for ${data.processed} employees`, "success");
      setView("payroll");
      loadRuns();
    } catch { toast("Failed", "error"); }
    finally { setProcessing(false); }
  }

  return (
    <div>
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h2 style={{ display: "flex", alignItems: "center", gap: 8 }}><Users size={24} /> Payroll</h2>
          <p>Employee management and salary processing</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {view === "employees" && (
            <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}><Plus size={16} /> Add Employee</button>
          )}
        </div>
      </div>

      {/* Toggle */}
      <div style={{ display: "flex", gap: 4, marginBottom: 20, background: "var(--bg-secondary)", padding: 4, borderRadius: 8, width: "fit-content" }}>
        {(["employees", "payroll"] as const).map((v) => (
          <button key={v} onClick={() => setView(v)} style={{
            padding: "8px 20px", borderRadius: 6, border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer",
            background: view === v ? "var(--bg-card)" : "transparent",
            color: view === v ? "var(--text-primary)" : "var(--text-secondary)",
            boxShadow: view === v ? "0 1px 3px rgba(0,0,0,0.2)" : "none",
          }}>
            {v === "employees" ? "Employees" : "Payroll Runs"}
          </button>
        ))}
        {view === "payroll" && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: 12 }}>
            <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} style={{
              background: "var(--bg-secondary)", border: "1px solid var(--border-color)",
              borderRadius: 6, padding: "4px 8px", color: "var(--text-primary)", fontSize: 13,
            }} />
            <button className="btn btn-primary" onClick={runPayroll} disabled={processing} style={{ fontSize: 12, padding: "6px 14px" }}>
              <Play size={14} /> Run Payroll
            </button>
          </div>
        )}
      </div>

      {/* Add Employee Form */}
      {showForm && (
        <div style={{ padding: 24, marginBottom: 24, background: "var(--bg-card)", borderRadius: 12, border: "1px solid var(--border-color)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
            <h3 style={{ margin: 0 }}>New Employee</h3>
            <button style={{ background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer" }} onClick={() => setShowForm(false)}><X size={18} /></button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <div><label style={{ fontSize: 12, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>Name *</label><input className="input" value={name} onChange={(e) => setName(e.target.value)} /></div>
            <div><label style={{ fontSize: 12, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>Email</label><input className="input" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
            <div><label style={{ fontSize: 12, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>Designation</label><input className="input" value={designation} onChange={(e) => setDesignation(e.target.value)} /></div>
            <div><label style={{ fontSize: 12, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>Department</label><input className="input" value={department} onChange={(e) => setDepartment(e.target.value)} /></div>
            <div><label style={{ fontSize: 12, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>Basic Salary *</label><input className="input" type="number" value={basicSalary} onChange={(e) => setBasicSalary(e.target.value)} /></div>
            <div><label style={{ fontSize: 12, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>HRA</label><input className="input" type="number" value={hra} onChange={(e) => setHra(e.target.value)} /></div>
            <div><label style={{ fontSize: 12, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>Annual CTC</label><input className="input" type="number" value={ctc} onChange={(e) => setCtc(e.target.value)} /></div>
          </div>
          <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end" }}>
            <button className="btn btn-primary" onClick={addEmployee} disabled={!name || !basicSalary}>Add Employee</button>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: "center", padding: 60, color: "var(--text-secondary)" }}>Loading...</div>
      ) : view === "employees" ? (
        employees.length === 0 ? (
          <div style={{ textAlign: "center", padding: 60, background: "var(--bg-card)", borderRadius: 16, border: "1px solid var(--border-color)" }}>
            <Users size={40} style={{ opacity: 0.3, marginBottom: 12 }} />
            <h3 style={{ margin: "0 0 8px" }}>No employees</h3>
            <p style={{ margin: 0, color: "var(--text-secondary)" }}>Add employees to start processing payroll</p>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead><tr><th>ID</th><th>Name</th><th>Designation</th><th>Dept</th><th style={{ textAlign: "right" }}>Basic</th><th style={{ textAlign: "right" }}>HRA</th><th style={{ textAlign: "right" }}>CTC (Annual)</th></tr></thead>
              <tbody>
                {employees.map((e) => (
                  <tr key={e.id}>
                    <td><span style={{ padding: "2px 8px", borderRadius: 4, fontSize: 11, fontWeight: 700, background: "rgba(99,102,241,0.1)", color: "#818CF8" }}>{e.employeeId}</span></td>
                    <td style={{ fontWeight: 600 }}>{e.name}</td>
                    <td style={{ color: "var(--text-secondary)" }}>{e.designation || "—"}</td>
                    <td style={{ color: "var(--text-secondary)" }}>{e.department || "—"}</td>
                    <td style={{ textAlign: "right" }}>{fmt(e.basicSalary)}</td>
                    <td style={{ textAlign: "right" }}>{fmt(e.hra)}</td>
                    <td style={{ textAlign: "right", fontWeight: 700 }}>{fmt(e.ctc)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : (
        <>
          {summary && (
            <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)", marginBottom: 24 }}>
              <div className="kpi-card"><div className="kpi-label">Gross Pay</div><div className="kpi-value" style={{ fontSize: 20 }}>{fmt(summary.totalGross)}</div></div>
              <div className="kpi-card amber"><div className="kpi-label">Deductions</div><div className="kpi-value" style={{ fontSize: 20 }}>{fmt(summary.totalDeductions)}</div></div>
              <div className="kpi-card green"><div className="kpi-label">Net Pay</div><div className="kpi-value" style={{ fontSize: 20 }}>{fmt(summary.totalNet)}</div></div>
              <div className="kpi-card"><div className="kpi-label">Company Cost</div><div className="kpi-value" style={{ fontSize: 20 }}>{fmt(summary.companyCost)}</div></div>
            </div>
          )}
          {runs.length === 0 ? (
            <div style={{ textAlign: "center", padding: 60, background: "var(--bg-card)", borderRadius: 16, border: "1px solid var(--border-color)" }}>
              <DollarSign size={40} style={{ opacity: 0.3, marginBottom: 12 }} />
              <h3 style={{ margin: "0 0 8px" }}>No payroll run for {month}</h3>
              <p style={{ margin: 0, color: "var(--text-secondary)" }}>Click "Run Payroll" to process salaries</p>
            </div>
          ) : (
            <div className="table-container">
              <table>
                <thead><tr><th>ID</th><th>Name</th><th style={{ textAlign: "right" }}>Gross</th><th style={{ textAlign: "right" }}>PF</th><th style={{ textAlign: "right" }}>ESI</th><th style={{ textAlign: "right" }}>PT</th><th style={{ textAlign: "right" }}>TDS</th><th style={{ textAlign: "right" }}>Deductions</th><th style={{ textAlign: "right" }}>Net Pay</th></tr></thead>
                <tbody>
                  {runs.map((r) => (
                    <tr key={r.id}>
                      <td><span style={{ padding: "2px 8px", borderRadius: 4, fontSize: 11, fontWeight: 700, background: "rgba(99,102,241,0.1)", color: "#818CF8" }}>{r.employeeId}</span></td>
                      <td style={{ fontWeight: 600 }}>{r.name}</td>
                      <td style={{ textAlign: "right" }}>{fmt(r.grossPay)}</td>
                      <td style={{ textAlign: "right", color: "var(--text-secondary)" }}>{fmt(r.pfEmployee)}</td>
                      <td style={{ textAlign: "right", color: "var(--text-secondary)" }}>{fmt(r.esiEmployee)}</td>
                      <td style={{ textAlign: "right", color: "var(--text-secondary)" }}>{fmt(r.professionalTax)}</td>
                      <td style={{ textAlign: "right", color: "var(--text-secondary)" }}>{fmt(r.tds)}</td>
                      <td style={{ textAlign: "right", color: "#EF4444", fontWeight: 600 }}>{fmt(r.totalDeductions)}</td>
                      <td style={{ textAlign: "right", fontWeight: 800, color: "#22C55E" }}>{fmt(r.netPay)}</td>
                    </tr>
                  ))}
                </tbody>
                {summary && (
                  <tfoot>
                    <tr style={{ fontWeight: 800, fontSize: 14 }}>
                      <td colSpan={2}>Total ({summary.employeeCount} employees)</td>
                      <td style={{ textAlign: "right" }}>{fmt(summary.totalGross)}</td>
                      <td colSpan={4}></td>
                      <td style={{ textAlign: "right", color: "#EF4444" }}>{fmt(summary.totalDeductions)}</td>
                      <td style={{ textAlign: "right", color: "#22C55E" }}>{fmt(summary.totalNet)}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
