"use client";

import { useState, useEffect } from "react";
import {
  Plus,
  Send,
  CheckCircle,
  X,
  Eye,
  FileText,
  Download,
  Mail,
  Loader2,
} from "lucide-react";
import { useToast } from "@/components/toast";
import { SkeletonTable } from "@/components/skeleton";

interface LineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  gstRate: number;
}

interface Client {
  id: string;
  name: string;
  company?: string;
  email?: string;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  status: string;
  issueDate: string;
  dueDate: string;
  subtotal: string;
  taxTotal: string;
  total: string;
  client?: { name: string; company?: string; email?: string };
  lineItems: { description: string; quantity: string; unitPrice: string; total: string }[];
}

export default function InvoicesPage() {
  const { toast } = useToast();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { description: "", quantity: 1, unitPrice: 0, gstRate: 18 },
  ]);
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [isInterState, setIsInterState] = useState(false);
  const [clientId, setClientId] = useState("");
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [sendingEmail, setSendingEmail] = useState<string | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [showPayment, setShowPayment] = useState(false);

  const recordPayment = async (invoiceId: string) => {
    if (!paymentAmount || Number(paymentAmount) <= 0) return;
    await fetch(`/api/invoices/${invoiceId}/payments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: Number(paymentAmount), method: "bank_transfer" }),
    });
    setPaymentAmount("");
    setShowPayment(false);
    setSelectedInvoice(null);
    loadInvoices();
    toast("Payment recorded", "success");
  };

  useEffect(() => {
    loadInvoices();
    fetch("/api/clients").then((r) => r.json()).then((d) => setClients(d.clients || [])).catch(() => { });
  }, []);

  const loadInvoices = () => {
    fetch("/api/invoices")
      .then((res) => res.json())
      .then((d) => { setInvoices(d.invoices || []); setLoading(false); })
      .catch(() => setLoading(false));
  };

  const createInvoice = async () => {
    if (!dueDate || lineItems.some((li) => !li.description || li.unitPrice <= 0)) return;
    await fetch("/api/invoices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dueDate, notes, isInterState, lineItems, clientId: clientId || undefined }),
    });
    setShowCreate(false);
    setLineItems([{ description: "", quantity: 1, unitPrice: 0, gstRate: 18 }]);
    setDueDate("");
    setNotes("");
    setClientId("");
    loadInvoices();
    toast("Invoice created", "success");
  };

  const performAction = async (id: string, action: string) => {
    await fetch(`/api/invoices/${id}/${action}`, { method: "POST" });
    loadInvoices();
    setSelectedInvoice(null);
    toast(
      action === "send" ? "Invoice marked as sent" : "Invoice marked as paid",
      "success"
    );
  };

  const downloadPDF = (id: string, invoiceNumber: string) => {
    const link = document.createElement("a");
    link.href = `/api/invoices/${id}/pdf`;
    link.download = `${invoiceNumber}.pdf`;
    link.click();
    toast("Downloading PDF...", "info");
  };

  const emailInvoice = async (id: string) => {
    setSendingEmail(id);
    try {
      const res = await fetch(`/api/invoices/${id}/email`, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        toast(data.message || "Invoice emailed", "success");
        loadInvoices();
      } else {
        toast(data.error || "Failed to send email", "error");
      }
    } catch {
      toast("Failed to send email", "error");
    }
    setSendingEmail(null);
  };

  const formatCurrency = (n: number | string) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(Number(n));

  const addLineItem = () => {
    setLineItems([...lineItems, { description: "", quantity: 1, unitPrice: 0, gstRate: 18 }]);
  };

  const updateLineItem = (index: number, field: keyof LineItem, value: string | number) => {
    const updated = [...lineItems];
    updated[index] = { ...updated[index], [field]: value };
    setLineItems(updated);
  };

  const removeLineItem = (index: number) => {
    if (lineItems.length > 1) setLineItems(lineItems.filter((_, i) => i !== index));
  };

  // Summary KPIs
  const totalOutstanding = invoices
    .filter((i) => i.status === "sent" || i.status === "overdue")
    .reduce((s, i) => s + Number(i.total), 0);
  const totalPaid = invoices
    .filter((i) => i.status === "paid")
    .reduce((s, i) => s + Number(i.total), 0);
  const overdueCount = invoices.filter((i) => i.status === "overdue").length;

  return (
    <div>
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h2>Invoices</h2>
          <p>Create, send, and track your invoices</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
          <Plus size={16} /> New Invoice
        </button>
      </div>

      {/* Summary KPIs */}
      <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)", marginBottom: 24 }}>
        <div className="kpi-card amber">
          <div className="kpi-label">Outstanding</div>
          <div className="kpi-value" style={{ fontSize: 22 }}>{formatCurrency(totalOutstanding)}</div>
        </div>
        <div className="kpi-card green">
          <div className="kpi-label">Collected</div>
          <div className="kpi-value" style={{ fontSize: 22 }}>{formatCurrency(totalPaid)}</div>
        </div>
        <div className="kpi-card red">
          <div className="kpi-label">Overdue</div>
          <div className="kpi-value" style={{ fontSize: 22 }}>{overdueCount}</div>
        </div>
        <div className="kpi-card purple">
          <div className="kpi-label">Total Invoices</div>
          <div className="kpi-value" style={{ fontSize: 22 }}>{invoices.length}</div>
        </div>
      </div>

      {/* Invoice List */}
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Invoice</th>
              <th>Client</th>
              <th>Status</th>
              <th>Date</th>
              <th>Due</th>
              <th>Amount</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7}><SkeletonTable rows={4} /></td></tr>
            ) : invoices.length === 0 ? (
              <tr>
                <td colSpan={7}>
                  <div className="empty-state" style={{ padding: 60 }}>
                    <div style={{
                      width: 56, height: 56, borderRadius: "50%",
                      background: "rgba(59, 130, 246, 0.1)",
                      display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16,
                    }}>
                      <FileText size={24} style={{ color: "var(--accent-blue)" }} />
                    </div>
                    <h3>No invoices yet</h3>
                    <p style={{ color: "var(--text-secondary)", marginBottom: 16 }}>Create your first invoice to start tracking receivables</p>
                    <button className="btn btn-primary btn-sm" onClick={() => setShowCreate(true)}>
                      <Plus size={14} /> Create Invoice
                    </button>
                  </div>
                </td>
              </tr>
            ) : (
              invoices.map((inv) => (
                <tr key={inv.id}>
                  <td style={{ fontWeight: 600 }}>{inv.invoiceNumber}</td>
                  <td>{inv.client?.name || "—"}</td>
                  <td><span className={`badge ${inv.status}`}>{inv.status}</span></td>
                  <td style={{ color: "var(--text-secondary)" }}>
                    {new Date(inv.issueDate).toLocaleDateString("en-IN")}
                  </td>
                  <td style={{ color: "var(--text-secondary)" }}>
                    {new Date(inv.dueDate).toLocaleDateString("en-IN")}
                  </td>
                  <td style={{ fontWeight: 700 }}>{formatCurrency(inv.total)}</td>
                  <td>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => setSelectedInvoice(inv)} title="View">
                        <Eye size={14} />
                      </button>
                      <button className="btn btn-ghost btn-sm" onClick={() => downloadPDF(inv.id, inv.invoiceNumber)} title="Download PDF">
                        <Download size={14} />
                      </button>
                      {inv.client?.email && inv.status !== "paid" && (
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => emailInvoice(inv.id)}
                          disabled={sendingEmail === inv.id}
                          title="Email Invoice"
                        >
                          {sendingEmail === inv.id ? <Loader2 size={14} className="loading" /> : <Mail size={14} />}
                        </button>
                      )}
                      {inv.status === "draft" && (
                        <button className="btn btn-sm btn-secondary" onClick={() => performAction(inv.id, "send")}>
                          <Send size={14} /> Send
                        </button>
                      )}
                      {(inv.status === "sent" || inv.status === "overdue") && (
                        <button className="btn btn-sm btn-success" onClick={() => performAction(inv.id, "paid")}>
                          <CheckCircle size={14} /> Paid
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Create Invoice Modal */}
      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Create Invoice</h3>
              <button className="btn btn-ghost" onClick={() => setShowCreate(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="form-group">
              <label className="form-label">Client</label>
              <select className="form-input" value={clientId} onChange={(e) => setClientId(e.target.value)}>
                <option value="">— No client —</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}{c.company ? ` (${c.company})` : ""}</option>
                ))}
              </select>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Due Date</label>
                <input type="date" className="form-input" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <input type="checkbox" checked={isInterState} onChange={(e) => setIsInterState(e.target.checked)} />
                  Inter-State (IGST)
                </label>
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label className="form-label">Line Items</label>
              {lineItems.map((item, i) => (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr auto", gap: 8, marginBottom: 8, alignItems: "center" }}>
                  <input className="form-input" placeholder="Description" value={item.description} onChange={(e) => updateLineItem(i, "description", e.target.value)} />
                  <input className="form-input" type="number" placeholder="Qty" value={item.quantity} onChange={(e) => updateLineItem(i, "quantity", Number(e.target.value))} />
                  <input className="form-input" type="number" placeholder="Price" value={item.unitPrice || ""} onChange={(e) => updateLineItem(i, "unitPrice", Number(e.target.value))} />
                  <select className="form-input" value={item.gstRate} onChange={(e) => updateLineItem(i, "gstRate", Number(e.target.value))}>
                    <option value={0}>0%</option>
                    <option value={5}>5%</option>
                    <option value={12}>12%</option>
                    <option value={18}>18%</option>
                    <option value={28}>28%</option>
                  </select>
                  <button className="btn btn-ghost btn-sm" onClick={() => removeLineItem(i)}>
                    <X size={14} />
                  </button>
                </div>
              ))}
              <button className="btn btn-secondary btn-sm" onClick={addLineItem}>
                <Plus size={14} /> Add Item
              </button>
            </div>

            <div className="form-group">
              <label className="form-label">Notes</label>
              <textarea className="form-input" placeholder="Additional notes..." value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={createInvoice}><FileText size={16} /> Create Invoice</button>
            </div>
          </div>
        </div>
      )}

      {/* View Invoice Modal */}
      {selectedInvoice && (
        <div className="modal-overlay" onClick={() => setSelectedInvoice(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{selectedInvoice.invoiceNumber}</h3>
              <button className="btn btn-ghost" onClick={() => setSelectedInvoice(null)}>
                <X size={20} />
              </button>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
              <div>
                <span className={`badge ${selectedInvoice.status}`}>{selectedInvoice.status}</span>
              </div>
              <div style={{ textAlign: "right", color: "var(--text-secondary)", fontSize: 13 }}>
                <div>Issued: {new Date(selectedInvoice.issueDate).toLocaleDateString("en-IN")}</div>
                <div>Due: {new Date(selectedInvoice.dueDate).toLocaleDateString("en-IN")}</div>
              </div>
            </div>

            {selectedInvoice.client && (
              <div style={{ marginBottom: 20, padding: 16, background: "var(--bg-input)", borderRadius: "var(--radius-md)" }}>
                <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>BILL TO</p>
                <p style={{ fontWeight: 600 }}>{selectedInvoice.client.name}</p>
                {selectedInvoice.client.company && (
                  <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>{selectedInvoice.client.company}</p>
                )}
              </div>
            )}

            <table style={{ marginBottom: 20, fontSize: 13 }}>
              <thead>
                <tr>
                  <th style={{ background: "transparent" }}>Item</th>
                  <th style={{ background: "transparent" }}>Qty</th>
                  <th style={{ background: "transparent" }}>Price</th>
                  <th style={{ background: "transparent", textAlign: "right" }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {selectedInvoice.lineItems.map((li, i) => (
                  <tr key={i}>
                    <td>{li.description}</td>
                    <td>{li.quantity}</td>
                    <td>{formatCurrency(li.unitPrice)}</td>
                    <td style={{ textAlign: "right", fontWeight: 600 }}>{formatCurrency(li.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 14 }}>
                <span style={{ color: "var(--text-secondary)" }}>Subtotal</span>
                <span>{formatCurrency(selectedInvoice.subtotal)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 14 }}>
                <span style={{ color: "var(--text-secondary)" }}>Tax</span>
                <span>{formatCurrency(selectedInvoice.taxTotal)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 20, fontWeight: 800 }}>
                <span>Total</span>
                <span>{formatCurrency(selectedInvoice.total)}</span>
              </div>
            </div>

            {/* Partial Payment */}
            {(selectedInvoice.status === "sent" || selectedInvoice.status === "overdue") && (
              <div style={{ padding: "12px 16px", marginBottom: 12, background: "rgba(99,102,241,0.05)", borderRadius: 8, border: "1px solid rgba(99,102,241,0.15)" }}>
                {showPayment ? (
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>₹</span>
                    <input className="input" type="number" placeholder="Payment amount" value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)} style={{ flex: 1, fontSize: 13 }} />
                    <button className="btn btn-primary" style={{ fontSize: 12, padding: "6px 12px" }}
                      onClick={() => recordPayment(selectedInvoice.id)}>Record</button>
                    <button className="btn btn-secondary" style={{ fontSize: 12, padding: "6px 12px" }}
                      onClick={() => setShowPayment(false)}>Cancel</button>
                  </div>
                ) : (
                  <button className="btn btn-secondary" style={{ width: "100%", fontSize: 12 }}
                    onClick={() => setShowPayment(true)}>💳 Record Partial Payment</button>
                )}
              </div>
            )}

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => downloadPDF(selectedInvoice.id, selectedInvoice.invoiceNumber)}>
                <Download size={16} /> Download PDF
              </button>
              {selectedInvoice.client?.email && selectedInvoice.status !== "paid" && (
                <button
                  className="btn btn-secondary"
                  onClick={() => emailInvoice(selectedInvoice.id)}
                  disabled={sendingEmail === selectedInvoice.id}
                >
                  {sendingEmail === selectedInvoice.id ? <Loader2 size={16} className="loading" /> : <Mail size={16} />}
                  Email Invoice
                </button>
              )}
              {selectedInvoice.status === "draft" && (
                <button className="btn btn-primary" onClick={() => performAction(selectedInvoice.id, "send")}>
                  <Send size={16} /> Send Invoice
                </button>
              )}
              {(selectedInvoice.status === "sent" || selectedInvoice.status === "overdue") && (
                <button className="btn btn-success" onClick={() => performAction(selectedInvoice.id, "paid")}>
                  <CheckCircle size={16} /> Mark as Paid
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
