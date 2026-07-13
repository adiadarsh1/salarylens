/** Salary/CTC detection. Scans concatenated page text (ranges often span DOM
 *  nodes) and returns the best annual ₹ figure. Also used for selection decode. */

const NUM = String.raw`\d[\d,]*(?:\.\d+)?`;
const UNIT = String.raw`(?:lpa|lakhs?|lacs?|l|crores?|cr)`;
// tolerant "/yr", "per annum", "p.a." etc. that can sit between the two range numbers
const PERIOD = String.raw`(?:\s*\/?\s*(?:yr|year|pa|p\.?a\.?|annum|a year|per year|per annum))?`;

function unitMul(u?: string): number {
  const s = (u || '').toLowerCase();
  if (s.startsWith('cr')) return 1_00_00_000;
  if (s.startsWith('l')) return 1_00_000; // l, lpa, lakh, lac
  return 1;
}

/** Convert one captured number (+ optional unit / rupee context) to annual ₹. */
function toAnnual(numStr: string, unit: string | undefined, hadRupee: boolean): number {
  const v = parseFloat(numStr.replace(/,/g, ''));
  if (isNaN(v)) return 0;
  if (unit) return v * unitMul(unit); // "18 LPA", "2.4 Cr"
  if (v >= 1_00_000) return v; // already rupees, e.g. 20,00,000
  if (hadRupee && v >= 1_000) return v; // ₹85,000 style
  return 0; // too small to be an annual salary without a unit — ignore
}

const RE_RANGE = new RegExp(
  `(₹)?\\s*(${NUM})\\s*(${UNIT})?${PERIOD}\\s*(?:-|–|—|to)\\s*(₹)?\\s*(${NUM})\\s*(${UNIT})?`,
  'gi'
);
const RE_SINGLE_UNIT = new RegExp(`(₹)?\\s*(${NUM})\\s*(${UNIT})\\b`, 'gi');
const RE_RUPEE = new RegExp(`(₹)\\s*(${NUM})`, 'gi');

const MIN = 1_00_000; // ₹1L
const MAX = 20_00_00_000; // ₹20Cr sanity ceiling

// Words that, right after a number, mean it is NOT a salary (experience, counts…).
const NOISE_AFTER = /^\s*(?:\+\s*)?(?:years?|yrs?|months?|mos?|weeks?|days?|hours?|hrs?|members?|people|employees?|openings?|positions?|vacanc|candidates?|applicants?|reviews?|ratings?|stars?|followers?|km|kgs?|%|percent)/i;
// Salary-ish context that must sit near a bare ₹/L number in strict (page-wide) mode.
const CTX = /(salary|ctc|compensation|package|in.?hand|take.?home|stipend|lpa|lakh|crore|per annum|p\.?a\.?|\/\s?yr|\/\s?year|per year|annually|per\s?month|\/\s?mo)/i;

function windowHas(text: string, start: number, end: number, re: RegExp): boolean {
  return re.test(text.slice(Math.max(0, start - 40), Math.min(text.length, end + 40)));
}

/** Return every plausible annual ₹ figure found in a text blob.
 *  strict=true (page-wide scan) demands salary context for single values. */
export function scanText(text: string, strict = false): number[] {
  if (!text) return [];
  const found: number[] = [];
  let m: RegExpExecArray | null;

  RE_RANGE.lastIndex = 0;
  while ((m = RE_RANGE.exec(text))) {
    const hasMarker = !!(m[1] || m[4] || m[3] || m[6]); // ₹ or a unit somewhere
    if (!hasMarker) continue; // a bare "5 - 8" range is never a salary
    if (NOISE_AFTER.test(text.slice(m.index + m[0].length))) continue;
    const unit = m[6] || m[3];
    const a = toAnnual(m[2], unit, !!m[1]);
    const b = toAnnual(m[5], unit, !!m[4]);
    const hi = Math.max(a, b);
    if (hi >= MIN && hi <= MAX) found.push(hi);
  }

  RE_SINGLE_UNIT.lastIndex = 0;
  while ((m = RE_SINGLE_UNIT.exec(text))) {
    if (NOISE_AFTER.test(text.slice(m.index + m[0].length))) continue;
    if (strict && !windowHas(text, m.index, m.index + m[0].length, CTX)) continue;
    const v = toAnnual(m[2], m[3], !!m[1]);
    if (v >= MIN && v <= MAX) found.push(v);
  }

  RE_RUPEE.lastIndex = 0;
  while ((m = RE_RUPEE.exec(text))) {
    if (NOISE_AFTER.test(text.slice(m.index + m[0].length))) continue;
    if (strict && !windowHas(text, m.index, m.index + m[0].length, CTX)) continue;
    const v = toAnnual(m[2], undefined, true);
    if (v >= MIN && v <= MAX) found.push(v);
  }

  return found;
}

/** Best single CTC guess from an arbitrary string (used for text selection). */
export function bestFromText(text: string): number | null {
  const hits = scanText(text);
  if (!hits.length) return null;
  hits.sort((a, b) => b - a);
  return hits[0];
}

export interface Detected {
  annual: number;
}

/** Scan the page for the best CTC. Tight salary nodes are trusted; a page-wide
 *  fallback only accepts numbers that sit in an explicit salary context. */
export function detectCTC(): Detected | null {
  let tight = '';
  document
    .querySelectorAll<HTMLElement>(
      '[class*="salary" i],[class*="compensation" i],[class*="ctc" i],[data-test*="salary" i],[class*="pay-range" i],[class*="package" i]'
    )
    .forEach((n) => {
      const t = n.innerText;
      if (t) tight += '\n' + t;
    });

  let hits = scanText(tight, false);
  if (!hits.length) {
    const body = document.body?.innerText?.slice(0, 40_000) || '';
    hits = scanText(body, true); // strict: needs salary keyword / period near the number
  }
  if (!hits.length) return null;
  hits.sort((a, b) => b - a);
  return { annual: hits[0] };
}
