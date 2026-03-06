/**
 * Formats integer cents to a currency string.
 * formatCents(125050) → "$1,250.50"
 * formatCents(-125050) → "-$1,250.50"
 */
export function formatCents(cents) {
  if (cents === null || cents === undefined) return '$0.00';
  const abs = Math.abs(cents);
  const dollars = abs / 100;
  const formatted = dollars.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return cents < 0 ? `-$${formatted}` : `$${formatted}`;
}

/**
 * Parses a currency input string to integer cents.
 * "12.50" → 1250
 * "1,234.56" → 123456
 */
export function parseCurrencyInput(str) {
  if (!str && str !== 0) return 0;
  const cleaned = String(str).replace(/[$,\s]/g, '');
  const num = parseFloat(cleaned);
  if (isNaN(num)) return 0;
  return Math.round(num * 100);
}
