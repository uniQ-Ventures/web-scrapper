"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Camera, Search, Trash2, FileText, Upload, X, CheckCircle,
  AlertCircle, Clock, IndianRupee, Calendar, Tag, Building2
} from "lucide-react";
import { useToast } from "@/components/toast";

interface Receipt {
  id: string;
  fileName: string;
  status: string;
  confidence: string | null;
  extractedAmount: string | null;
  extractedVendor: string | null;
  extractedDate: string | null;
  extractedGst: string | null;
  extractedCategory: string | null;
  extractedData: string | null;
  expenseId: string | null;
  createdAt: string;
}

export default function ReceiptsPage() {
  const { toast } = useToast();
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [uploading, setUploading] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const loadReceipts = useCallback(() => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    fetch(`/api/receipts?${params}`)
      .then((r) => r.json())
      .then((d) => { setReceipts(d.receipts || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [search]);

  useEffect(() => { loadReceipts(); }, [loadReceipts]);

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/expenses/ocr", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (res.ok) {
        toast("Receipt scanned successfully!", "success");
        loadReceipts();
        setShowUpload(false);
        // Show extracted data
        if (data.receipt) {
          const newReceipt = await fetch(`/api/receipts/${data.receipt.id}`).then(r => r.json());
          setSelectedReceipt(newReceipt.receipt);
        }
      } else {
        toast(data.error || "Failed to scan receipt", "error");
      }
    } catch {
      toast("Failed to upload receipt", "error");
    }
    setUploading(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) {
      handleUpload(file);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
  };

  const createExpenseFromReceipt = async (receipt: Receipt) => {
    const extracted = receipt.extractedData ? JSON.parse(receipt.extractedData) : {};
    try {
      await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: extracted.description || receipt.fileName,
          amount: Number(receipt.extractedAmount) || 0,
          vendor: receipt.extractedVendor || "",
          date: receipt.extractedDate || new Date().toISOString(),
          source: "receipt_ocr",
          sourceId: receipt.id,
        }),
      });
      toast("Expense created from receipt!", "success");
      loadReceipts();
      setSelectedReceipt(null);
    } catch {
      toast("Failed to create expense", "error");
    }
  };

  const deleteReceipt = async (id: string) => {
    await fetch(`/api/receipts/${id}`, { method: "DELETE" });
    setReceipts((prev) => prev.filter((r) => r.id !== id));
    if (selectedReceipt?.id === id) setSelectedReceipt(null);
    toast("Receipt deleted", "success");
  };

  const STATUS_ICONS: Record<string, { icon: typeof CheckCircle; color: string }> = {
    processed: { icon: CheckCircle, color: "#10B981" },
    pending: { icon: Clock, color: "#F59E0B" },
    failed: { icon: AlertCircle, color: "#EF4444" },
  };

  const formatCurrency = (val: string | null) =>
    val ? `₹${Number(val).toLocaleString("en-IN")}` : "—";

  return (
    <div style={{ padding: "32px 40px", maxWidth: 1200 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, display: "flex", alignItems: "center", gap: 10 }}>
            <Camera size={28} /> Receipt Scanner
          </h1>
          <p style={{ color: "#9CA3AF", marginTop: 4 }}>
            Scan receipts with AI to auto-fill expenses
          </p>
        </div>
        <button
          onClick={() => setShowUpload(true)}
          style={{
            display: "flex", alignItems: "center", gap: 8,
            backgroundColor: "#6366F1", color: "white", border: "none",
            padding: "10px 20px", borderRadius: 8, cursor: "pointer",
            fontWeight: 600, fontSize: 14,
          }}
        >
          <Upload size={16} /> Scan Receipt
        </button>
      </div>

      {/* Search */}
      <div style={{ position: "relative", marginBottom: 24, maxWidth: 400 }}>
        <Search size={16} style={{ position: "absolute", left: 12, top: 12, color: "#6B7280" }} />
        <input
          type="text"
          placeholder="Search by vendor, category..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: "100%", padding: "10px 12px 10px 36px",
            backgroundColor: "#1F2937", border: "1px solid #374151",
            borderRadius: 8, color: "white", fontSize: 14,
          }}
        />
      </div>

      {/* Upload Modal */}
      {showUpload && (
        <div style={{
          position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.6)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50,
        }}>
          <div style={{
            backgroundColor: "#1F2937", borderRadius: 12, padding: 32,
            width: 500, maxHeight: "80vh", position: "relative",
          }}>
            <button
              onClick={() => setShowUpload(false)}
              style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", color: "#9CA3AF", cursor: "pointer" }}
            >
              <X size={20} />
            </button>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>
              📸 Scan Receipt
            </h2>
            <div
              onDragEnter={(e) => { e.preventDefault(); setDragActive(true); }}
              onDragLeave={(e) => { e.preventDefault(); setDragActive(false); }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              style={{
                border: `2px dashed ${dragActive ? "#6366F1" : "#374151"}`,
                borderRadius: 12, padding: 48, textAlign: "center",
                backgroundColor: dragActive ? "rgba(99,102,241,0.1)" : "#111827",
                transition: "all 0.2s",
              }}
            >
              {uploading ? (
                <div>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
                  <p style={{ color: "#9CA3AF" }}>Scanning with Gemini Vision...</p>
                  <div style={{
                    width: 200, height: 4, backgroundColor: "#374151",
                    borderRadius: 4, margin: "16px auto", overflow: "hidden",
                  }}>
                    <div style={{
                      width: "60%", height: "100%", backgroundColor: "#6366F1",
                      borderRadius: 4, animation: "pulse 1.5s infinite",
                    }} />
                  </div>
                </div>
              ) : (
                <>
                  <Camera size={48} style={{ color: "#6366F1", margin: "0 auto 16px" }} />
                  <p style={{ color: "#D1D5DB", fontWeight: 600, marginBottom: 8 }}>
                    Drop a receipt image here
                  </p>
                  <p style={{ color: "#6B7280", fontSize: 13, marginBottom: 16 }}>
                    JPG, PNG, or PDF — AI will extract amount, vendor, date, GST
                  </p>
                  <label style={{
                    display: "inline-flex", alignItems: "center", gap: 8,
                    backgroundColor: "#374151", color: "white", border: "none",
                    padding: "10px 20px", borderRadius: 8, cursor: "pointer",
                    fontWeight: 600, fontSize: 14,
                  }}>
                    <Upload size={16} /> Choose File
                    <input type="file" accept="image/*" onChange={handleFileSelect} style={{ display: "none" }} />
                  </label>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Receipt Detail Modal */}
      {selectedReceipt && (
        <div style={{
          position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.6)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50,
        }}>
          <div style={{
            backgroundColor: "#1F2937", borderRadius: 12, padding: 32,
            width: 560, maxHeight: "80vh", overflow: "auto", position: "relative",
          }}>
            <button
              onClick={() => setSelectedReceipt(null)}
              style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", color: "#9CA3AF", cursor: "pointer" }}
            >
              <X size={20} />
            </button>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 20 }}>
              📄 Extracted Data
            </h2>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div style={{ backgroundColor: "#111827", borderRadius: 8, padding: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#9CA3AF", fontSize: 12, marginBottom: 8 }}>
                  <IndianRupee size={14} /> AMOUNT
                </div>
                <div style={{ fontSize: 24, fontWeight: 700, color: "#10B981" }}>
                  {formatCurrency(selectedReceipt.extractedAmount)}
                </div>
              </div>
              <div style={{ backgroundColor: "#111827", borderRadius: 8, padding: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#9CA3AF", fontSize: 12, marginBottom: 8 }}>
                  <Building2 size={14} /> VENDOR
                </div>
                <div style={{ fontSize: 16, fontWeight: 600 }}>
                  {selectedReceipt.extractedVendor || "Unknown"}
                </div>
              </div>
              <div style={{ backgroundColor: "#111827", borderRadius: 8, padding: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#9CA3AF", fontSize: 12, marginBottom: 8 }}>
                  <Calendar size={14} /> DATE
                </div>
                <div style={{ fontSize: 16, fontWeight: 600 }}>
                  {selectedReceipt.extractedDate
                    ? new Date(selectedReceipt.extractedDate).toLocaleDateString("en-IN")
                    : "Unknown"}
                </div>
              </div>
              <div style={{ backgroundColor: "#111827", borderRadius: 8, padding: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#9CA3AF", fontSize: 12, marginBottom: 8 }}>
                  <Tag size={14} /> CATEGORY
                </div>
                <div style={{ fontSize: 16, fontWeight: 600 }}>
                  {selectedReceipt.extractedCategory || "Uncategorized"}
                </div>
              </div>
            </div>

            {selectedReceipt.extractedGst && (
              <div style={{ marginTop: 16, backgroundColor: "#111827", borderRadius: 8, padding: 16 }}>
                <span style={{ color: "#9CA3AF", fontSize: 12 }}>GSTIN: </span>
                <span style={{ fontFamily: "monospace", fontWeight: 600 }}>{selectedReceipt.extractedGst}</span>
              </div>
            )}

            {/* Confidence */}
            <div style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ color: "#9CA3AF", fontSize: 13 }}>Confidence:</span>
              <div style={{
                flex: 1, height: 6, backgroundColor: "#374151", borderRadius: 4, overflow: "hidden",
              }}>
                <div style={{
                  width: `${(Number(selectedReceipt.confidence) || 0) * 100}%`,
                  height: "100%", backgroundColor: "#6366F1", borderRadius: 4,
                }} />
              </div>
              <span style={{ fontSize: 13, fontWeight: 600 }}>
                {((Number(selectedReceipt.confidence) || 0) * 100).toFixed(0)}%
              </span>
            </div>

            {/* Actions */}
            <div style={{ marginTop: 24, display: "flex", gap: 12 }}>
              {!selectedReceipt.expenseId && (
                <button
                  onClick={() => createExpenseFromReceipt(selectedReceipt)}
                  style={{
                    flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                    backgroundColor: "#10B981", color: "white", border: "none",
                    padding: "10px 16px", borderRadius: 8, cursor: "pointer", fontWeight: 600,
                  }}
                >
                  <FileText size={16} /> Create Expense
                </button>
              )}
              <button
                onClick={() => { deleteReceipt(selectedReceipt.id); setSelectedReceipt(null); }}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  backgroundColor: "#374151", color: "#EF4444", border: "1px solid #EF4444",
                  padding: "10px 16px", borderRadius: 8, cursor: "pointer", fontWeight: 600,
                }}
              >
                <Trash2 size={16} /> Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Receipt Grid */}
      {loading ? (
        <div style={{ textAlign: "center", padding: 80, color: "#6B7280" }}>Loading receipts...</div>
      ) : receipts.length === 0 ? (
        <div style={{
          textAlign: "center", padding: 80, backgroundColor: "#111827",
          borderRadius: 12, border: "1px solid #1F2937",
        }}>
          <Camera size={48} style={{ color: "#374151", margin: "0 auto 16px" }} />
          <p style={{ fontSize: 18, fontWeight: 600, color: "#9CA3AF", marginBottom: 8 }}>
            No receipts scanned yet
          </p>
          <p style={{ color: "#6B7280", fontSize: 14 }}>
            Upload a receipt image and AI will extract the details automatically
          </p>
        </div>
      ) : (
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: 16,
        }}>
          {receipts.map((receipt) => {
            const StatusIcon = STATUS_ICONS[receipt.status]?.icon || Clock;
            const statusColor = STATUS_ICONS[receipt.status]?.color || "#6B7280";

            return (
              <div
                key={receipt.id}
                onClick={() => setSelectedReceipt(receipt)}
                style={{
                  backgroundColor: "#111827", borderRadius: 12,
                  border: "1px solid #1F2937", padding: 20, cursor: "pointer",
                  transition: "border-color 0.2s, transform 0.2s",
                }}
                onMouseEnter={(e) => {
                  (e.target as HTMLElement).style.borderColor = "#6366F1";
                  (e.target as HTMLElement).style.transform = "translateY(-2px)";
                }}
                onMouseLeave={(e) => {
                  (e.target as HTMLElement).style.borderColor = "#1F2937";
                  (e.target as HTMLElement).style.transform = "translateY(0)";
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 12 }}>
                  <div style={{ fontSize: 13, color: "#9CA3AF", maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {receipt.fileName}
                  </div>
                  <StatusIcon size={16} style={{ color: statusColor, flexShrink: 0 }} />
                </div>

                <div style={{ fontSize: 22, fontWeight: 700, color: "#10B981", marginBottom: 8 }}>
                  {formatCurrency(receipt.extractedAmount)}
                </div>

                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>
                  {receipt.extractedVendor || "Unknown Vendor"}
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
                  <span style={{
                    fontSize: 11, backgroundColor: "#1F2937", color: "#9CA3AF",
                    padding: "2px 8px", borderRadius: 4,
                  }}>
                    {receipt.extractedCategory || "Uncategorized"}
                  </span>
                  <span style={{ fontSize: 12, color: "#6B7280" }}>
                    {new Date(receipt.createdAt).toLocaleDateString("en-IN")}
                  </span>
                </div>

                {receipt.expenseId && (
                  <div style={{
                    marginTop: 8, fontSize: 11, color: "#10B981",
                    display: "flex", alignItems: "center", gap: 4,
                  }}>
                    <CheckCircle size={12} /> Linked to expense
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
