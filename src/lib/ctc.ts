/**
 * SalaryLens CTC engine — decodes an Indian annual CTC into real take-home pay.
 * Model (industry-standard): CTC = Gross salary + Employer EPF + Gratuity, and
 * Gross salary is further reduced by Employee EPF, Professional Tax and TDS.
 * Tax uses the New Regime default slabs for FY 2025-26 (AY 2026-27).
 */

export interface CtcInput {
  ctc: number; // annual CASH CTC in ₹ (base + bonus; excludes stock/RSU)
  basicPct: number; // Basic as % of CTC (typically 40–50)
  variablePct: number; // variable/bonus as % of CTC (paid separately, not monthly)
  pfOnActualBasic: boolean; // true = 12% of basic; false = statutory ₹1,800/mo cap
  professionalTaxAnnual: number; // state professional tax, ~₹2,400/yr
  stockAnnual?: number; // annualised RSU/ESOP grant — shown separately, not monthly cash
}

export interface CtcBreakdown {
  ctc: number;
  basic: number;
  variableAnnual: number;
  employerPfAnnual: number;
  gratuityAnnual: number;
  grossSalaryAnnual: number; // what actually flows as salary (ex employer PF/gratuity/variable)
  employeePfAnnual: number;
  professionalTaxAnnual: number;
  incomeTaxAnnual: number; // includes 4% cess, after 87A rebate
  taxableIncome: number;
  inHandAnnual: number;
  inHandMonthly: number;
  totalEpfAnnual: number; // employer + employee (your retirement savings)
  takeHomePct: number; // in-hand / cash CTC
  stockAnnual: number; // RSU/ESOP per year (separate from cash)
  totalComp: number; // cash CTC + stock
}

const STANDARD_DEDUCTION = 75_000;
const EPF_WAGE_CEILING_MONTHLY = 15_000;
const GRATUITY_RATE = 0.0481; // 4.81% of basic

/** New Regime slabs, FY 2025-26. Returns tax before cess, before 87A rebate. */
function newRegimeTaxBeforeRebate(income: number): number {
  const slabs: Array<[number, number]> = [
    [400_000, 0],
    [800_000, 0.05],
    [1_200_000, 0.1],
    [1_600_000, 0.15],
    [2_000_000, 0.2],
    [2_400_000, 0.25],
    [Infinity, 0.3],
  ];
  let tax = 0;
  let lower = 0;
  for (const [upper, rate] of slabs) {
    if (income > lower) {
      const slice = Math.min(income, upper) - lower;
      tax += slice * rate;
      lower = upper;
    } else break;
  }
  return tax;
}

/** Full New-Regime tax including the ₹12L 87A rebate and 4% health & education cess. */
export function incomeTaxNewRegime(taxableIncome: number): number {
  if (taxableIncome <= 0) return 0;
  // 87A rebate: taxable income up to ₹12,00,000 pays zero tax.
  if (taxableIncome <= 1_200_000) return 0;
  const base = newRegimeTaxBeforeRebate(taxableIncome);
  return Math.round(base * 1.04);
}

const STANDARD_DEDUCTION_OLD = 50_000;

/** Old Regime slabs, FY 2025-26. Returns tax before cess, before 87A rebate. */
function oldRegimeTaxBeforeRebate(income: number): number {
  const slabs: Array<[number, number]> = [
    [250_000, 0],
    [500_000, 0.05],
    [1_000_000, 0.2],
    [Infinity, 0.3],
  ];
  let tax = 0;
  let lower = 0;
  for (const [upper, rate] of slabs) {
    if (income > lower) {
      const slice = Math.min(income, upper) - lower;
      tax += slice * rate;
      lower = upper;
    } else break;
  }
  return tax;
}

/** Full Old-Regime tax incl. the ₹5L 87A rebate and 4% cess. */
export function incomeTaxOldRegime(taxableIncome: number): number {
  if (taxableIncome <= 0) return 0;
  // 87A rebate: taxable income up to ₹5,00,000 pays zero tax.
  if (taxableIncome <= 500_000) return 0;
  const base = oldRegimeTaxBeforeRebate(taxableIncome);
  return Math.round(base * 1.04);
}

export interface RegimeSide {
  taxableIncome: number;
  incomeTaxAnnual: number;
  inHandAnnual: number;
  inHandMonthly: number;
}

export interface RegimeComparison {
  newRegime: RegimeSide;
  oldRegime: RegimeSide;
  better: 'new' | 'old' | 'same';
  savingsAnnual: number; // extra annual in-hand from picking the better regime
  oldRegimeDeductions: number; // 80C/80D/HRA etc. assumed for the old-regime side
}

/**
 * Compare New vs Old regime in-hand for the same CTC.
 * The old-regime side assumes the given deductions (80C/80D/HRA etc.) plus the
 * ₹50k standard deduction; the new regime allows no such deductions.
 */
export function compareRegimes(
  input: CtcInput,
  oldRegimeDeductions = 150_000
): RegimeComparison {
  const b = computeInHand(input);
  const deductions = Math.max(0, oldRegimeDeductions);

  const taxableIncomeOld = Math.max(
    0,
    b.ctc - b.employerPfAnnual - b.gratuityAnnual - STANDARD_DEDUCTION_OLD - deductions
  );
  const incomeTaxOld = incomeTaxOldRegime(taxableIncomeOld);
  const inHandOld = Math.max(
    0,
    b.grossSalaryAnnual - b.employeePfAnnual - b.professionalTaxAnnual - incomeTaxOld
  );

  const newSide: RegimeSide = {
    taxableIncome: b.taxableIncome,
    incomeTaxAnnual: b.incomeTaxAnnual,
    inHandAnnual: b.inHandAnnual,
    inHandMonthly: b.inHandAnnual / 12,
  };
  const oldSide: RegimeSide = {
    taxableIncome: taxableIncomeOld,
    incomeTaxAnnual: incomeTaxOld,
    inHandAnnual: inHandOld,
    inHandMonthly: inHandOld / 12,
  };

  const diff = newSide.inHandAnnual - oldSide.inHandAnnual;
  const better = diff > 500 ? 'new' : diff < -500 ? 'old' : 'same';

  return {
    newRegime: newSide,
    oldRegime: oldSide,
    better,
    savingsAnnual: Math.abs(diff),
    oldRegimeDeductions: deductions,
  };
}

export function computeInHand(input: CtcInput): CtcBreakdown {
  const ctc = Math.max(0, input.ctc);
  const basic = ctc * (input.basicPct / 100);
  const variableAnnual = ctc * (input.variablePct / 100);

  const employerPfAnnual = input.pfOnActualBasic
    ? basic * 0.12
    : EPF_WAGE_CEILING_MONTHLY * 0.12 * 12;
  const employeePfAnnual = employerPfAnnual; // employee matches employer
  const gratuityAnnual = basic * GRATUITY_RATE;

  // Salary that actually reaches you as monthly pay (before your own deductions).
  const grossSalaryAnnual = Math.max(
    0,
    ctc - variableAnnual - employerPfAnnual - gratuityAnnual
  );

  // New regime: employee PF is NOT deductible; only the standard deduction applies.
  // Variable is taxable income in the year it is paid, so it is included here.
  const taxableIncome = Math.max(
    0,
    ctc - employerPfAnnual - gratuityAnnual - STANDARD_DEDUCTION
  );
  const incomeTaxAnnual = incomeTaxNewRegime(taxableIncome);

  const professionalTaxAnnual = Math.max(0, input.professionalTaxAnnual);

  const inHandAnnual = Math.max(
    0,
    grossSalaryAnnual - employeePfAnnual - professionalTaxAnnual - incomeTaxAnnual
  );

  return {
    ctc,
    basic,
    variableAnnual,
    employerPfAnnual,
    gratuityAnnual,
    grossSalaryAnnual,
    employeePfAnnual,
    professionalTaxAnnual,
    incomeTaxAnnual,
    taxableIncome,
    inHandAnnual,
    inHandMonthly: inHandAnnual / 12,
    totalEpfAnnual: employerPfAnnual + employeePfAnnual,
    takeHomePct: ctc > 0 ? inHandAnnual / ctc : 0,
    stockAnnual: Math.max(0, input.stockAnnual || 0),
    totalComp: ctc + Math.max(0, input.stockAnnual || 0),
  };
}

export const DEFAULT_INPUT: CtcInput = {
  ctc: 1_800_000,
  basicPct: 45,
  variablePct: 10,
  pfOnActualBasic: true,
  professionalTaxAnnual: 2_400,
};
