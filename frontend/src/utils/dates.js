/**
 * Returns the current month as YYYY-MM string.
 */
export function getCurrentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Returns the previous month.
 * prevMonth("2026-01") → "2025-12"
 */
export function prevMonth(month) {
  const [year, m] = month.split('-').map(Number);
  if (m === 1) return `${year - 1}-12`;
  return `${year}-${String(m - 1).padStart(2, '0')}`;
}

/**
 * Returns the next month.
 * nextMonth("2025-12") → "2026-01"
 */
export function nextMonth(month) {
  const [year, m] = month.split('-').map(Number);
  if (m === 12) return `${year + 1}-01`;
  return `${year}-${String(m + 1).padStart(2, '0')}`;
}

/**
 * Converts a YYYY-MM string to a human-readable label.
 * monthToLabel("2026-03") → "March 2026"
 */
export function monthToLabel(month) {
  if (!month || !/^\d{4}-\d{2}$/.test(month)) return month;
  const [year, m] = month.split('-').map(Number);
  const date = new Date(year, m - 1, 1);
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}
