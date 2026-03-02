/**
 * Generic CSV importer with smart column detection for historical financial data.
 * Supports importing into Expenses, Revenue, and Invoice tables.
 */

import { parseCSV } from "./bank-import";

// ── Target Types ────────────────────────────────────────────────────

export type ImportTarget = "expenses" | "revenue" | "invoices";

export interface ColumnMappingDef {
  field: string;       // target database field name
  label: string;       // human-readable label
  required: boolean;
  type: "string" | "number" | "date";
  aliases: string[];   // auto-detect aliases
}

export interface PreviewRow {
  [key: string]: string | number | boolean | string[] | null;
  _valid: boolean;
  _errors: string[];
}

// ── Column Definitions Per Target ───────────────────────────────────

export const TARGET_COLUMNS: Record<ImportTarget, ColumnMappingDef[]> = {
  expenses: [
    {
      field: "description",
      label: "Description",
      required: true,
      type: "string",
      aliases: ["description", "narration", "details", "particulars", "memo", "expense", "name", "item"],
    },
    {
      field: "amount",
      label: "Amount",
      required: true,
      type: "number",
      aliases: ["amount", "total", "cost", "value", "price", "debit", "expense amount"],
    },
    {
      field: "date",
      label: "Date",
      required: true,
      type: "date",
      aliases: ["date", "txn date", "transaction date", "expense date", "invoice date", "bill date"],
    },
    {
      field: "vendor",
      label: "Vendor",
      required: false,
      type: "string",
      aliases: ["vendor", "supplier", "payee", "paid to", "merchant", "company"],
    },
    {
      field: "category",
      label: "Category",
      required: false,
      type: "string",
      aliases: ["category", "type", "expense type", "group", "head", "ledger"],
    },
    {
      field: "notes",
      label: "Notes",
      required: false,
      type: "string",
      aliases: ["notes", "remarks", "comment", "memo", "reference"],
    },
    {
      field: "department",
      label: "Department",
      required: false,
      type: "string",
      aliases: ["department", "dept", "cost center", "division", "team"],
    },
  ],
  revenue: [
    {
      field: "amount",
      label: "Amount",
      required: true,
      type: "number",
      aliases: ["amount", "total", "revenue", "income", "value", "credit", "received"],
    },
    {
      field: "month",
      label: "Month / Date",
      required: true,
      type: "date",
      aliases: ["month", "date", "period", "billing date", "invoice date"],
    },
    {
      field: "type",
      label: "Type",
      required: false,
      type: "string",
      aliases: ["type", "revenue type", "category", "source type"],
    },
    {
      field: "source",
      label: "Source / Client",
      required: false,
      type: "string",
      aliases: ["source", "client", "customer", "company", "account", "from"],
    },
    {
      field: "notes",
      label: "Notes",
      required: false,
      type: "string",
      aliases: ["notes", "description", "remarks", "memo", "details"],
    },
  ],
  invoices: [
    {
      field: "invoiceNumber",
      label: "Invoice Number",
      required: true,
      type: "string",
      aliases: ["invoice number", "invoice no", "inv no", "bill no", "number", "id", "invoice #"],
    },
    {
      field: "total",
      label: "Total Amount",
      required: true,
      type: "number",
      aliases: ["total", "amount", "grand total", "invoice amount", "bill amount", "value"],
    },
    {
      field: "issueDate",
      label: "Issue Date",
      required: true,
      type: "date",
      aliases: ["issue date", "invoice date", "date", "bill date", "created"],
    },
    {
      field: "dueDate",
      label: "Due Date",
      required: false,
      type: "date",
      aliases: ["due date", "payment due", "due", "due by"],
    },
    {
      field: "status",
      label: "Status",
      required: false,
      type: "string",
      aliases: ["status", "state", "payment status"],
    },
    {
      field: "clientName",
      label: "Client Name",
      required: false,
      type: "string",
      aliases: ["client", "customer", "bill to", "company", "name"],
    },
    {
      field: "notes",
      label: "Notes",
      required: false,
      type: "string",
      aliases: ["notes", "description", "remarks", "memo"],
    },
  ],
};

// ── Auto-detect column mapping ──────────────────────────────────────

export function autoDetectMapping(
  headers: string[],
  target: ImportTarget
): Record<string, string> {
  const mapping: Record<string, string> = {};
  const columns = TARGET_COLUMNS[target];
  const lowerHeaders = headers.map((h) => h.toLowerCase().trim());
  const usedHeaders = new Set<number>();

  for (const col of columns) {
    for (const alias of col.aliases) {
      const idx = lowerHeaders.findIndex(
        (h, i) => !usedHeaders.has(i) && (h === alias || h.includes(alias))
      );
      if (idx !== -1) {
        mapping[col.field] = headers[idx];
        usedHeaders.add(idx);
        break;
      }
    }
  }

  return mapping;
}

// ── Parse & Validate ────────────────────────────────────────────────

function parseAmount(value: string): number {
  if (!value || value.trim() === "" || value.trim() === "-") return 0;
  const cleaned = value.replace(/[₹$,\s]/g, "").replace(/\((.+)\)/, "-$1");
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : Math.abs(num);
}

function parseDate(value: string): Date | null {
  if (!value || value.trim() === "") return null;

  // dd/mm/yyyy or dd-mm-yyyy
  const dmy = value.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmy) {
    return new Date(parseInt(dmy[3]), parseInt(dmy[2]) - 1, parseInt(dmy[1]));
  }

  // yyyy-mm-dd
  const iso = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) {
    return new Date(parseInt(iso[1]), parseInt(iso[2]) - 1, parseInt(iso[3]));
  }

  // Mon yyyy (e.g., "Feb 2026") for revenue months
  const monyyyy = value.match(
    /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*[\s\-\/]*(\d{4})$/i
  );
  if (monyyyy) {
    const months: Record<string, number> = {
      jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
      jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
    };
    return new Date(parseInt(monyyyy[2]), months[monyyyy[1].toLowerCase().substring(0, 3)], 1);
  }

  // dd Mon yyyy
  const ddmonyyyy = value.match(
    /^(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+(\d{4})$/i
  );
  if (ddmonyyyy) {
    const months: Record<string, number> = {
      jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
      jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
    };
    return new Date(
      parseInt(ddmonyyyy[3]),
      months[ddmonyyyy[2].toLowerCase().substring(0, 3)],
      parseInt(ddmonyyyy[1])
    );
  }

  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

export function validateAndPreview(
  csvText: string,
  target: ImportTarget,
  mapping: Record<string, string>
): { preview: PreviewRow[]; validCount: number; errorCount: number } {
  const { rows } = parseCSV(csvText);
  const columns = TARGET_COLUMNS[target];
  const preview: PreviewRow[] = [];
  let validCount = 0;
  let errorCount = 0;

  for (const row of rows.slice(0, 100)) {
    // limit preview to 100 rows
    const parsed: PreviewRow = { _valid: true, _errors: [] };

    for (const col of columns) {
      const csvColumn = mapping[col.field];
      const rawValue = csvColumn ? (row[csvColumn] || "").trim() : "";

      if (col.required && !rawValue) {
        parsed._valid = false;
        (parsed._errors as string[]).push(`${col.label} is required`);
        parsed[col.field] = null;
        continue;
      }

      if (!rawValue) {
        parsed[col.field] = null;
        continue;
      }

      switch (col.type) {
        case "number": {
          const num = parseAmount(rawValue);
          if (num === 0 && col.required) {
            parsed._valid = false;
            (parsed._errors as string[]).push(`${col.label}: invalid number`);
          }
          parsed[col.field] = num;
          break;
        }
        case "date": {
          const date = parseDate(rawValue);
          if (!date && col.required) {
            parsed._valid = false;
            (parsed._errors as string[]).push(`${col.label}: invalid date`);
          }
          parsed[col.field] = date ? date.toISOString() : null;
          break;
        }
        default:
          parsed[col.field] = rawValue;
      }
    }

    if (parsed._valid) validCount++;
    else errorCount++;

    preview.push(parsed);
  }

  return { preview, validCount, errorCount };
}

// ── Transform for Database Insert ───────────────────────────────────

export function transformForInsert(
  preview: PreviewRow[],
  target: ImportTarget,
  userId: string,
  organizationId?: string | null
): Record<string, unknown>[] {
  return preview
    .filter((row) => row._valid)
    .map((row) => {
      switch (target) {
        case "expenses":
          return {
            description: row.description || "Imported Expense",
            amount: row.amount || 0,
            date: row.date ? new Date(row.date as string) : new Date(),
            vendor: row.vendor || null,
            notes: row.notes || null,
            department: row.department || null,
            source: "csv_import",
            userId,
            organizationId,
          };
        case "revenue":
          return {
            amount: row.amount || 0,
            month: row.month ? new Date(row.month as string) : new Date(),
            type: (row.type as string) || "recurring",
            source: row.source || null,
            notes: row.notes || null,
            userId,
            organizationId,
          };
        case "invoices":
          return {
            invoiceNumber: row.invoiceNumber || `IMP-${Date.now()}`,
            total: row.total || 0,
            subtotal: row.total || 0,
            taxTotal: 0,
            issueDate: row.issueDate
              ? new Date(row.issueDate as string)
              : new Date(),
            dueDate: row.dueDate
              ? new Date(row.dueDate as string)
              : new Date(Date.now() + 30 * 86400000),
            status: normalizeStatus(row.status as string),
            notes: row.notes || null,
            source: "csv_import",
            userId,
            organizationId,
          };
        default:
          return {};
      }
    });
}

function normalizeStatus(status: string | null): string {
  if (!status) return "draft";
  const s = status.toLowerCase().trim();
  if (s.includes("paid")) return "paid";
  if (s.includes("sent") || s.includes("pending") || s.includes("due"))
    return "sent";
  if (s.includes("overdue") || s.includes("late")) return "overdue";
  if (s.includes("cancel")) return "cancelled";
  return "draft";
}
