"use client";

import { useState, useRef } from "react";
import {
  Upload,
  FileSpreadsheet,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  X,
  Sparkles,
  Download,
  Table2,
  Loader2,
} from "lucide-react";

type ImportTarget = "expenses" | "revenue" | "invoices";
type Step = "upload" | "mapping" | "preview" | "result";

interface ColumnDef {
  field: string;
  label: string;
  required: boolean;
  type: string;
}

interface PreviewRow {
  [key: string]: string | number | boolean | string[] | null;
  _valid: boolean;
  _errors: string[];
}

const TARGET_INFO: Record<
  ImportTarget,
  { label: string; description: string; icon: string; color: string }
> = {
  expenses: {
    label: "Expenses",
    description: "Import historical expense records",
    icon: "💳",
    color: "#F43F5E",
  },
  revenue: {
    label: "Revenue",
    description: "Import monthly revenue data",
    icon: "📈",
    color: "#22C55E",
  },
  invoices: {
    label: "Invoices",
    description: "Import past invoices",
    icon: "📄",
    color: "#6366F1",
  },
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function ImportPage() {
  const [step, setStep] = useState<Step>("upload");
  const [target, setTarget] = useState<ImportTarget>("expenses");
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [targetColumns, setTargetColumns] = useState<ColumnDef[]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [preview, setPreview] = useState<PreviewRow[]>([]);
  const [validCount, setValidCount] = useState(0);
  const [errorCount, setErrorCount] = useState(0);
  const [importResult, setImportResult] = useState<{
    imported: number;
    failed: number;
    target: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Step 1: Upload & Detect ───────────────────────────────
  async function handleFileSelect(selectedFile: File) {
    setFile(selectedFile);
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("action", "detect");
      formData.append("target", target);

      const res = await fetch("/api/import/csv", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Failed to parse CSV");
        return;
      }

      setHeaders(data.headers);
      setMapping(data.mapping);
      setTargetColumns(data.targetColumns);
      setTotalRows(data.totalRows);
      setStep("mapping");
    } catch (err) {
      console.error("Detect error:", err);
      alert("Failed to process file");
    } finally {
      setLoading(false);
    }
  }

  // ── Step 2: Preview ───────────────────────────────────────
  async function handlePreview() {
    if (!file) return;
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("action", "preview");
      formData.append("target", target);
      formData.append("mapping", JSON.stringify(mapping));

      const res = await fetch("/api/import/csv", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Preview failed");
        return;
      }

      setPreview(data.preview);
      setValidCount(data.validCount);
      setErrorCount(data.errorCount);
      setStep("preview");
    } catch (err) {
      console.error("Preview error:", err);
    } finally {
      setLoading(false);
    }
  }

  // ── Step 3: Import ────────────────────────────────────────
  async function handleImport() {
    if (!file) return;
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("action", "import");
      formData.append("target", target);
      formData.append("mapping", JSON.stringify(mapping));

      const res = await fetch("/api/import/csv", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Import failed");
        return;
      }

      setImportResult({
        imported: data.imported,
        failed: data.failed,
        target: data.target,
      });
      setStep("result");
    } catch (err) {
      console.error("Import error:", err);
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setStep("upload");
    setFile(null);
    setHeaders([]);
    setMapping({});
    setPreview([]);
    setImportResult(null);
  }

  // ── Step Indicator ────────────────────────────────────────
  const steps = [
    { id: "upload", label: "Upload" },
    { id: "mapping", label: "Mapping" },
    { id: "preview", label: "Preview" },
    { id: "result", label: "Done" },
  ];
  const stepIdx = steps.findIndex((s) => s.id === step);

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <Download size={24} /> Import Historical Data
          </h1>
          <p className="page-subtitle">
            Bulk import your existing financial data from CSV files
          </p>
        </div>
      </div>

      {/* Step Progress */}
      <div
        style={{
          display: "flex",
          gap: 0,
          marginBottom: 32,
          background: "var(--bg-card)",
          borderRadius: 12,
          padding: 4,
          border: "1px solid var(--border-color)",
        }}
      >
        {steps.map((s, i) => (
          <div
            key={s.id}
            style={{
              flex: 1,
              padding: "10px 16px",
              textAlign: "center",
              fontSize: 13,
              fontWeight: i <= stepIdx ? 600 : 400,
              color:
                i <= stepIdx
                  ? "var(--text-primary)"
                  : "var(--text-tertiary)",
              background:
                i === stepIdx
                  ? "var(--accent-primary)"
                  : i < stepIdx
                    ? "rgba(99, 102, 241, 0.15)"
                    : "transparent",
              borderRadius: 8,
              transition: "all 0.2s ease",
            }}
          >
            {i + 1}. {s.label}
          </div>
        ))}
      </div>

      {/* ── Step 1: Upload ───────────────────────────────── */}
      {step === "upload" && (
        <div>
          {/* Target selector */}
          <h3
            style={{
              margin: "0 0 16px",
              fontSize: 15,
              color: "var(--text-secondary)",
            }}
          >
            What are you importing?
          </h3>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 12,
              marginBottom: 32,
            }}
          >
            {(Object.entries(TARGET_INFO) as [ImportTarget, typeof TARGET_INFO["expenses"]][]).map(
              ([key, info]) => (
                <button
                  key={key}
                  onClick={() => setTarget(key)}
                  style={{
                    padding: "20px 16px",
                    background:
                      target === key
                        ? `${info.color}15`
                        : "var(--bg-card)",
                    border: `2px solid ${target === key ? info.color : "var(--border-color)"
                      }`,
                    borderRadius: 12,
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "all 0.2s ease",
                  }}
                >
                  <div style={{ fontSize: 28, marginBottom: 8 }}>
                    {info.icon}
                  </div>
                  <div
                    style={{
                      fontSize: 15,
                      fontWeight: 600,
                      color: "var(--text-primary)",
                      marginBottom: 4,
                    }}
                  >
                    {info.label}
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: "var(--text-secondary)",
                    }}
                  >
                    {info.description}
                  </div>
                </button>
              )
            )}
          </div>

          {/* File drop zone */}
          <div
            onDrop={(e) => {
              e.preventDefault();
              setDragActive(false);
              const f = e.dataTransfer.files[0];
              if (f) handleFileSelect(f);
            }}
            onDragOver={(e) => {
              e.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onClick={() => fileInputRef.current?.click()}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 16,
              padding: "60px 40px",
              border: `2px dashed ${dragActive
                  ? "var(--accent-primary)"
                  : "var(--border-color)"
                }`,
              borderRadius: 16,
              background: dragActive
                ? "rgba(99, 102, 241, 0.05)"
                : "var(--bg-card)",
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
          >
            {loading ? (
              <>
                <Loader2
                  size={32}
                  style={{ animation: "spin 1s linear infinite" }}
                  color="var(--accent-primary)"
                />
                <p style={{ color: "var(--text-secondary)" }}>
                  Analyzing file...
                </p>
              </>
            ) : (
              <>
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: "50%",
                    background:
                      "linear-gradient(135deg, #6366F1, #A855F7)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <FileSpreadsheet size={24} color="white" />
                </div>
                <p
                  style={{
                    margin: 0,
                    fontWeight: 600,
                    color: "var(--text-primary)",
                  }}
                >
                  Drop your CSV file here
                </p>
                <p
                  style={{
                    margin: 0,
                    fontSize: 13,
                    color: "var(--text-secondary)",
                    textAlign: "center",
                  }}
                >
                  Supports Tally, Zoho Books, QuickBooks, and generic CSV
                  exports
                </p>
              </>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.txt"
            style={{ display: "none" }}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFileSelect(f);
              e.target.value = "";
            }}
          />
        </div>
      )}

      {/* ── Step 2: Column Mapping ───────────────────────── */}
      {step === "mapping" && (
        <div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 24,
            }}
          >
            <div>
              <h3
                style={{
                  margin: "0 0 4px",
                  fontSize: 16,
                  color: "var(--text-primary)",
                }}
              >
                <Sparkles
                  size={16}
                  style={{ marginRight: 6, color: "#A855F7" }}
                />
                Column Mapping
              </h3>
              <p
                style={{
                  margin: 0,
                  fontSize: 13,
                  color: "var(--text-secondary)",
                }}
              >
                {file?.name} · {totalRows} rows detected
              </p>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gap: 12,
              maxWidth: 600,
            }}
          >
            {targetColumns.map((col) => (
              <div
                key={col.field}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "12px 16px",
                  background: "var(--bg-card)",
                  borderRadius: 10,
                  border: "1px solid var(--border-color)",
                }}
              >
                <div style={{ flex: "1 1 180px" }}>
                  <span
                    style={{
                      fontSize: 14,
                      fontWeight: 500,
                      color: "var(--text-primary)",
                    }}
                  >
                    {col.label}
                  </span>
                  {col.required && (
                    <span
                      style={{
                        marginLeft: 6,
                        fontSize: 11,
                        color: "#F43F5E",
                        fontWeight: 600,
                      }}
                    >
                      Required
                    </span>
                  )}
                </div>
                <ArrowRight
                  size={14}
                  color="var(--text-tertiary)"
                />
                <select
                  className="input"
                  value={mapping[col.field] || ""}
                  onChange={(e) =>
                    setMapping((prev) => ({
                      ...prev,
                      [col.field]: e.target.value,
                    }))
                  }
                  style={{
                    flex: "1 1 200px",
                    background: mapping[col.field]
                      ? "rgba(99, 102, 241, 0.08)"
                      : undefined,
                    borderColor: mapping[col.field]
                      ? "rgba(99, 102, 241, 0.4)"
                      : undefined,
                  }}
                >
                  <option value="">— Skip —</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          <div
            style={{
              display: "flex",
              gap: 12,
              marginTop: 24,
              justifyContent: "flex-end",
            }}
          >
            <button className="btn btn-secondary" onClick={reset}>
              <ArrowLeft size={16} /> Back
            </button>
            <button
              className="btn btn-primary"
              onClick={handlePreview}
              disabled={loading || !hasRequiredMappings()}
            >
              {loading ? (
                <Loader2
                  size={16}
                  style={{ animation: "spin 1s linear infinite" }}
                />
              ) : (
                <Table2 size={16} />
              )}
              Preview Data
            </button>
          </div>
        </div>
      )}

      {/* ── Step 3: Preview ──────────────────────────────── */}
      {step === "preview" && (
        <div>
          {/* Summary */}
          <div
            style={{
              display: "flex",
              gap: 16,
              marginBottom: 24,
            }}
          >
            <div
              className="kpi-card"
              style={{ flex: 1 }}
            >
              <div className="kpi-label">
                <CheckCircle2 size={14} color="#22C55E" /> Valid Rows
              </div>
              <div className="kpi-value" style={{ color: "#22C55E" }}>
                {validCount}
              </div>
            </div>
            <div
              className="kpi-card"
              style={{ flex: 1 }}
            >
              <div className="kpi-label">
                <AlertTriangle size={14} color="#F59E0B" /> Errors
              </div>
              <div className="kpi-value" style={{ color: errorCount > 0 ? "#F59E0B" : "var(--text-secondary)" }}>
                {errorCount}
              </div>
            </div>
            <div
              className="kpi-card"
              style={{ flex: 1 }}
            >
              <div className="kpi-label">
                <FileSpreadsheet size={14} /> Total Rows
              </div>
              <div className="kpi-value">{totalRows}</div>
            </div>
          </div>

          {/* Preview Table */}
          <div
            className="table-container"
            style={{ borderRadius: 12, overflow: "auto", maxHeight: 480 }}
          >
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: 50 }}>#</th>
                  {targetColumns
                    .filter((c) => mapping[c.field])
                    .map((c) => (
                      <th key={c.field}>{c.label}</th>
                    ))}
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {preview.slice(0, 50).map((row, i) => (
                  <tr
                    key={i}
                    style={{
                      opacity: row._valid ? 1 : 0.6,
                      background: !row._valid
                        ? "rgba(245, 158, 11, 0.05)"
                        : undefined,
                    }}
                  >
                    <td style={{ fontSize: 12, color: "var(--text-tertiary)" }}>
                      {i + 1}
                    </td>
                    {targetColumns
                      .filter((c) => mapping[c.field])
                      .map((c) => (
                        <td
                          key={c.field}
                          style={{
                            fontSize: 13,
                            maxWidth: 200,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {c.type === "number" && row[c.field] != null
                            ? formatCurrency(Number(row[c.field]))
                            : c.type === "date" && row[c.field]
                              ? new Date(
                                row[c.field] as string
                              ).toLocaleDateString("en-IN", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              })
                              : (row[c.field] as string) || "—"}
                        </td>
                      ))}
                    <td>
                      {row._valid ? (
                        <CheckCircle2 size={14} color="#22C55E" />
                      ) : (
                        <span
                          style={{
                            fontSize: 11,
                            color: "#F59E0B",
                          }}
                          title={(row._errors as string[]).join(", ")}
                        >
                          <AlertTriangle
                            size={14}
                            style={{ verticalAlign: "middle" }}
                          />{" "}
                          {(row._errors as string[])[0]}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {preview.length > 50 && (
            <p
              style={{
                fontSize: 12,
                color: "var(--text-tertiary)",
                marginTop: 8,
                textAlign: "center",
              }}
            >
              Showing first 50 of {preview.length} rows
            </p>
          )}

          <div
            style={{
              display: "flex",
              gap: 12,
              marginTop: 24,
              justifyContent: "flex-end",
            }}
          >
            <button
              className="btn btn-secondary"
              onClick={() => setStep("mapping")}
            >
              <ArrowLeft size={16} /> Adjust Mapping
            </button>
            <button
              className="btn btn-primary"
              onClick={handleImport}
              disabled={loading || validCount === 0}
            >
              {loading ? (
                <Loader2
                  size={16}
                  style={{ animation: "spin 1s linear infinite" }}
                />
              ) : (
                <Upload size={16} />
              )}
              Import {validCount} {TARGET_INFO[target].label}
            </button>
          </div>
        </div>
      )}

      {/* ── Step 4: Result ───────────────────────────────── */}
      {step === "result" && importResult && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 20,
            padding: "80px 40px",
          }}
        >
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: "50%",
              background:
                importResult.failed > 0
                  ? "rgba(245, 158, 11, 0.1)"
                  : "rgba(34, 197, 94, 0.1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {importResult.failed > 0 ? (
              <AlertTriangle size={32} color="#F59E0B" />
            ) : (
              <CheckCircle2 size={32} color="#22C55E" />
            )}
          </div>
          <h2
            style={{
              margin: 0,
              fontSize: 22,
              color: "var(--text-primary)",
            }}
          >
            {importResult.failed > 0
              ? "Import Partially Complete"
              : "Import Successful!"}
          </h2>
          <p
            style={{
              margin: 0,
              color: "var(--text-secondary)",
              textAlign: "center",
              maxWidth: 400,
              lineHeight: 1.6,
            }}
          >
            <strong>{importResult.imported}</strong>{" "}
            {TARGET_INFO[target].label.toLowerCase()} imported successfully
            {importResult.failed > 0 && (
              <>
                {" "}
                · <strong>{importResult.failed}</strong> failed
              </>
            )}
          </p>
          <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
            <button className="btn btn-secondary" onClick={reset}>
              Import More
            </button>
            <a
              href={`/${target === "invoices" ? "invoices" : target}`}
              className="btn btn-primary"
              style={{ textDecoration: "none" }}
            >
              View {TARGET_INFO[target].label} <ArrowRight size={16} />
            </a>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );

  function hasRequiredMappings(): boolean {
    return targetColumns
      .filter((c) => c.required)
      .every((c) => mapping[c.field]);
  }
}
