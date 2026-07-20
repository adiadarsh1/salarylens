/**
 * SalaryLens Pro — company pay benchmark.
 * Matches a company name against the ~90-firm dataset and compares a total
 * compensation figure to the typical mid-level SWE CTC there.
 */
import { COMPANIES } from '../content/companies';

export interface Benchmark {
  company: string;
  typicalCtc: number; // ₹ typical mid-SWE total CTC
  yourComp: number; // ₹ total comp being compared
  deltaPct: number; // (yours - typical) / typical
  band: 'below' | 'around' | 'above';
}

/** Find the best company match for a free-text employer name. */
export function matchCompany(name: string): { company: string; typicalCtc: number } | null {
  const q = (name || '').trim();
  if (!q) return null;
  for (const c of COMPANIES) {
    if (c.re.test(q)) return { company: c.name, typicalCtc: c.midL * 1_00_000 };
  }
  return null;
}

/** Compare a total-comp figure to the typical mid-SWE CTC at a matched company. */
export function benchmark(name: string, yourComp: number): Benchmark | null {
  const m = matchCompany(name);
  if (!m || yourComp <= 0) return null;
  const deltaPct = (yourComp - m.typicalCtc) / m.typicalCtc;
  const band = deltaPct > 0.1 ? 'above' : deltaPct < -0.1 ? 'below' : 'around';
  return {
    company: m.company,
    typicalCtc: m.typicalCtc,
    yourComp,
    deltaPct,
    band,
  };
}
