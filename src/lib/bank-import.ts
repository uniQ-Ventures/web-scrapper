import { createHash } from "crypto";

interface CSVParseOptions {
  delimiter?: string;
  hasHeader?: boolean;
}

interface ParsedRow {
  [key: string]: string;
}

interface ColumnMapping {
  date: string;
  description: string;
  amount?: string;       // single amount column (negative = debit)
  debit?: string;        // separate debit column
  credit?: string;       // separate credit column
  balance?: string;
  reference?: string;
}

interface NormalizedTransaction {
  date: Date;
  description: string;
  amount: number;        // always positive
  type: "debit" | "credit";
  balance?: number;
  reference?: string;
  hash: string;          // for dedup
}

/**
 * Parse CSV text into rows. Handles quoted fields with commas.
 */
export function parseCSV(text: string, options: CSVParseOptions = {}): {
  headers: string[];
  rows: ParsedRow[];
} {
  const { delimiter = ",", hasHeader = true } = options;

  const lines = text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .filter((l) => l.trim().length > 0);

  if (lines.length === 0) {
    return { headers: [], rows: [] };
  }

  function splitLine(line: string): string[] {
    const fields: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === delimiter && !inQuotes) {
        fields.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    fields.push(current.trim());
    return fields;
  }

  const allValues = lines.map(splitLine);
  const headers = hasHeader
    ? allValues[0].map((h) => h.replace(/^["']|["']$/g, ""))
    : allValues[0].map((_, i) => `column_${i}`);

  const dataRows = hasHeader ? allValues.slice(1) : allValues;

  const rows: ParsedRow[] = dataRows.map((values) => {
    const row: ParsedRow = {};
    headers.forEach((h, i) => {
      row[h] = (values[i] || "").replace(/^["']|["']$/g, "");
    });
    return row;
  });

  return { headers, rows };
}

/**
 * Auto-detect which columns map to date, amount, description, etc.
 */
export function detectColumnMapping(headers: string[]): Partial<ColumnMapping> {
  const mapping: Partial<ColumnMapping> = {};
  const lower = headers.map((h) => h.toLowerCase().trim());

  // Date column
  const datePatterns = ["date", "txn date", "transaction date", "value date", "posting date", "txn_date"];
  for (const pat of datePatterns) {
    const idx = lower.findIndex((h) => h === pat || h.includes(pat));
    if (idx !== -1) {
      mapping.date = headers[idx];
      break;
    }
  }

  // Description
  const descPatterns = ["description", "narration", "particulars", "details", "transaction details", "remarks", "memo"];
  for (const pat of descPatterns) {
    const idx = lower.findIndex((h) => h === pat || h.includes(pat));
    if (idx !== -1) {
      mapping.description = headers[idx];
      break;
    }
  }

  // Amount (single column or separate debit/credit)
  const amtPatterns = ["amount", "transaction amount", "txn amount"];
  for (const pat of amtPatterns) {
    const idx = lower.findIndex((h) => h === pat);
    if (idx !== -1) {
      mapping.amount = headers[idx];
      break;
    }
  }

  const debitPatterns = ["debit", "withdrawal", "debit amount", "withdrawal amount"];
  for (const pat of debitPatterns) {
    const idx = lower.findIndex((h) => h === pat || h.includes(pat));
    if (idx !== -1) {
      mapping.debit = headers[idx];
      break;
    }
  }

  const creditPatterns = ["credit", "deposit", "credit amount", "deposit amount"];
  for (const pat of creditPatterns) {
    const idx = lower.findIndex((h) => h === pat || h.includes(pat));
    if (idx !== -1) {
      mapping.credit = headers[idx];
      break;
    }
  }

  // Balance
  const balPatterns = ["balance", "closing balance", "running balance"];
  for (const pat of balPatterns) {
    const idx = lower.findIndex((h) => h === pat || h.includes(pat));
    if (idx !== -1) {
      mapping.balance = headers[idx];
      break;
    }
  }

  // Reference
  const refPatterns = ["reference", "ref no", "ref", "cheque no", "utr", "txn id"];
  for (const pat of refPatterns) {
    const idx = lower.findIndex((h) => h === pat || h.includes(pat));
    if (idx !== -1) {
      mapping.reference = headers[idx];
      break;
    }
  }

  return mapping;
}

/**
 * Parse an amount string, handling Indian format (1,23,456.78) and negatives.
 */
function parseAmount(value: string): number {
  if (!value || value.trim() === "" || value.trim() === "-") return 0;
  const cleaned = value.replace(/[₹$,\s]/g, "").replace(/\((.+)\)/, "-$1");
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

/**
 * Parse date in multiple formats common in Indian bank statements.
 */
function parseDate(value: string): Date {
  if (!value) return new Date();

  // dd/mm/yyyy or dd-mm-yyyy
  const ddmmyyyy = value.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (ddmmyyyy) {
    return new Date(
      parseInt(ddmmyyyy[3]),
      parseInt(ddmmyyyy[2]) - 1,
      parseInt(ddmmyyyy[1])
    );
  }

  // yyyy-mm-dd (ISO)
  const iso = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) {
    return new Date(parseInt(iso[1]), parseInt(iso[2]) - 1, parseInt(iso[3]));
  }

  // dd Mon yyyy (e.g., "15 Feb 2025")
  const ddMonyyyy = value.match(
    /^(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+(\d{4})$/i
  );
  if (ddMonyyyy) {
    const months: Record<string, number> = {
      jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
      jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
    };
    return new Date(
      parseInt(ddMonyyyy[3]),
      months[ddMonyyyy[2].toLowerCase().substring(0, 3)],
      parseInt(ddMonyyyy[1])
    );
  }

  // Fallback to JS Date parsing
  const d = new Date(value);
  return isNaN(d.getTime()) ? new Date() : d;
}

/**
 * Generate a hash for deduplication.
 */
function generateHash(date: string, description: string, amount: string): string {
  const input = `${date}|${description}|${amount}`;
  return createHash("sha256").update(input).digest("hex").substring(0, 16);
}

/**
 * Normalize parsed CSV rows into structured transactions.
 */
export function normalizeTransactions(
  rows: ParsedRow[],
  mapping: ColumnMapping
): NormalizedTransaction[] {
  return rows
    .map((row) => {
      const dateStr = row[mapping.date] || "";
      const description = row[mapping.description] || "Unknown";
      let amount = 0;
      let type: "debit" | "credit" = "debit";

      if (mapping.amount) {
        const val = parseAmount(row[mapping.amount]);
        amount = Math.abs(val);
        type = val < 0 ? "debit" : "credit";
      } else if (mapping.debit || mapping.credit) {
        const debitVal = mapping.debit ? parseAmount(row[mapping.debit]) : 0;
        const creditVal = mapping.credit ? parseAmount(row[mapping.credit]) : 0;
        if (debitVal > 0) {
          amount = debitVal;
          type = "debit";
        } else if (creditVal > 0) {
          amount = creditVal;
          type = "credit";
        }
      }

      // Skip zero-amount rows
      if (amount === 0) return null;

      const balance = mapping.balance ? parseAmount(row[mapping.balance]) : undefined;
      const reference = mapping.reference ? row[mapping.reference] : undefined;

      return {
        date: parseDate(dateStr),
        description: description.trim(),
        amount,
        type,
        balance: balance || undefined,
        reference: reference || undefined,
        hash: generateHash(dateStr, description, amount.toString()),
      };
    })
    .filter(Boolean) as NormalizedTransaction[];
}

/**
 * Extract vendor name from transaction description using heuristics.
 */
export function extractVendor(description: string): string | null {
  // Common Indian bank statement patterns
  // UPI: UPI/VENDOR/REF
  const upi = description.match(/UPI[\/\-]([^\/\-]+)/i);
  if (upi) return upi[1].trim();

  // NEFT/IMPS: NEFT/IMPS-VENDOR-REF
  const neft = description.match(/(?:NEFT|IMPS|RTGS)[\/\-]([^\/\-]+)/i);
  if (neft) return neft[1].trim();

  // POS: POS/VENDOR NAME
  const pos = description.match(/POS[\/\- ]+(.+?)(?:\/|$)/i);
  if (pos) return pos[1].trim();

  // Online: ONLINE/VENDOR
  const online = description.match(/(?:ONLINE|ECOM|DCH)[\/\-]([^\/\-]+)/i);
  if (online) return online[1].trim();

  return null;
}
