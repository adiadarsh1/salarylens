/** Indian-format currency helpers (lakh/crore aware). */

export function formatINR(n: number): string {
  return '₹' + Math.round(n).toLocaleString('en-IN');
}

/** Compact Indian format: ₹12.5L, ₹1.2Cr, ₹85,000. */
export function formatCompactINR(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_00_00_000) return '₹' + (n / 1_00_00_000).toFixed(2).replace(/\.00$/, '') + 'Cr';
  if (abs >= 1_00_000) return '₹' + (n / 1_00_000).toFixed(2).replace(/\.00$/, '') + 'L';
  return '₹' + Math.round(n).toLocaleString('en-IN');
}

/** Parse messy CTC strings like "18 LPA", "₹12,50,000", "1.2 Cr", "8L". */
export function parseCTC(raw: string): number | null {
  if (!raw) return null;
  const s = raw.toLowerCase().replace(/[₹,\s]/g, '');
  const m = s.match(/([\d.]+)(cr|crore|l|lpa|lakh|lac|k)?/);
  if (!m) return null;
  const value = parseFloat(m[1]);
  if (isNaN(value)) return null;
  const unit = m[2];
  if (unit === 'cr' || unit === 'crore') return value * 1_00_00_000;
  if (unit === 'l' || unit === 'lpa' || unit === 'lakh' || unit === 'lac') return value * 1_00_000;
  if (unit === 'k') return value * 1_000;
  // bare number: assume lakhs if small (<1000), else rupees
  return value < 1000 ? value * 1_00_000 : value;
}
