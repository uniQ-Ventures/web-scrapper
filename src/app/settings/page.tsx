"use client";

import { useState, useEffect } from "react";
import {
  Plus, X, Wallet, Building2, Users, Save, Settings2,
  Shield, Bell, Link2, CheckCircle, AlertCircle
} from "lucide-react";
import { useToast } from "@/components/toast";
import { SkeletonTable } from "@/components/skeleton";

interface Account {
  id: string;
  name: string;
  type: string;
  currentBalance: string;
  currency: string;
}

interface Client {
  id: string;
  name: string;
  email?: string;
  company?: string;
  gstNumber?: string;
}

interface OrgSettings {
  name: string;
  currency: string;
  gstNumber: string;
  address: string;
  logoUrl: string;
  cashInBank?: number;
  alertSettings: string;
}

type Tab = "accounts" | "clients" | "organization" | "integrations";

export default function SettingsPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<Tab>("organization");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [showAddClient, setShowAddClient] = useState(false);

  const [accName, setAccName] = useState("");
  const [accType, setAccType] = useState("bank");
  const [accBalance, setAccBalance] = useState("");

  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientCompany, setClientCompany] = useState("");
  const [clientGst, setClientGst] = useState("");

  const [org, setOrg] = useState<OrgSettings>({
    name: "", currency: "INR", gstNumber: "", address: "", logoUrl: "", alertSettings: "{}"
  });
  const [runwayWarning, setRunwayWarning] = useState(3);
  const [budgetThreshold, setBudgetThreshold] = useState(80);

  useEffect(() => {
    Promise.all([
      fetch("/api/accounts").then((r) => r.json()),
      fetch("/api/clients").then((r) => r.json()),
      fetch("/api/settings/organization").then((r) => r.json()),
    ]).then(([accData, clData, orgData]) => {
      setAccounts(accData.accounts || []);
      setClients(clData.clients || []);
      if (orgData.organization) {
        setOrg(orgData.organization);
        try {
          const alerts = JSON.parse(orgData.organization.alertSettings || "{}");
          setRunwayWarning(alerts.runwayWarningMonths ?? 3);
          setBudgetThreshold((alerts.budgetAlertThreshold ?? 0.8) * 100);
        } catch { /* ignore */ }
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const saveOrg = async () => {
    setSaving(true);
    try {
      await fetch("/api/settings/organization", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...org,
          alertSettings: JSON.stringify({
            runwayWarningMonths: runwayWarning,
            budgetAlertThreshold: budgetThreshold / 100,
          }),
        }),
      });
      toast("Organization settings saved", "success");
    } catch {
      toast("Failed to save settings", "error");
    }
    setSaving(false);
  };

  const addAccount = async () => {
    if (!accName) return;
    await fetch("/api/accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: accName, type: accType, currentBalance: Number(accBalance) || 0 }),
    });
    setShowAddAccount(false);
    setAccName(""); setAccBalance("");
    const r = await fetch("/api/accounts");
    const d = await r.json();
    setAccounts(d.accounts || []);
    toast("Account added successfully", "success");
  };

  const addClient = async () => {
    if (!clientName) return;
    await fetch("/api/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: clientName, email: clientEmail, company: clientCompany, gstNumber: clientGst }),
    });
    setShowAddClient(false);
    setClientName(""); setClientEmail(""); setClientCompany(""); setClientGst("");
    const r = await fetch("/api/clients");
    const d = await r.json();
    setClients(d.clients || []);
    toast("Client added successfully", "success");
  };

  const formatCurrency = (n: number | string) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(Number(n));

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "organization", label: "Organization", icon: <Building2 size={16} /> },
    { id: "accounts", label: "Accounts", icon: <Wallet size={16} /> },
    { id: "clients", label: "Clients", icon: <Users size={16} /> },
    { id: "integrations", label: "Integrations", icon: <Link2 size={16} /> },
  ];

  return (
    <div>
      <div className="page-header">
        <h2><Settings2 size={24} style={{ display: "inline", verticalAlign: "middle", marginRight: 8 }} />Settings</h2>
        <p>Manage organization, accounts, clients, and integrations</p>
      </div>

      {/* Tab navigation */}
      <div style={{
        display: "flex",
        gap: 4,
        marginBottom: 24,
        background: "var(--bg-secondary)",
        padding: 4,
        borderRadius: "var(--radius)",
        width: "fit-content",
      }}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 16px",
              borderRadius: "var(--radius-sm)",
              border: "none",
              fontSize: 13,
              fontWeight: 500,
              cursor: "pointer",
              transition: "all 0.2s",
              background: activeTab === tab.id ? "var(--bg-card)" : "transparent",
              color: activeTab === tab.id ? "var(--text-primary)" : "var(--text-secondary)",
              boxShadow: activeTab === tab.id ? "0 1px 3px rgba(0,0,0,0.2)" : "none",
            }}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Organization Tab */}
      {activeTab === "organization" && (
        <div className="table-container" style={{ marginBottom: 32 }}>
          <div className="table-header">
            <h3><Building2 size={18} style={{ display: "inline", verticalAlign: "middle", marginRight: 8 }} />Company Profile</h3>
            <button className="btn btn-primary btn-sm" onClick={saveOrg} disabled={saving}>
              <Save size={14} /> {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
          <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Company Name</label>
                <input className="form-input" placeholder="Your company name" value={org.name} onChange={(e) => setOrg({ ...org, name: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Currency</label>
                <select className="form-input" value={org.currency} onChange={(e) => setOrg({ ...org, currency: e.target.value })}>
                  <option value="INR">₹ INR</option>
                  <option value="USD">$ USD</option>
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">GSTIN</label>
                <input className="form-input" placeholder="22AAAAA0000A1Z5" value={org.gstNumber || ""} onChange={(e) => setOrg({ ...org, gstNumber: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Cash in Bank (₹)</label>
                <input className="form-input" type="number" placeholder="0" value={org.cashInBank || ""} onChange={(e) => setOrg({ ...org, cashInBank: Number(e.target.value) })} />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Address</label>
              <textarea
                className="form-input"
                rows={3}
                placeholder="Company address..."
                value={org.address || ""}
                onChange={(e) => setOrg({ ...org, address: e.target.value })}
                style={{ resize: "vertical" }}
              />
            </div>

            <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: 20 }}>
              <h4 style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
                <Bell size={16} /> Alert Thresholds
              </h4>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Runway Warning (months)</label>
                  <input
                    className="form-input"
                    type="number"
                    min={1}
                    max={24}
                    value={runwayWarning}
                    onChange={(e) => setRunwayWarning(Number(e.target.value))}
                  />
                  <span style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
                    Alert when runway drops below this
                  </span>
                </div>
                <div className="form-group">
                  <label className="form-label">Budget Alert (%)</label>
                  <input
                    className="form-input"
                    type="number"
                    min={50}
                    max={100}
                    value={budgetThreshold}
                    onChange={(e) => setBudgetThreshold(Number(e.target.value))}
                  />
                  <span style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
                    Alert when spending exceeds this % of budget
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Accounts Tab */}
      {activeTab === "accounts" && (
        <div className="table-container" style={{ marginBottom: 32 }}>
          <div className="table-header">
            <h3><Wallet size={18} style={{ display: "inline", verticalAlign: "middle", marginRight: 8 }} />Bank Accounts</h3>
            <button className="btn btn-primary btn-sm" onClick={() => setShowAddAccount(true)}>
              <Plus size={14} /> Add Account
            </button>
          </div>
          {loading ? (
            <SkeletonTable rows={3} />
          ) : accounts.length === 0 ? (
            <div className="empty-state" style={{ padding: 60 }}>
              <div style={{
                width: 56,
                height: 56,
                borderRadius: "50%",
                background: "rgba(59, 130, 246, 0.1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 16,
              }}>
                <Wallet size={24} style={{ color: "var(--accent-blue)" }} />
              </div>
              <h3>No accounts yet</h3>
              <p style={{ color: "var(--text-secondary)", marginBottom: 16 }}>Add your bank accounts to track runway and cash position</p>
              <button className="btn btn-primary btn-sm" onClick={() => setShowAddAccount(true)}>
                <Plus size={14} /> Add First Account
              </button>
            </div>
          ) : (
            <table>
              <thead>
                <tr><th>Name</th><th>Type</th><th>Balance</th></tr>
              </thead>
              <tbody>
                {accounts.map((acc) => (
                  <tr key={acc.id}>
                    <td style={{ fontWeight: 600 }}>{acc.name}</td>
                    <td><span className="badge sent">{acc.type}</span></td>
                    <td style={{ fontWeight: 700 }}>{formatCurrency(acc.currentBalance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Clients Tab */}
      {activeTab === "clients" && (
        <div className="table-container">
          <div className="table-header">
            <h3><Users size={18} style={{ display: "inline", verticalAlign: "middle", marginRight: 8 }} />Clients</h3>
            <button className="btn btn-primary btn-sm" onClick={() => setShowAddClient(true)}>
              <Plus size={14} /> Add Client
            </button>
          </div>
          {loading ? (
            <SkeletonTable rows={4} />
          ) : clients.length === 0 ? (
            <div className="empty-state" style={{ padding: 60 }}>
              <div style={{
                width: 56,
                height: 56,
                borderRadius: "50%",
                background: "rgba(168, 85, 247, 0.1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 16,
              }}>
                <Users size={24} style={{ color: "var(--accent-purple, #a855f7)" }} />
              </div>
              <h3>No clients yet</h3>
              <p style={{ color: "var(--text-secondary)", marginBottom: 16 }}>Add clients to associate with invoices and revenue</p>
              <button className="btn btn-primary btn-sm" onClick={() => setShowAddClient(true)}>
                <Plus size={14} /> Add First Client
              </button>
            </div>
          ) : (
            <table>
              <thead>
                <tr><th>Name</th><th>Email</th><th>Company</th><th>GST No.</th></tr>
              </thead>
              <tbody>
                {clients.map((cl) => (
                  <tr key={cl.id}>
                    <td style={{ fontWeight: 600 }}>{cl.name}</td>
                    <td style={{ color: "var(--text-secondary)" }}>{cl.email || "—"}</td>
                    <td>{cl.company || "—"}</td>
                    <td style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>{cl.gstNumber || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Integrations Tab */}
      {activeTab === "integrations" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
          {[
            {
              name: "Founder OS Orchestrator",
              desc: "Heartbeat Protocol events & copilot APIs",
              status: !!process.env.NEXT_PUBLIC_ORCHESTRATOR_URL,
              icon: <Shield size={20} />,
            },
            {
              name: "NextAuth / Google OAuth",
              desc: "User authentication",
              status: true,
              icon: <Shield size={20} />,
            },
            {
              name: "Resend Email",
              desc: "Invoice email delivery",
              status: false,
              icon: <Link2 size={20} />,
              envKey: "RESEND_API_KEY",
            },
          ].map((integration) => (
            <div
              key={integration.name}
              className="table-container"
              style={{ padding: 20 }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                <div style={{
                  width: 40,
                  height: 40,
                  borderRadius: "var(--radius)",
                  background: integration.status
                    ? "rgba(34, 197, 94, 0.1)"
                    : "rgba(239, 68, 68, 0.1)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: integration.status ? "#22c55e" : "#ef4444",
                }}>
                  {integration.icon}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{integration.name}</div>
                  <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>{integration.desc}</div>
                </div>
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  fontSize: 12,
                  fontWeight: 500,
                  color: integration.status ? "#22c55e" : "var(--text-muted)",
                }}>
                  {integration.status ? (
                    <><CheckCircle size={14} /> Connected</>
                  ) : (
                    <><AlertCircle size={14} /> Not configured</>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Account Modal */}
      {showAddAccount && (
        <div className="modal-overlay" onClick={() => setShowAddAccount(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Add Account</h3>
              <button className="btn btn-ghost" onClick={() => setShowAddAccount(false)}><X size={20} /></button>
            </div>
            <div className="form-group">
              <label className="form-label">Account Name</label>
              <input className="form-input" placeholder="e.g., HDFC Current" value={accName} onChange={(e) => setAccName(e.target.value)} />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Type</label>
                <select className="form-input" value={accType} onChange={(e) => setAccType(e.target.value)}>
                  <option value="bank">Bank</option>
                  <option value="cash">Cash</option>
                  <option value="credit">Credit</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Current Balance (₹)</label>
                <input className="form-input" type="number" placeholder="0" value={accBalance} onChange={(e) => setAccBalance(e.target.value)} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowAddAccount(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={addAccount}><Plus size={16} /> Add Account</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Client Modal */}
      {showAddClient && (
        <div className="modal-overlay" onClick={() => setShowAddClient(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Add Client</h3>
              <button className="btn btn-ghost" onClick={() => setShowAddClient(false)}><X size={20} /></button>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Name</label>
                <input className="form-input" placeholder="Client name" value={clientName} onChange={(e) => setClientName(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input className="form-input" type="email" placeholder="email@company.com" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Company</label>
                <input className="form-input" placeholder="Company name" value={clientCompany} onChange={(e) => setClientCompany(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">GST Number</label>
                <input className="form-input" placeholder="22AAAAA0000A1Z5" value={clientGst} onChange={(e) => setClientGst(e.target.value)} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowAddClient(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={addClient}><Users size={16} /> Add Client</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
