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
