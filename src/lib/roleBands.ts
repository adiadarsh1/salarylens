/**
 * India tech-role compensation bands (total CTC, incl. stock), 2025-26.
 *
 * These are AGGREGATE market ranges by role × experience level — public
 * statistics compiled from multiple salary reports/surveys (NASSCOM India
 * Tech Compensation 2025, Stack Overflow Developer Survey, and public 2025-26
 * salary guides). They are facts/ranges, not offers and not a copy of any
 * single proprietary database — always verify against your own data.
 *
 * Numbers are ₹ (absolute), for PRODUCT companies in Indian metros. Service
 * companies (TCS/Infosys/Wipro tier) run materially lower — apply SERVICE_FACTOR.
 */

export type Level = 'entry' | 'mid' | 'senior' | 'staff';

export const LEVELS: Array<{ key: Level; label: string; years: string }> = [
  { key: 'entry', label: 'Entry', years: '0-2 yr' },
  { key: 'mid', label: 'Mid', years: '3-6 yr' },
  { key: 'senior', label: 'Senior', years: '6-10 yr' },
  { key: 'staff', label: 'Staff+', years: '10+ yr' },
];

export type CoType = 'product' | 'service';

/** Service-company multiplier vs the product-company band. */
export const SERVICE_FACTOR = 0.42;

export interface Band {
  low: number;
  median: number;
  high: number;
}

export interface RoleBand {
  key: string;
  match: RegExp;
  stockPct: number; // typical stock share of total comp at mid level
  levels: Partial<Record<Level, Band>>;
}

const L = 1_00_000;
const b = (low: number, median: number, high: number): Band => ({
  low: low * L,
  median: median * L,
  high: high * L,
});

// Order matters: more specific roles first (mirrors estimate.ts).
export const ROLE_BANDS: RoleBand[] = [
  {
    key: 'Engineering Manager',
    match: /\b(engineering manager|eng manager|em|dev manager|head of engineering|director of engineering|vp engineering)\b/i,
    stockPct: 0.32,
    levels: {
      mid: b(40, 52, 70),
      senior: b(60, 80, 110),
      staff: b(90, 130, 200),
    },
  },
  {
    key: 'Product Manager',
    match: /\b(product manager|pm\b|group product|associate product|apm|product owner)\b/i,
    stockPct: 0.28,
    levels: {
      entry: b(16, 22, 28),
      mid: b(25, 32, 42),
      senior: b(40, 52, 68),
      staff: b(65, 85, 120),
    },
  },
  {
    key: 'Machine Learning Engineer',
    match: /\b(machine learning|ml engineer|ai engineer|deep learning|nlp|computer vision|mlops)\b/i,
    stockPct: 0.3,
    levels: {
      entry: b(8, 12, 16),
      mid: b(16, 24, 32),
      senior: b(30, 40, 52),
      staff: b(45, 60, 80),
    },
  },
  {
    key: 'Data Scientist',
    match: /\bdata scientist|data science\b/i,
    stockPct: 0.24,
    levels: {
      entry: b(7, 10, 14),
      mid: b(14, 20, 28),
      senior: b(26, 34, 45),
      staff: b(40, 52, 70),
    },
  },
  {
    key: 'Data Engineer',
    match: /\bdata engineer|big data|spark|hadoop|etl\b/i,
    stockPct: 0.2,
    levels: {
      entry: b(6, 8, 11),
      mid: b(12, 17, 23),
      senior: b(22, 30, 40),
      staff: b(35, 45, 58),
    },
  },
  {
    key: 'DevOps / SRE',
    match: /\b(devops|sre|site reliability|platform engineer|cloud engineer|kubernetes)\b/i,
    stockPct: 0.22,
    levels: {
      entry: b(7, 10, 13),
      mid: b(13, 19, 26),
      senior: b(24, 32, 42),
      staff: b(35, 48, 62),
    },
  },
  {
    key: 'Security Engineer',
    match: /\b(security engineer|cybersecurity|infosec|appsec|penetration)\b/i,
    stockPct: 0.2,
    levels: {
      entry: b(6, 9, 12),
      mid: b(13, 19, 26),
      senior: b(24, 32, 42),
      staff: b(36, 48, 62),
    },
  },
  {
    key: 'Backend Engineer',
    match: /\b(backend|back-end|server-side|java developer|golang|node\.?js|python developer|microservices)\b/i,
    stockPct: 0.18,
    levels: {
      entry: b(6, 8, 11),
      mid: b(12, 16, 22),
      senior: b(20, 28, 36),
      staff: b(32, 42, 55),
    },
  },
  {
    key: 'Frontend Engineer',
    match: /\b(frontend|front-end|react|angular|vue|ui developer|web developer)\b/i,
    stockPct: 0.16,
    levels: {
      entry: b(5, 7, 10),
      mid: b(10, 14, 19),
      senior: b(18, 24, 30),
      staff: b(30, 38, 48),
    },
  },
  {
    key: 'Mobile Engineer',
    match: /\b(android|ios|mobile developer|flutter|react native|kotlin|swift developer)\b/i,
    stockPct: 0.16,
    levels: {
      entry: b(5, 8, 11),
      mid: b(11, 15, 21),
      senior: b(19, 26, 34),
      staff: b(30, 40, 52),
    },
  },
  {
    key: 'UX / UI Designer',
    match: /\b(ux|ui designer|product designer|interaction designer|visual designer)\b/i,
    stockPct: 0.15,
    levels: {
      entry: b(5, 7, 10),
      mid: b(10, 15, 20),
      senior: b(18, 26, 34),
      staff: b(30, 42, 55),
    },
  },
  {
    key: 'QA / SDET',
    match: /\b(qa|quality assurance|sdet|test engineer|automation tester|selenium)\b/i,
    stockPct: 0.12,
    levels: {
      entry: b(5, 7, 9),
      mid: b(10, 14, 19),
      senior: b(18, 24, 30),
      staff: b(26, 34, 45),
    },
  },
  {
    key: 'Data Analyst',
    match: /\b(data analyst|business intelligence|bi analyst|power bi|tableau)\b/i,
    stockPct: 0.08,
    levels: {
      entry: b(4, 6, 8),
      mid: b(8, 11, 15),
      senior: b(15, 20, 26),
      staff: b(22, 28, 36),
    },
  },
  {
    key: 'Software Engineer',
    match: /\b(software (engineer|developer)|sde|sw engineer|programmer|full[- ]?stack|developer|engineer)\b/i,
    stockPct: 0.2,
    levels: {
      entry: b(8, 14, 26),
      mid: b(18, 24, 40),
      senior: b(30, 42, 70),
      staff: b(55, 80, 130),
    },
  },
];

export function roleKeys(): string[] {
  return ROLE_BANDS.map((r) => r.key);
}

export function getRoleBand(key: string): RoleBand | undefined {
  return ROLE_BANDS.find((r) => r.key === key);
}

/** Best available level for a role (some roles have no entry band, etc.). */
export function availableLevels(role: RoleBand): Level[] {
  return LEVELS.map((l) => l.key).filter((k) => role.levels[k]);
}

export interface BandResult {
  band: Band; // scaled for company type
  role: string;
  level: Level;
  coType: CoType;
  position: number; // 0..1 where the value sits between low..high (clamped)
  verdict: 'below' | 'low' | 'around' | 'high' | 'above';
}

/** Look up a scaled band for role × level × company type and place a value in it. */
export function lookupBand(
  roleKey: string,
  level: Level,
  coType: CoType,
  value: number
): BandResult | null {
  const role = getRoleBand(roleKey);
  if (!role) return null;
  const raw = role.levels[level] ?? role.levels.mid;
  if (!raw) return null;
  const f = coType === 'service' ? SERVICE_FACTOR : 1;
  const band: Band = {
    low: Math.round(raw.low * f),
    median: Math.round(raw.median * f),
    high: Math.round(raw.high * f),
  };
  const span = Math.max(1, band.high - band.low);
  const position = Math.max(0, Math.min(1, (value - band.low) / span));
  const ratio = value / band.median;
  const verdict =
    ratio < 0.7 ? 'below' : ratio < 0.9 ? 'low' : ratio <= 1.1 ? 'around' : ratio <= 1.35 ? 'high' : 'above';
  return { band, role: role.key, level, coType, position, verdict };
}
