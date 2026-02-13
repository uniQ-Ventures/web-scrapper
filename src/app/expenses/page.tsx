"use client";

import { useState, useEffect } from "react";
import { Plus, X, CreditCard, Filter, Trash2, Upload, Receipt } from "lucide-react";
import { useToast } from "@/components/toast";
import { useConfirm } from "@/components/confirm-dialog";
import { SkeletonTable } from "@/components/skeleton";

interface Expense {
  id: string;
  description: string;
  amount: string;
  date: string;
  vendor?: string;
  receipt?: string;
  department?: string;
  category?: { name: string; color?: string };
}

export default function ExpensesPage() {
  const { toast } = useToast();
  const { confirm, dialog } = useConfirm();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [vendor, setVendor] = useState("");
  const [department, setDepartment] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");
  const [uploadingReceipt, setUploadingReceipt] = useState<string | null>(null);

  useEffect(() => { loadExpenses(); }, []);

  const loadExpenses = () => {
    fetch("/api/expenses")
      .then((res) => res.json())
      .then((d) => { setExpenses(d.expenses || []); setLoading(false); })
      .catch(() => setLoading(false));
  };

  const createExpense = async () => {
    if (!description || !amount) return;
    await fetch("/api/expenses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ description, amount: Number(amount), date, vendor, notes, department }),
    });
    setShowCreate(false);
    setDescription(""); setAmount(""); setVendor(""); setNotes(""); setDepartment("");
    loadExpenses();
    toast("Expense logged successfully", "success");
  };

  const deleteExpense = async (id: string, desc: string) => {
    const ok = await confirm({
      title: "Delete Expense",
      message: `Are you sure you want to delete "${desc}"? This action cannot be undone.`,
      confirmLabel: "Delete",
      destructive: true,
    });
    if (!ok) return;
    await fetch(`/api/expenses/${id}`, { method: "DELETE" });
    loadExpenses();
    toast("Expense deleted", "info");
  };

  const uploadReceipt = async (expenseId: string) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/jpeg,image/png,image/webp,application/pdf";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      setUploadingReceipt(expenseId);
      const formData = new FormData();
      formData.append("receipt", file);
      try {
        const res = await fetch(`/api/expenses/${expenseId}/receipt`, {
          method: "POST",
          body: formData,
        });
        if (res.ok) {
          toast("Receipt uploaded", "success");
          loadExpenses();
        } else {
          const data = await res.json();
          toast(data.error || "Upload failed", "error");
        }
      } catch {
        toast("Failed to upload receipt", "error");
      }
      setUploadingReceipt(null);
    };
    input.click();
  };

  const formatCurrency = (n: number | string) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(Number(n));

  const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const thisMonth = expenses
    .filter((e) => {
      const d = new Date(e.date);
      const now = new Date();
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    })
    .reduce((sum, e) => sum + Number(e.amount), 0);

  const departments = ["engineering", "marketing", "sales", "operations", "hr", "admin"];

  return (
    <div>
      {dialog}
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h2>Expenses</h2>
          <p>Track and categorize your business expenses</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
          <Plus size={16} /> Log Expense
        </button>
      </div>

      {/* Summary */}
      <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)", marginBottom: 24 }}>
        <div className="kpi-card red">
          <div className="kpi-label">Total Expenses</div>
          <div className="kpi-value" style={{ fontSize: 24 }}>{formatCurrency(totalExpenses)}</div>
        </div>
        <div className="kpi-card amber">
          <div className="kpi-label">This Month</div>
          <div className="kpi-value" style={{ fontSize: 24 }}>{formatCurrency(thisMonth)}</div>
        </div>
        <div className="kpi-card purple">
          <div className="kpi-label">Count</div>
          <div className="kpi-value" style={{ fontSize: 24 }}>{expenses.length}</div>
        </div>
      </div>

      {/* Expense List */}
      <div className="table-container">
        <div className="table-header">
          <h3>All Expenses</h3>
          <button className="btn btn-ghost btn-sm">
            <Filter size={14} /> Filter
          </button>
        </div>
        <table>
          <thead>
            <tr>
              <th>Description</th>
              <th>Vendor</th>
              <th>Category</th>
              <th>Date</th>
              <th>Amount</th>
              <th>Receipt</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7}><SkeletonTable rows={5} /></td></tr>
            ) : expenses.length === 0 ? (
              <tr>
                <td colSpan={7}>
                  <div className="empty-state" style={{ padding: 60 }}>
                    <div style={{
                      width: 56, height: 56, borderRadius: "50%",
                      background: "rgba(239, 68, 68, 0.1)",
                      display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16,
                    }}>
                      <CreditCard size={24} style={{ color: "var(--accent-red)" }} />
                    </div>
                    <h3>No expenses recorded</h3>
                    <p style={{ color: "var(--text-secondary)", marginBottom: 16 }}>Start logging expenses to track your burn rate</p>
                    <button className="btn btn-primary btn-sm" onClick={() => setShowCreate(true)}>
                      <Plus size={14} /> Log Expense
                    </button>
                  </div>
                </td>
              </tr>
            ) : (
              expenses.map((exp) => (
                <tr key={exp.id}>
                  <td style={{ fontWeight: 600 }}>{exp.description}</td>
                  <td style={{ color: "var(--text-secondary)" }}>{exp.vendor || "—"}</td>
                  <td>
                    {exp.category ? (
                      <span
                        className="badge"
                        style={{
                          background: `${exp.category.color || "var(--brand-primary)"}20`,
                          color: exp.category.color || "var(--brand-primary)",
                        }}
                      >
                        {exp.category.name}
                      </span>
                    ) : exp.department ? (
                      <span className="badge sent">{exp.department}</span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td style={{ color: "var(--text-secondary)" }}>
                    {new Date(exp.date).toLocaleDateString("en-IN")}
                  </td>
                  <td style={{ fontWeight: 700, color: "var(--accent-red)" }}>
                    {formatCurrency(exp.amount)}
                  </td>
                  <td>
                    {exp.receipt ? (
                      <span style={{ color: "var(--accent-green)", display: "flex", alignItems: "center", gap: 4, fontSize: 12 }}>
                        <Receipt size={14} /> Attached
                      </span>
                    ) : (
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => uploadReceipt(exp.id)}
                        disabled={uploadingReceipt === exp.id}
                        title="Upload receipt"
                      >
                        <Upload size={14} />
                      </button>
                    )}
                  </td>
                  <td>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => deleteExpense(exp.id, exp.description)}
                      style={{ color: "var(--accent-red)" }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Create Expense Modal */}
      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Log Expense</h3>
              <button className="btn btn-ghost" onClick={() => setShowCreate(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="form-group">
              <label className="form-label">Description</label>
              <input className="form-input" placeholder="e.g., Office supplies" value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Amount (₹)</label>
                <input className="form-input" type="number" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Date</label>
                <input className="form-input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Vendor</label>
                <input className="form-input" placeholder="e.g., Amazon" value={vendor} onChange={(e) => setVendor(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Department</label>
                <select className="form-input" value={department} onChange={(e) => setDepartment(e.target.value)}>
                  <option value="">Select department</option>
                  {departments.map((d) => (
                    <option key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Notes</label>
              <textarea className="form-input" placeholder="Additional details..." value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={createExpense}><CreditCard size={16} /> Log Expense</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
