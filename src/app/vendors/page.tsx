"use client";

import { useState, useEffect } from "react";
import {
  Plus,
  X,
  Building2,
  Phone,
  Mail,
  CreditCard,
  Search,
  MoreVertical,
  Trash2,
  Eye,
  RefreshCw,
} from "lucide-react";
import { useToast } from "@/components/toast";

interface Vendor {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  gstNumber?: string;
  panNumber?: string;
  paymentTerms: number;
  isActive: boolean;
  totalSpent: number;
  expenseCount: number;
}

const fmt = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

export default function VendorsPage() {
  const { toast } = useToast();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Form fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  const [gstNumber, setGstNumber] = useState("");
  const [panNumber, setPanNumber] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("30");

  async function loadVendors() {
    setLoading(true);
    try {
      const res = await fetch("/api/vendors");
      const data = await res.json();
      setVendors(data.vendors || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadVendors(); }, []);

  async function createVendor() {
    if (!name.trim()) return;
    try {
      const res = await fetch("/api/vendors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name, email: email || undefined, phone: phone || undefined,
          company: company || undefined, gstNumber: gstNumber || undefined,
          panNumber: panNumber || undefined, paymentTerms: Number(paymentTerms) || 30,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        toast(err.error || "Failed to create vendor", "error");
        return;
      }
      toast("Vendor created", "success");
      setShowForm(false);
      setName(""); setEmail(""); setPhone(""); setCompany("");
      setGstNumber(""); setPanNumber(""); setPaymentTerms("30");
      loadVendors();
    } catch (err) {
      console.error(err);
      toast("Failed to create vendor", "error");
    }
  }

  async function deleteVendor(id: string, vendorName: string) {
    if (!confirm(`Delete vendor "${vendorName}"?`)) return;
    try {
      await fetch(`/api/vendors?id=${id}`, { method: "DELETE" });
      toast("Vendor deleted", "success");
      loadVendors();
    } catch (err) {
      console.error(err);
    }
  }

  const filtered = vendors.filter(
    (v) =>
      v.name.toLowerCase().includes(search.toLowerCase()) ||
      v.company?.toLowerCase().includes(search.toLowerCase()) ||
      v.email?.toLowerCase().includes(search.toLowerCase())
  );

  const totalSpending = vendors.reduce((sum, v) => sum + v.totalSpent, 0);

  return (
    <div>
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h2 style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Building2 size={24} /> Vendors
          </h2>
          <p>Manage suppliers and track spending</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
          <Plus size={16} /> Add Vendor
        </button>
      </div>

      {/* Create Form */}
      {showForm && (
        <div style={{
          padding: 24, marginBottom: 24, background: "var(--bg-card)",
          borderRadius: 12, border: "1px solid var(--border-color)",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
            <h3 style={{ margin: 0 }}>New Vendor</h3>
            <button style={{ background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer" }} onClick={() => setShowForm(false)}>
              <X size={18} />
            </button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 4, display: "block" }}>Name *</label>
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Vendor name" />
            </div>
            <div>
              <label style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 4, display: "block" }}>Company</label>
              <input className="input" value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Company name" />
            </div>
            <div>
              <label style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 4, display: "block" }}>Email</label>
              <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="vendor@company.com" />
            </div>
            <div>
              <label style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 4, display: "block" }}>Phone</label>
              <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 98765 43210" />
            </div>
            <div>
              <label style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 4, display: "block" }}>GST Number</label>
              <input className="input" value={gstNumber} onChange={(e) => setGstNumber(e.target.value)} placeholder="29AABCU9603R1ZM" />
            </div>
            <div>
              <label style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 4, display: "block" }}>PAN Number</label>
              <input className="input" value={panNumber} onChange={(e) => setPanNumber(e.target.value)} placeholder="ABCDE1234F" />
            </div>
            <div>
              <label style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 4, display: "block" }}>Payment Terms (days)</label>
              <input className="input" type="number" value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)} />
            </div>
          </div>
          <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end" }}>
            <button className="btn btn-primary" onClick={createVendor} disabled={!name.trim()}>Create Vendor</button>
          </div>
        </div>
      )}

      {/* KPIs */}
      <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)", marginBottom: 24 }}>
        <div className="kpi-card">
          <div className="kpi-label">Total Vendors</div>
          <div className="kpi-value" style={{ fontSize: 28 }}>{vendors.length}</div>
        </div>
        <div className="kpi-card green">
          <div className="kpi-label">Active</div>
          <div className="kpi-value" style={{ fontSize: 28 }}>{vendors.filter((v) => v.isActive).length}</div>
        </div>
        <div className="kpi-card amber">
          <div className="kpi-label">Total Spending</div>
          <div className="kpi-value" style={{ fontSize: 22 }}>{fmt(totalSpending)}</div>
        </div>
      </div>

      {/* Search */}
      <div style={{ marginBottom: 16, position: "relative" }}>
        <Search size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-secondary)" }} />
        <input
          className="input"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search vendors..."
          style={{ paddingLeft: 36 }}
        />
      </div>

      {/* Vendor List */}
      {loading ? (
        <div style={{ textAlign: "center", padding: 40, color: "var(--text-secondary)" }}>Loading vendors...</div>
      ) : filtered.length === 0 ? (
        <div style={{
          textAlign: "center", padding: 60, background: "var(--bg-card)",
          borderRadius: 16, border: "1px solid var(--border-color)",
        }}>
          <Building2 size={40} style={{ opacity: 0.3, marginBottom: 12 }} />
          <h3 style={{ margin: "0 0 8px" }}>{vendors.length === 0 ? "No vendors yet" : "No matches"}</h3>
          <p style={{ color: "var(--text-secondary)", margin: 0 }}>
            {vendors.length === 0 ? "Add your first vendor to start tracking spending" : "Try a different search term"}
          </p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 16 }}>
          {filtered.map((v) => (
            <div
              key={v.id}
              style={{
                padding: 20, background: "var(--bg-card)", borderRadius: 12,
                border: "1px solid var(--border-color)", transition: "border-color 0.2s",
                cursor: "pointer",
              }}
              onClick={() => setExpandedId(expandedId === v.id ? null : v.id)}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <h4 style={{ margin: "0 0 4px", fontSize: 15 }}>{v.name}</h4>
                  {v.company && <p style={{ margin: 0, fontSize: 12, color: "var(--text-secondary)" }}>{v.company}</p>}
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteVendor(v.id, v.name); }}
                    style={{ background: "none", border: "none", color: "var(--text-tertiary)", cursor: "pointer", padding: 4 }}
                  >
                    <Trash2 size={14} />
                  </button>
                  <MoreVertical size={14} style={{ color: "var(--text-tertiary)" }} />
                </div>
              </div>

              <div style={{ display: "flex", gap: 16, marginTop: 12 }}>
                <div>
                  <p style={{ margin: 0, fontSize: 11, color: "var(--text-secondary)" }}>TOTAL SPENT</p>
                  <p style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>{fmt(v.totalSpent)}</p>
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: 11, color: "var(--text-secondary)" }}>TRANSACTIONS</p>
                  <p style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>{v.expenseCount}</p>
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: 11, color: "var(--text-secondary)" }}>TERMS</p>
                  <p style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>{v.paymentTerms}d</p>
                </div>
              </div>

              {expandedId === v.id && (
                <div style={{ marginTop: 16, padding: "12px 0 0", borderTop: "1px solid var(--border-color)", fontSize: 12 }}>
                  {v.email && <p style={{ margin: "0 0 4px", display: "flex", alignItems: "center", gap: 6 }}><Mail size={12} /> {v.email}</p>}
                  {v.phone && <p style={{ margin: "0 0 4px", display: "flex", alignItems: "center", gap: 6 }}><Phone size={12} /> {v.phone}</p>}
                  {v.gstNumber && <p style={{ margin: "0 0 4px", display: "flex", alignItems: "center", gap: 6 }}><CreditCard size={12} /> GST: {v.gstNumber}</p>}
                  {v.panNumber && <p style={{ margin: "0 0 4px", display: "flex", alignItems: "center", gap: 6 }}><Eye size={12} /> PAN: {v.panNumber}</p>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
