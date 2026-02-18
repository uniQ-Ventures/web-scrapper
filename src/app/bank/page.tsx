"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Upload,
  ArrowUpRight,
  ArrowDownLeft,
  Search,
  Filter,
  CheckCircle2,
  Circle,
  Building2,
  TrendingUp,
  TrendingDown,
  Wallet,
  FileSpreadsheet,
  RefreshCw,
  Sparkles,
  AlertCircle,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

interface BankTransaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: "debit" | "credit";
  balance?: number;
  category: string | null;
  vendor: string | null;
  isReconciled: boolean;
  confidence?: number;
  reference?: string;
  bankAccount?: { name: string; bankName: string };
}

interface TransactionSummary {
  totalDebit: number;
  totalCredit: number;
  transactionCount: number;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const CATEGORY_COLORS: Record<string, string> = {
  Payroll: "#6366F1",
  "Rent & Office": "#8B5CF6",
  "Software & SaaS": "#A855F7",
  "Cloud & Infra": "#EC4899",
  Marketing: "#F43F5E",
  Travel: "#EF4444",
  "Food & Meals": "#F97316",
  "Telecom & Internet": "#F59E0B",
  Insurance: "#EAB308",
  "Professional Services": "#84CC16",
  Utilities: "#22C55E",
  "Bank Charges": "#14B8A6",
  "Tax Payments": "#06B6D4",
  "Equipment & Supplies": "#3B82F6",
  "Loan & EMI": "#64748B",
  Investment: "#10B981",
  "Internal Transfer": "#94A3B8",
  "Income / Revenue": "#22C55E",
  "Client Payment": "#22C55E",
  Uncategorized: "#9CA3AF",
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function BankPage() {
  const [transactions, setTransactions] = useState<BankTransaction[]>([]);
  const [summary, setSummary] = useState<TransactionSummary>({
    totalDebit: 0,
    totalCredit: 0,
    transactionCount: 0,
  });
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{
    imported: number;
    skipped: number;
  } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchTransactions = useCallback(
    async (page = 1) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ page: String(page), limit: "50" });
        if (searchQuery) params.set("search", searchQuery);
        if (typeFilter) params.set("type", typeFilter);
        if (categoryFilter) params.set("category", categoryFilter);

        const res = await fetch(`/api/bank/transactions?${params}`);
        const data = await res.json();

        setTransactions(data.transactions || []);
        setSummary(data.summary || { totalDebit: 0, totalCredit: 0, transactionCount: 0 });
        setPagination(data.pagination || { page: 1, limit: 50, total: 0, totalPages: 0 });
      } catch (err) {
        console.error("Failed to fetch transactions:", err);
      } finally {
        setLoading(false);
      }
    },
    [searchQuery, typeFilter, categoryFilter]
  );

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  async function handleFileUpload(file: File) {
    if (!file) return;
    setUploading(true);
    setUploadResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/bank/import", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Import failed");
        return;
      }

      setUploadResult({ imported: data.imported, skipped: data.skipped });
      fetchTransactions();
    } catch (err) {
      console.error("Upload error:", err);
      alert("Failed to upload file");
    } finally {
      setUploading(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setDragActive(true);
  }

  function handleDragLeave() {
    setDragActive(false);
  }

  // Empty state
  const isEmpty = !loading && transactions.length === 0 && !searchQuery && !typeFilter && !categoryFilter;

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <Building2 size={24} /> Bank Transactions
          </h1>
          <p className="page-subtitle">
            Import and categorize bank statements automatically
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            className="btn btn-secondary"
            onClick={() => fetchTransactions(pagination.page)}
            disabled={loading}
          >
            <RefreshCw size={16} className={loading ? "spin" : ""} />
            Refresh
          </button>
          <button
            className="btn btn-primary"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            <Upload size={16} />
            {uploading ? "Importing..." : "Import CSV"}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.txt"
            style={{ display: "none" }}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileUpload(file);
              e.target.value = "";
            }}
          />
        </div>
      </div>

      {/* Upload Result Toast */}
      {uploadResult && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "12px 16px",
            background: "rgba(34, 197, 94, 0.1)",
            border: "1px solid rgba(34, 197, 94, 0.3)",
            borderRadius: 12,
            marginBottom: 24,
            color: "#22C55E",
          }}
        >
          <CheckCircle2 size={18} />
          <span>
            Imported <strong>{uploadResult.imported}</strong> transactions
            {uploadResult.skipped > 0 && (
              <> · {uploadResult.skipped} duplicates skipped</>
            )}
          </span>
          <button
            onClick={() => setUploadResult(null)}
            style={{ marginLeft: "auto", background: "none", border: "none", color: "inherit", cursor: "pointer" }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Summary KPIs */}
      {!isEmpty && (
        <div className="kpi-grid" style={{ marginBottom: 24 }}>
          <div className="kpi-card">
            <div className="kpi-label">
              <Wallet size={14} /> Transactions
            </div>
            <div className="kpi-value">{summary.transactionCount}</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-label" style={{ color: "#22C55E" }}>
              <TrendingUp size={14} /> Total Credits
            </div>
            <div className="kpi-value" style={{ color: "#22C55E" }}>
              {formatCurrency(summary.totalCredit)}
            </div>
          </div>
          <div className="kpi-card">
            <div className="kpi-label" style={{ color: "#F43F5E" }}>
              <TrendingDown size={14} /> Total Debits
            </div>
            <div className="kpi-value" style={{ color: "#F43F5E" }}>
              {formatCurrency(summary.totalDebit)}
            </div>
          </div>
          <div className="kpi-card">
            <div className="kpi-label">
              <Sparkles size={14} /> Net Flow
            </div>
            <div
              className="kpi-value"
              style={{
                color:
                  summary.totalCredit - summary.totalDebit >= 0
                    ? "#22C55E"
                    : "#F43F5E",
              }}
            >
              {formatCurrency(summary.totalCredit - summary.totalDebit)}
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      {!isEmpty && (
        <div
          style={{
            display: "flex",
            gap: 12,
            marginBottom: 20,
            flexWrap: "wrap",
          }}
        >
          <div style={{ position: "relative", flex: "1 1 240px" }}>
            <Search
              size={16}
              style={{
                position: "absolute",
                left: 12,
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--text-secondary)",
              }}
            />
            <input
              type="text"
              placeholder="Search transactions..."
              className="input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: 36 }}
            />
          </div>
          <select
            className="input"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            style={{ flex: "0 0 160px" }}
          >
            <option value="">All Types</option>
            <option value="debit">Debits</option>
            <option value="credit">Credits</option>
          </select>
          <select
            className="input"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            style={{ flex: "0 0 200px" }}
          >
            <option value="">All Categories</option>
            {Object.keys(CATEGORY_COLORS).map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Empty State / Drop Zone */}
      {isEmpty && (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 16,
            padding: "80px 40px",
            border: `2px dashed ${dragActive ? "var(--accent-primary)" : "var(--border-color)"}`,
            borderRadius: 16,
            background: dragActive
              ? "rgba(99, 102, 241, 0.05)"
              : "var(--bg-card)",
            transition: "all 0.2s ease",
            cursor: "pointer",
          }}
          onClick={() => fileInputRef.current?.click()}
        >
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: "50%",
              background: "linear-gradient(135deg, #6366F1, #A855F7)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <FileSpreadsheet size={28} color="white" />
          </div>
          <h3 style={{ margin: 0, fontSize: 18, color: "var(--text-primary)" }}>
            Import Your Bank Statement
          </h3>
          <p
            style={{
              margin: 0,
              color: "var(--text-secondary)",
              maxWidth: 400,
              textAlign: "center",
              lineHeight: 1.6,
            }}
          >
            Drag and drop a CSV file here, or click to browse. Your transactions
            will be automatically categorized using AI.
          </p>
          <div
            style={{
              display: "flex",
              gap: 8,
              marginTop: 8,
              color: "var(--text-tertiary)",
              fontSize: 13,
            }}
          >
            <span>Supports:</span>
            <span
              style={{
                padding: "2px 8px",
                background: "var(--bg-tertiary)",
                borderRadius: 4,
              }}
            >
              CSV
            </span>
            <span
              style={{
                padding: "2px 8px",
                background: "var(--bg-tertiary)",
                borderRadius: 4,
              }}
            >
              SBI
            </span>
            <span
              style={{
                padding: "2px 8px",
                background: "var(--bg-tertiary)",
                borderRadius: 4,
              }}
            >
              HDFC
            </span>
            <span
              style={{
                padding: "2px 8px",
                background: "var(--bg-tertiary)",
                borderRadius: 4,
              }}
            >
              ICICI
            </span>
            <span
              style={{
                padding: "2px 8px",
                background: "var(--bg-tertiary)",
                borderRadius: 4,
              }}
            >
              Axis
            </span>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && !isEmpty && (
        <div style={{ textAlign: "center", padding: 40, color: "var(--text-secondary)" }}>
          <RefreshCw size={24} className="spin" style={{ marginBottom: 8 }} />
          <p>Loading transactions...</p>
        </div>
      )}

      {/* Transactions Table */}
      {!loading && !isEmpty && transactions.length > 0 && (
        <>
          <div className="table-container" style={{ borderRadius: 12, overflow: "hidden" }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Description</th>
                  <th>Category</th>
                  <th>Vendor</th>
                  <th style={{ textAlign: "right" }}>Amount</th>
                  <th style={{ textAlign: "right" }}>Balance</th>
                  <th style={{ textAlign: "center" }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => (
                  <tr key={tx.id}>
                    <td style={{ whiteSpace: "nowrap", fontSize: 13 }}>
                      {formatDate(tx.date)}
                    </td>
                    <td>
                      <div
                        style={{
                          maxWidth: 280,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          fontSize: 13,
                        }}
                        title={tx.description}
                      >
                        {tx.description}
                      </div>
                      {tx.reference && (
                        <div
                          style={{
                            fontSize: 11,
                            color: "var(--text-tertiary)",
                            marginTop: 2,
                          }}
                        >
                          Ref: {tx.reference}
                        </div>
                      )}
                    </td>
                    <td>
                      {tx.category && (
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6,
                            padding: "3px 10px",
                            borderRadius: 20,
                            fontSize: 12,
                            fontWeight: 500,
                            background: `${CATEGORY_COLORS[tx.category] || "#9CA3AF"}18`,
                            color: CATEGORY_COLORS[tx.category] || "#9CA3AF",
                            border: `1px solid ${CATEGORY_COLORS[tx.category] || "#9CA3AF"}30`,
                          }}
                        >
                          {tx.category}
                        </span>
                      )}
                    </td>
                    <td
                      style={{
                        fontSize: 13,
                        color: "var(--text-secondary)",
                        maxWidth: 160,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {tx.vendor || "—"}
                    </td>
                    <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                      <div
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                          color: tx.type === "credit" ? "#22C55E" : "#F43F5E",
                          fontWeight: 600,
                          fontSize: 13,
                        }}
                      >
                        {tx.type === "credit" ? (
                          <ArrowDownLeft size={14} />
                        ) : (
                          <ArrowUpRight size={14} />
                        )}
                        {formatCurrency(Number(tx.amount))}
                      </div>
                    </td>
                    <td
                      style={{
                        textAlign: "right",
                        fontSize: 13,
                        color: "var(--text-secondary)",
                      }}
                    >
                      {tx.balance != null
                        ? formatCurrency(Number(tx.balance))
                        : "—"}
                    </td>
                    <td style={{ textAlign: "center" }}>
                      {tx.isReconciled ? (
                        <CheckCircle2 size={16} color="#22C55E" />
                      ) : (
                        <Circle size={16} color="var(--text-tertiary)" />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginTop: 16,
                padding: "12px 0",
              }}
            >
              <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                Showing {(pagination.page - 1) * pagination.limit + 1}–
                {Math.min(
                  pagination.page * pagination.limit,
                  pagination.total
                )}{" "}
                of {pagination.total}
              </span>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  className="btn btn-secondary"
                  disabled={pagination.page <= 1}
                  onClick={() => fetchTransactions(pagination.page - 1)}
                  style={{ padding: "6px 12px" }}
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  className="btn btn-secondary"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => fetchTransactions(pagination.page + 1)}
                  style={{ padding: "6px 12px" }}
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* No results for search/filter */}
      {!loading && !isEmpty && transactions.length === 0 && (
        <div
          style={{
            textAlign: "center",
            padding: 60,
            color: "var(--text-secondary)",
          }}
        >
          <AlertCircle
            size={40}
            style={{ marginBottom: 12, opacity: 0.5 }}
          />
          <p>No transactions match your filters</p>
        </div>
      )}

      {/* Spinner animation */}
      <style jsx>{`
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        :global(.spin) {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </div>
  );
}
