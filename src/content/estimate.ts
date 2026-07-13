/** Rough market-rate CTC estimate for when a job post lists no salary.
 *  Heuristic: role base × seniority × company pay factor × location (India, FY25-26). */

import { findCompany } from './companies';

export interface RoleEstimate {
  low: number; // total-comp range (incl. stock)
  mid: number; // total comp (cash + stock)
  high: number;
  cashCtc: number; // base + bonus (drives in-hand)
  stockAnnual: number; // RSU/ESOP per year
  stockPct: number;
  role: string;
  level: string;
  confidence: 'low' | 'medium' | 'high';
  basis: string;
  company?: string;
}

interface RoleDef {
  key: string; // display name
  base: number; // mid-level CTC in ₹ at a funded-product company, metro
  match: RegExp;
  senior?: boolean; // base already reflects a senior/leadership role
}

// Order matters: more specific roles first.
const ROLES: RoleDef[] = [
  { key: 'Engineering Manager', base: 4_000_000, senior: true, match: /\b(engineering manager|eng(ineering)? director|director of engineering|eng manager|em|dev manager|head of engineering|vp engineering)\b/i },
  { key: 'Product Manager', base: 2_800_000, senior: true, match: /\b(product manager|pm\b|group product|associate product manager|apm|product owner)\b/i },
  { key: 'Software Architect', base: 3_500_000, senior: true, match: /\b(architect|principal engineer|distinguished engineer)\b/i },
  { key: 'Machine Learning Engineer', base: 2_200_000, match: /\b(machine learning|ml engineer|ai engineer|deep learning|nlp|computer vision|mlops)\b/i },
  { key: 'Data Scientist', base: 2_000_000, match: /\bdata scientist|data science\b/i },
  { key: 'Data Engineer', base: 1_900_000, match: /\bdata engineer|big data|spark|hadoop|etl developer\b/i },
  { key: 'DevOps / SRE', base: 2_000_000, match: /\b(devops|sre|site reliability|platform engineer|cloud engineer|infrastructure engineer|kubernetes)\b/i },
  { key: 'Security Engineer', base: 2_100_000, match: /\b(security engineer|cybersecurity|infosec|appsec|penetration|soc analyst)\b/i },
  { key: 'Backend Engineer', base: 1_800_000, match: /\b(backend|back-end|server-side|java developer|golang|node\.?js|python developer|api developer|microservices)\b/i },
  { key: 'Frontend Engineer', base: 1_600_000, match: /\b(frontend|front-end|react|angular|vue|ui developer|web developer)\b/i },
  { key: 'Full-Stack Engineer', base: 1_800_000, match: /\b(full[- ]?stack|mern|mean)\b/i },
  { key: 'Mobile Engineer', base: 1_700_000, match: /\b(android|ios|mobile developer|flutter|react native|kotlin developer|swift developer)\b/i },
  { key: 'QA / SDET', base: 1_200_000, match: /\b(qa|quality assurance|sdet|test engineer|automation tester|testing|selenium)\b/i },
  { key: 'UX / UI Designer', base: 1_400_000, match: /\b(ux|ui designer|product designer|interaction designer|visual designer|design lead)\b/i },
  { key: 'Data Analyst', base: 1_000_000, match: /\b(data analyst|business intelligence|bi analyst|power bi|tableau|analytics)\b/i },
  { key: 'Business Analyst', base: 1_000_000, match: /\b(business analyst|ba\b|systems analyst)\b/i },
  { key: 'Consultant', base: 1_200_000, match: /\b(consultant|advisory|functional consultant|sap|salesforce consultant)\b/i },
  { key: 'Software Engineer', base: 1_800_000, match: /\b(software (engineer|developer)|sde|sw engineer|programmer|developer|engineer)\b/i },
];

interface Level { name: string; mult: number; match: RegExp; }
// From explicit title words. Multiplier relative to mid = 1.0.
const TITLE_LEVELS: Level[] = [
  { name: 'Director', mult: 3.4, match: /\b(director|vp|head)\b/i },
  { name: 'Principal / Staff', mult: 2.4, match: /\b(principal|staff|distinguished|lead|architect)\b/i },
  { name: 'Senior', mult: 1.6, match: /\b(senior|sr\.?|sde ?[23]|lead|iii)\b/i },
  { name: 'Junior', mult: 0.7, match: /\b(junior|jr\.?|associate|sde ?1|trainee|graduate|fresher|entry)\b/i },
  { name: 'Intern', mult: 0.18, match: /\bintern(ship)?\b/i },
];

function levelFromYears(years: number): Level {
  if (years <= 1) return { name: 'Entry (0-1 yr)', mult: 0.5, match: /x/ };
  if (years <= 3) return { name: 'Junior (1-3 yr)', mult: 0.75, match: /x/ };
  if (years <= 6) return { name: 'Mid (3-6 yr)', mult: 1.0, match: /x/ };
  if (years <= 9) return { name: 'Senior (6-9 yr)', mult: 1.6, match: /x/ };
  if (years <= 13) return { name: 'Staff (9-13 yr)', mult: 2.4, match: /x/ };
  return { name: 'Principal+ (13+ yr)', mult: 3.0, match: /x/ };
}

const TIER_A = /\b(google|microsoft|amazon|meta|facebook|apple|netflix|nvidia|adobe|salesforce|uber|atlassian|linkedin|oracle|sap labs|vmware|walmart labs|goldman|morgan stanley|de shaw|tower research|graviton|flipkart|swiggy|zomato|razorpay|cred|phonepe|paytm|groww|zerodha|meesho|sharechan|dream11|navi|slice|jupiter|databricks|snowflake|stripe|rippling|atlas|arcesium|sprinklr|freshworks|postman|browserstack|zeta|angel one|myntra|urban company)\b/i;
const TIER_C = /\b(tcs|tata consultancy|infosys|wipro|cognizant|accenture|capgemini|hcl|tech mahindra|ltimindtree|mindtree|l&t infotech|deloitte|mphasis|dxc|ibm|birlasoft|hexaware|persistent|coforge|zensar|virtusa|nttdata|ntt data|genpact|wns)\b/i;

const METROS = /\b(bengaluru|bangalore|hyderabad|gurgaon|gurugram|pune|mumbai|new delhi|delhi|noida|chennai|remote|hybrid)\b/i;

export interface JobContext {
  title: string;
  company: string;
  text: string;
}

/** Pull the job title, employer + a chunk of context text from a job page. */
export function getJobContext(): JobContext {
  const sel =
    document.querySelector<HTMLElement>(
      '.job-details-jobs-unified-top-card__job-title, .jobs-unified-top-card__job-title, .topcard__title, h1'
    );
  let title = sel?.innerText?.trim() || '';
  // Employer — restricted selectors so we never pick up "LinkedIn"/related jobs.
  const coSel = document.querySelector<HTMLElement>(
    '.job-details-jobs-unified-top-card__company-name a, .job-details-jobs-unified-top-card__company-name, .jobs-unified-top-card__company-name, .topcard__org-name-link, .topcard__flavor a, [class*="comp-name" i] a, [class*="comp-name" i], [class*="company-name" i] a'
  );
  let company = coSel?.innerText?.trim() || '';

  if (!title || !company) {
    // "(3) Senior Software Engineer - Google | LinkedIn" or "Company hiring Role in City"
    const dt = document.title.replace(/^\(\d+\)\s*/, '').replace(/\s*\|\s*LinkedIn.*$/i, '');
    const hiring = dt.match(/^(.+?) hiring (.+?) in /i);
    if (hiring) {
      if (!company) company = hiring[1];
      if (!title) title = hiring[2];
    } else {
      const parts = dt.split(' - ');
      if (!title) title = parts[0];
      if (!company && parts[1]) company = parts[1];
    }
  }
  const text = (document.body?.innerText || '').slice(0, 8000);
  return { title: title.slice(0, 120), company: company.slice(0, 80), text };
}

function extractYears(text: string): number | null {
  const m = text.match(/(\d{1,2})\s*(?:\+|to|-|–)?\s*(\d{1,2})?\s*(?:\+)?\s*(?:years?|yrs?)\b/i);
  if (!m) return null;
  const a = parseInt(m[1], 10);
  const b = m[2] ? parseInt(m[2], 10) : a;
  const avg = (a + b) / 2;
  return avg > 0 && avg < 40 ? avg : null;
}

export function estimateFromRole(ctx: JobContext): RoleEstimate | null {
  const title = ctx.title || '';
  const company = ctx.company || '';
  const hay = `${title}\n${ctx.text}`;
  const roleInTitle = ROLES.find((r) => r.match.test(title));
  const role = roleInTitle || ROLES.find((r) => r.match.test(hay));
  if (!role) return null;

  // Level: prefer explicit title word; else infer from years of experience; else mid.
  let level: Level;
  if (role.senior) {
    // Base already reflects a leadership role — only a Director/VP title bumps it.
    level = /\b(director|vp|head of|senior director|svp)\b/i.test(title)
      ? { name: 'Director+', mult: 1.7, match: /x/ }
      : { name: 'Lead', mult: 1.0, match: /x/ };
  } else {
    let lvl: Level | null = TITLE_LEVELS.find((l) => l.match.test(title)) || null;
    const yrs = extractYears(hay);
    if (!lvl && yrs != null) lvl = levelFromYears(yrs);
    level = lvl || { name: 'Mid (est.)', mult: 1.0, match: /x/ };
  }

  let mult = level.mult;
  let payNote: string;
  let companyName: string | undefined;

  // Prefer real, company-specific pay data (match only the employer field, never
  // the whole page — "LinkedIn" etc. would false-match). Fall back to a tier guess.
  const co = findCompany(`${company}\n${title}`);
  if (co) {
    mult *= co.factor;
    companyName = co.name;
    payNote = `${co.name} · ~${co.midL}L mid-SWE`;
  } else if (TIER_A.test(`${company} ${title}`)) {
    mult *= 1.55;
    payNote = 'top-tier co.';
  } else if (TIER_C.test(`${company} ${title}`)) {
    mult *= 0.62;
    payNote = 'service co.';
  } else {
    payNote = 'product co. (est.)';
  }

  if (!METROS.test(hay)) mult *= 0.82; // non-metro / unknown location

  // Confidence: need the role in the TITLE, or a recognised employer — otherwise
  // we're guessing from stray page text, so report "not enough data" (return null).
  const confidence: 'low' | 'medium' | 'high' =
    co && roleInTitle ? 'high' : co || roleInTitle ? 'medium' : 'low';
  if (confidence === 'low') return null;

  const mid = Math.round((role.base * mult) / 50000) * 50000;
  const low = Math.round((mid * 0.75) / 50000) * 50000;
  const high = Math.round((mid * 1.3) / 50000) * 50000;

  // Split total comp into cash (base+bonus) vs stock (RSU/ESOP). Tech comp at
  // higher-paying employers is heavily stock — only cash drives monthly in-hand.
  const stockPct = stockShare(co ? co.midL : TIER_A.test(`${company} ${title}`) ? 40 : role.senior ? 22 : 14);
  const stockAnnual = Math.round((mid * stockPct) / 50000) * 50000;
  const cashCtc = Math.max(mid - stockAnnual, mid * 0.4);

  return {
    low,
    mid,
    high,
    cashCtc,
    stockAnnual,
    stockPct,
    role: role.key,
    level: level.name,
    company: companyName,
    confidence,
    basis: `${level.name.replace(/ \(.*\)/, '')} · ${payNote}`,
  };
}

/** Fraction of total comp that is stock/RSU, keyed off the employer's pay band. */
function stockShare(midL: number): number {
  if (midL >= 45) return 0.4; // FAANG+ / quant
  if (midL >= 30) return 0.3; // top product / fintech
  if (midL >= 22) return 0.18;
  if (midL >= 15) return 0.08;
  return 0.03; // service cos — mostly cash
}
