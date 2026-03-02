/**
 * Multi-currency support utilities
 * Exchange rates, conversion, and formatting
 */

export interface Currency {
  code: string;
  name: string;
  symbol: string;
  locale: string;
}

export const CURRENCIES: Currency[] = [
  { code: "INR", name: "Indian Rupee", symbol: "₹", locale: "en-IN" },
  { code: "USD", name: "US Dollar", symbol: "$", locale: "en-US" },
  { code: "EUR", name: "Euro", symbol: "€", locale: "de-DE" },
  { code: "GBP", name: "British Pound", symbol: "£", locale: "en-GB" },
  { code: "AED", name: "UAE Dirham", symbol: "د.إ", locale: "ar-AE" },
  { code: "SGD", name: "Singapore Dollar", symbol: "S$", locale: "en-SG" },
  { code: "JPY", name: "Japanese Yen", symbol: "¥", locale: "ja-JP" },
  { code: "AUD", name: "Australian Dollar", symbol: "A$", locale: "en-AU" },
  { code: "CAD", name: "Canadian Dollar", symbol: "C$", locale: "en-CA" },
  { code: "CHF", name: "Swiss Franc", symbol: "CHF", locale: "de-CH" },
];

// Fallback static rates (INR per 1 unit of foreign currency)
// These are approximate and should be replaced with live rates
export const STATIC_RATES: Record<string, number> = {
  INR: 1,
  USD: 83.5,
  EUR: 90.5,
  GBP: 105.8,
  AED: 22.7,
  SGD: 62.3,
  JPY: 0.56,
  AUD: 54.6,
  CAD: 61.8,
  CHF: 94.2,
};

export function convertToINR(amount: number, fromCurrency: string, rate?: number): number {
  if (fromCurrency === "INR") return amount;
  const r = rate || STATIC_RATES[fromCurrency] || 1;
  return Math.round(amount * r * 100) / 100;
}

export function convertFromINR(amount: number, toCurrency: string, rate?: number): number {
  if (toCurrency === "INR") return amount;
  const r = rate || STATIC_RATES[toCurrency] || 1;
  return Math.round((amount / r) * 100) / 100;
}

export function formatCurrency(amount: number, currencyCode: string = "INR"): string {
  const currency = CURRENCIES.find((c) => c.code === currencyCode);
  try {
    return new Intl.NumberFormat(currency?.locale || "en-IN", {
      style: "currency",
      currency: currencyCode,
      maximumFractionDigits: currencyCode === "JPY" ? 0 : 2,
    }).format(amount);
  } catch {
    return `${currency?.symbol || ""}${amount.toFixed(2)}`;
  }
}

export function calculateFxGainLoss(
  originalAmount: number,
  originalRate: number,
  currentRate: number
): { gainLoss: number; percentage: number; isGain: boolean } {
  const originalINR = originalAmount * originalRate;
  const currentINR = originalAmount * currentRate;
  const gainLoss = currentINR - originalINR;
  const percentage = originalINR > 0 ? (gainLoss / originalINR) * 100 : 0;
  return { gainLoss, percentage: Math.round(percentage * 100) / 100, isGain: gainLoss >= 0 };
}
