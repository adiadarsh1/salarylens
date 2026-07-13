import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wallet,
  Sliders,
  ChevronDown,
  Sparkles,
  ScanLine,
  Info,
} from 'lucide-react';
import { computeInHand, CtcInput, DEFAULT_INPUT } from '../lib/ctc';
import { parseCTC, formatINR, formatCompactINR } from '../lib/format';
import { useCountUp } from '../ui/useCountUp';
import { Ring } from '../ui/Ring';
import { StackedBar, Segment } from '../ui/StackedBar';

interface Persisted extends CtcInput {
  ctcText: string;
}

const STORAGE_KEY = 'salarylens:v1';
const QUICK = ['10 LPA', '18 LPA', '25 LPA', '40 LPA'];

export function App() {
  const [ctcText, setCtcText] = useState('18 LPA');
  const [cfg, setCfg] = useState<CtcInput>(DEFAULT_INPUT);
  const [advanced, setAdvanced] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    chrome.storage?.local.get(STORAGE_KEY).then((r) => {
      const p = r[STORAGE_KEY] as Persisted | undefined;
      if (p) {
        setCtcText(p.ctcText ?? '18 LPA');
        setCfg({
          ctc: p.ctc,
          basicPct: p.basicPct,
          variablePct: p.variablePct,
          pfOnActualBasic: p.pfOnActualBasic,
          professionalTaxAnnual: p.professionalTaxAnnual,
          stockAnnual: p.stockAnnual,
        });
      }
      setReady(true);
    });
  }, []);

  const ctc = useMemo(() => parseCTC(ctcText) ?? 0, [ctcText]);
  const b = useMemo(() => computeInHand({ ...cfg, ctc }), [cfg, ctc]);

  useEffect(() => {
    if (!ready) return;
    const payload: Persisted = { ...cfg, ctc, ctcText };
    chrome.storage?.local.set({ [STORAGE_KEY]: payload });
  }, [cfg, ctc, ctcText, ready]);

  const monthly = useCountUp(b.inHandMonthly);

  const segments: Segment[] = [
    { key: 'inhand', label: 'In-hand', value: b.inHandAnnual, color: '#34e0a1', hint: 'Yearly take-home' },
    { key: 'epf', label: 'EPF (savings)', value: b.totalEpfAnnual, color: '#5b8def', hint: 'Yours at retirement' },
    { key: 'tax', label: 'Income tax', value: b.incomeTaxAnnual, color: '#ef6a6a', hint: 'New regime + cess' },
    { key: 'variable', label: 'Variable', value: b.variableAnnual, color: '#f5c451', hint: 'Paid as bonus' },
    ...(b.stockAnnual > 0
      ? [{ key: 'stock', label: 'Stock / RSU', value: b.stockAnnual, color: '#a78bfa', hint: 'Vests over years' } as Segment]
      : []),
    {
      key: 'other',
      label: 'Gratuity + PT',
      value: b.gratuityAnnual + b.professionalTaxAnnual,
      color: '#64748b',
      hint: 'Gratuity & prof. tax',
    },
  ];

  const set = (patch: Partial<CtcInput>) => setCfg((c) => ({ ...c, ...patch }));

  return (
    <div className="w-[384px] bg-ink-950 bg-ink-grad font-sans text-white">
      {/* Header */}
      <div className="flex items-center gap-2.5 px-4 pb-2 pt-3.5">
        <img src="/icons/icon48.png" alt="" className="h-7 w-7 rounded-lg" />
        <div className="flex-1">
          <div className="text-[15px] font-extrabold leading-none">
            Salary<span className="text-mint-400">Lens</span>
          </div>
          <div className="text-[10px] text-slate-400">See your real in-hand pay</div>
        </div>
        <span className="rounded-full border border-mint-500/30 bg-mint-500/10 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-mint-400">
          FY 25-26
        </span>
      </div>

      <div className="px-4 pb-4">
        {/* CTC input */}
        <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-slate-400">
          Annual CTC
        </label>
        <div className="flex items-center gap-2 rounded-xl border border-ink-700 bg-ink-900 px-3 py-2.5 focus-within:border-mint-500/60 focus-within:shadow-glow">
          <Wallet className="h-4 w-4 shrink-0 text-mint-400" />
          <input
            value={ctcText}
            onChange={(e) => setCtcText(e.target.value)}
            placeholder="e.g. 18 LPA or 12,50,000"
            className="num w-full bg-transparent text-lg font-bold text-white outline-none placeholder:text-slate-600"
          />
          {ctc > 0 && (
            <span className="num shrink-0 text-xs text-slate-400">{formatINR(ctc)}</span>
          )}
        </div>
        <div className="mt-2 flex gap-1.5">
          {QUICK.map((q) => (
            <button
              key={q}
              onClick={() => setCtcText(q)}
              className={`num rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition ${
                ctcText === q
                  ? 'border-mint-500/50 bg-mint-500/15 text-mint-400'
                  : 'border-ink-700 bg-ink-800 text-slate-300 hover:border-mint-500/40'
              }`}
            >
              {q}
            </button>
          ))}
        </div>

        {/* Hero result */}
        <motion.div
          key={Math.round(b.inHandMonthly)}
          className="mt-4 flex items-center gap-3 rounded-2xl border border-ink-700 bg-gradient-to-b from-ink-800 to-ink-900 p-4 shadow-card"
        >
          <div className="flex-1">
            <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-mint-400">
              <Sparkles className="h-3 w-3" /> Monthly in-hand
            </div>
            <div className="num mt-1 text-[34px] font-extrabold leading-none text-white">
              {formatINR(monthly)}
            </div>
            <div className="num mt-1.5 text-xs text-slate-400">
              {formatCompactINR(b.inHandAnnual)}/yr take-home
            </div>
          </div>
          <Ring
            pct={b.takeHomePct}
            label={`${Math.round(b.takeHomePct * 100)}%`}
            sublabel="take-home"
          />
        </motion.div>

        {/* Breakdown */}
        <div className="mt-4 rounded-2xl border border-ink-700 bg-ink-900/60 p-3.5">
          <div className="mb-2.5 flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-300">
              Where your {formatCompactINR(b.ctc)} goes
            </span>
          </div>
          <StackedBar segments={segments} total={b.ctc} />
        </div>

        {/* Advanced */}
        <button
          onClick={() => setAdvanced((a) => !a)}
          className="mt-3 flex w-full items-center gap-2 text-[11px] font-semibold text-slate-400 hover:text-mint-400"
        >
          <Sliders className="h-3.5 w-3.5" /> Assumptions
          <ChevronDown
            className={`ml-auto h-4 w-4 transition-transform ${advanced ? 'rotate-180' : ''}`}
          />
        </button>
        <AnimatePresence initial={false}>
          {advanced && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden"
            >
              <div className="mt-2.5 space-y-3 rounded-xl border border-ink-700 bg-ink-900 p-3">
                <Slider
                  label="Basic salary"
                  value={cfg.basicPct}
                  suffix="% of CTC"
                  min={25}
                  max={60}
                  onChange={(v) => set({ basicPct: v })}
                />
                <Slider
                  label="Variable / bonus"
                  value={cfg.variablePct}
                  suffix="% of CTC"
                  min={0}
                  max={40}
                  onChange={(v) => set({ variablePct: v })}
                />
                <Slider
                  label="Stock / RSU"
                  value={Math.round((cfg.stockAnnual || 0) / 1e5)}
                  suffix="L/yr (separate)"
                  min={0}
                  max={100}
                  onChange={(v) => set({ stockAnnual: v * 1e5 })}
                />
                <label className="flex items-center justify-between text-[11px] text-slate-300">
                  <span>PF on actual basic (vs ₹1,800 cap)</span>
                  <input
                    type="checkbox"
                    checked={cfg.pfOnActualBasic}
                    onChange={(e) => set({ pfOnActualBasic: e.target.checked })}
                    className="h-4 w-4 accent-mint-500"
                  />
                </label>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer hints */}
        <div className="mt-3.5 flex items-start gap-1.5 rounded-lg bg-ink-800/70 px-2.5 py-2 text-[10px] text-slate-400">
          <ScanLine className="mt-0.5 h-3 w-3 shrink-0 text-mint-400" />
          Open a job on <b className="mx-0.5 text-slate-300">Naukri</b> or
          <b className="mx-0.5 text-slate-300">LinkedIn</b> — SalaryLens decodes the CTC right on the
          page.
        </div>
        <div className="mt-1.5 flex items-center gap-1 px-0.5 text-[9px] text-slate-600">
          <Info className="h-2.5 w-2.5" /> Estimate • New tax regime • not financial advice
        </div>
      </div>
    </div>
  );
}

function Slider({
  label,
  value,
  suffix,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  suffix: string;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-[11px]">
        <span className="text-slate-300">{label}</span>
        <span className="num font-semibold text-mint-400">
          {value}
          <span className="text-slate-500"> {suffix}</span>
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-1 w-full cursor-pointer appearance-none rounded-full bg-ink-700 accent-mint-500"
      />
    </div>
  );
}
