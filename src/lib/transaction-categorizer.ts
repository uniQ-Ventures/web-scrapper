/**
 * AI-powered transaction categorizer.
 * Rules-based for common patterns, with Gemini AI fallback for unknowns.
 */

interface CategorizedResult {
  category: string;
  confidence: number; // 0–1
  vendor: string | null;
}

/**
 * Keyword-to-category mapping for common Indian transaction patterns.
 */
const CATEGORY_RULES: { pattern: RegExp; category: string }[] = [
  // Salary & payroll
  { pattern: /salary|payroll|stipend/i, category: "Payroll" },

  // Rent & office
  { pattern: /rent|lease|property|office\s?space/i, category: "Rent & Office" },

  // Software & SaaS
  { pattern: /aws|gcp|google cloud|azure|vercel|heroku|github|figma|notion|slack|zoom|openai|anthropic|stripe|razorpay|jira|confluence|atlassian|hubspot|sendgrid|resend|twilio|datadog|sentry|postman|canva|dropbox|1password|last\s?pass/i, category: "Software & SaaS" },

  // Cloud & infrastructure
  { pattern: /digital\s?ocean|cloudflare|netlify|supabase|firebase|mongo/i, category: "Cloud & Infra" },

  // Marketing & ads
  { pattern: /google\s?ads|meta\s?ads|facebook\s?ads|instagram|linkedin\s?ads|twitter|sponsor|marketing|adword/i, category: "Marketing" },

  // Travel
  { pattern: /uber|ola|rapido|irctc|makemytrip|goibibo|flight|airline|indigo|air\s?india|vistara|cab|taxi|hotel|airbnb|oyo/i, category: "Travel" },

  // Food & meals
  { pattern: /swiggy|zomato|restaurant|cafe|food|meal|lunch|dinner|dominos|mcdonalds|starbucks/i, category: "Food & Meals" },

  // Telecom
  { pattern: /airtel|jio|vodafone|bsnl|telecom|broadband|internet|wifi/i, category: "Telecom & Internet" },

  // Insurance
  { pattern: /insurance|lic|hdfc\s?ergo|icici\s?lombard|star\s?health|policy/i, category: "Insurance" },

  // Professional services
  { pattern: /lawyer|legal|advocate|ca\s|chartered\s?accountant|consultant|advisory/i, category: "Professional Services" },

  // Utilities
  { pattern: /electricity|water|gas|utility|bescom|tata\s?power|adani/i, category: "Utilities" },

  // Bank charges
  { pattern: /bank\s?charge|service\s?charge|maintenance\s?charge|gst\s?charge|debit\s?card|credit\s?card\s?charge/i, category: "Bank Charges" },

  // Tax payments
  { pattern: /income\s?tax|advance\s?tax|tds|gst\s?payment|challan/i, category: "Tax Payments" },

  // Equipment
  { pattern: /amazon|flipkart|laptop|monitor|keyboard|mouse|headphone|equipment|hardware/i, category: "Equipment & Supplies" },

  // Client payments / revenue
  { pattern: /invoice|payment\s?received|client|project/i, category: "Client Payment" },

  // Fund transfer (internal)
  { pattern: /transfer|self|own\s?account|savings|fd|fixed\s?deposit/i, category: "Internal Transfer" },

  // EMI
  { pattern: /emi|loan|repayment|mortgage/i, category: "Loan & EMI" },

  // Investment
  { pattern: /mutual\s?fund|sip|zerodha|groww|invest|stock|share|demat/i, category: "Investment" },
];

/**
 * Categorize a transaction using rules-based matching.
 */
export function categorizeTransaction(description: string): CategorizedResult {
  const normalizedDesc = description.toLowerCase().trim();

  for (const rule of CATEGORY_RULES) {
    if (rule.pattern.test(normalizedDesc)) {
      return {
        category: rule.category,
        confidence: 0.85,
        vendor: extractVendorFromDesc(normalizedDesc),
      };
    }
  }

  return {
    category: "Uncategorized",
    confidence: 0.1,
    vendor: extractVendorFromDesc(normalizedDesc),
  };
}

/**
 * Batch categorize multiple transactions.
 */
export function batchCategorize(
  transactions: { description: string; amount: number; type: string }[]
): CategorizedResult[] {
  return transactions.map((tx) => {
    const result = categorizeTransaction(tx.description);

    // Credits are likely revenue unless matched to specific categories
    if (tx.type === "credit" && result.category === "Uncategorized") {
      return {
        ...result,
        category: "Income / Revenue",
        confidence: 0.6,
      };
    }

    return result;
  });
}

/**
 * Extract vendor from description heuristics.
 */
function extractVendorFromDesc(desc: string): string | null {
  // UPI: UPI/VENDOR/REF
  const upi = desc.match(/upi[\/\-]([^\/\-]+)/i);
  if (upi) return cleanVendorName(upi[1]);

  // NEFT/IMPS/RTGS
  const neft = desc.match(/(?:neft|imps|rtgs)[\/\-]([^\/\-]+)/i);
  if (neft) return cleanVendorName(neft[1]);

  // POS
  const pos = desc.match(/pos[\/\- ]+(.+?)(?:\/|$)/i);
  if (pos) return cleanVendorName(pos[1]);

  return null;
}

function cleanVendorName(name: string): string {
  return name
    .replace(/\d{10,}/g, "")     // Remove long numbers
    .replace(/[@#]/g, "")        // Remove special chars
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .slice(0, 4)                 // Max 4 words
    .join(" ");
}

/**
 * Default expense categories with colors for the UI.
 */
export const DEFAULT_CATEGORIES = [
  { name: "Payroll", color: "#6366F1", icon: "👥" },
  { name: "Rent & Office", color: "#8B5CF6", icon: "🏢" },
  { name: "Software & SaaS", color: "#A855F7", icon: "💻" },
  { name: "Cloud & Infra", color: "#EC4899", icon: "☁️" },
  { name: "Marketing", color: "#F43F5E", icon: "📢" },
  { name: "Travel", color: "#EF4444", icon: "✈️" },
  { name: "Food & Meals", color: "#F97316", icon: "🍽️" },
  { name: "Telecom & Internet", color: "#F59E0B", icon: "📡" },
  { name: "Insurance", color: "#EAB308", icon: "🛡️" },
  { name: "Professional Services", color: "#84CC16", icon: "⚖️" },
  { name: "Utilities", color: "#22C55E", icon: "⚡" },
  { name: "Bank Charges", color: "#14B8A6", icon: "🏦" },
  { name: "Tax Payments", color: "#06B6D4", icon: "📋" },
  { name: "Equipment & Supplies", color: "#3B82F6", icon: "🖥️" },
  { name: "Loan & EMI", color: "#64748B", icon: "💳" },
  { name: "Investment", color: "#10B981", icon: "📈" },
  { name: "Internal Transfer", color: "#94A3B8", icon: "🔄" },
  { name: "Income / Revenue", color: "#22C55E", icon: "💰" },
  { name: "Uncategorized", color: "#9CA3AF", icon: "❓" },
];
