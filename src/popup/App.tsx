import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wallet,
  Sliders,
  ChevronDown,
  Sparkles,
  ScanLine,
  Info,
  Lock,
  Scale,
  Building2,
  Plus,
  X,
  Check,
  Trash2,
  ExternalLink,
  Crown,
  Calculator,
  ArrowLeftRight,
} from 'lucide-react';
import { computeInHand, compareRegimes, CtcInput, DEFAULT_INPUT } from '../lib/ctc';
import { parseCTC, formatINR, formatCompactINR } from '../lib/format';
import { benchmark } from '../lib/benchmark';
import {
  lookupBand,
  roleKeys,
  getRoleBand,
  availableLevels,
  LEVELS,
  Level,
  CoType,
} from '../lib/roleBands';
import {
  getPro,
  verifyLicense,
  ProState,
  GUMROAD_CONFIG,
} from '../lib/license';
import {
  getOffers,
  addOffer,
  removeOffer,
  Offer,
  MAX_OFFERS,
} from '../lib/offers';
import { useCountUp } from '../ui/useCountUp';
import { Ring } from '../ui/Ring';
import { StackedBar, Segment } from '../ui/StackedBar';

interface Persisted extends CtcInput {
  ctcText: string;
  company?: string;
  oldDeductions?: number;
  benchRole?: string;
  benchLevel?: Level;
  benchType?: CoType;
}

const STORAGE_KEY = 'salarylens:v1';
const QUICK = ['10 LPA', '18 LPA', '25 LPA', '40 LPA'];

type View = 'decode' | 'compare';

export function App() {
  const [ctcText, setCtcText] = useState('18 LPA');
  const [cfg, setCfg] = useState<CtcInput>(DEFAULT_INPUT);
  const [company, setCompany] = useState('');
  const [oldDeductions, setOldDeductions] = useState(150_000);
  const [benchRole, setBenchRole] = useState('Software Engineer');
  const [benchLevel, setBenchLevel] = useState<Level>('mid');
  const [benchType, setBenchType] = useState<CoType>('product');
  const [advanced, setAdvanced] = useState(false);
  const [ready, setReady] = useState(false);

  const [pro, setProState] = useState<ProState>({ proUnlocked: false, licenseKey: '' });
  const [view, setView] = useState<View>('decode');
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [offers, setOffers] = useState<Offer[]>([]);

  useEffect(() => {
    chrome.storage?.local.get(STORAGE_KEY).then((r) => {
      const p = r[STORAGE_KEY] as Persisted | undefined;
      if (p) {
        setCtcText(p.ctcText ?? '18 LPA');
        setCompany(p.company ?? '');
        setOldDeductions(typeof p.oldDeductions === 'number' ? p.oldDeductions : 150_000);
        if (p.benchRole) setBenchRole(p.benchRole);
        if (p.benchLevel) setBenchLevel(p.benchLevel);
        if (p.benchType) setBenchType(p.benchType);
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
    getPro().then(setProState);
    getOffers().then(setOffers);
  }, []);

  const ctc = useMemo(() => parseCTC(ctcText) ?? 0, [ctcText]);
  const b = useMemo(() => computeInHand({ ...cfg, ctc }), [cfg, ctc]);
  const regime = useMemo(
    () => compareRegimes({ ...cfg, ctc }, oldDeductions),
    [cfg, ctc, oldDeductions]
  );
  const bench = useMemo(() => benchmark(company, b.totalComp), [company, b.totalComp]);
  const band = useMemo(
    () => lookupBand(benchRole, benchLevel, benchType, b.totalComp),
    [benchRole, benchLevel, benchType, b.totalComp]
  );

  useEffect(() => {
    const role = getRoleBand(benchRole);
    if (role && !availableLevels(role).includes(benchLevel)) {
      setBenchLevel(availableLevels(role)[0] ?? 'mid');
    }
  }, [benchRole, benchLevel]);

  useEffect(() => {
    if (!ready) return;
    const payload: Persisted = {
      ...cfg,
      ctc,
      ctcText,
      company,
      oldDeductions,
      benchRole,
      benchLevel,
      benchType,
    };
    chrome.storage?.local.set({ [STORAGE_KEY]: payload });
  }, [cfg, ctc, ctcText, company, oldDeductions, benchRole, benchLevel, benchType, ready]);

  const monthly = useCountUp(b.inHandMonthly);
  const isPro = pro.proUnlocked;

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

  const openBuy = () => {
    const url = GUMROAD_CONFIG.BUY_URL;
    if (chrome.tabs?.create) chrome.tabs.create({ url });
    else window.open(url, '_blank');
  };

  const onUnlock = async () => {
    const next = await getPro();
    setProState(next);
  };

  const saveCurrentOffer = async () => {
    if (offers.length >= MAX_OFFERS) return;
    const name = (company.trim() || ctcText.trim() || 'Offer') + '';
    const next = await addOffer({ name, ctcText, cfg: { ...cfg, ctc } });
    setOffers(next);
  };

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
        {isPro ? (
          <span className="flex items-center gap-1 rounded-full border border-amber-400/40 bg-amber-400/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-300">
            <Crown className="h-2.5 w-2.5" /> Pro
          </span>
        ) : (
          <button
            onClick={() => setShowUpgrade(true)}
            className="flex items-center gap-1 rounded-full border border-mint-500/40 bg-mint-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-mint-400 transition hover:bg-mint-500/20"
          >
            <Crown className="h-2.5 w-2.5" /> Get Pro
          </button>
        )}
      </div>

      {/* Tab nav */}
      <div className="flex gap-1 px-4">
        <TabBtn active={view === 'decode'} onClick={() => setView('decode')} icon={<Calculator className="h-3.5 w-3.5" />}>
          Decode
        </TabBtn>
        <TabBtn
          active={view === 'compare'}
          onClick={() => setView('compare')}
          icon={<ArrowLeftRight className="h-3.5 w-3.5" />}
          locked={!isPro}
        >
          Compare
        </TabBtn>
      </div>

      <div className="px-4 pb-4 pt-3">
        {view === 'decode' ? (
          <>
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

            {/* PRO: Old vs New regime */}
            <ProSection
              isPro={isPro}
              onUpgrade={() => setShowUpgrade(true)}
              icon={<Scale className="h-3.5 w-3.5 text-mint-400" />}
              title="Old vs New regime"
            >
              <RegimeCard
                regime={regime}
                oldDeductions={oldDeductions}
                onDeductions={setOldDeductions}
              />
            </ProSection>

            {/* PRO: Company benchmark */}
            <ProSection
              isPro={isPro}
              onUpgrade={() => setShowUpgrade(true)}
              icon={<Building2 className="h-3.5 w-3.5 text-mint-400" />}
              title="Company benchmark"
            >
              <BenchmarkCard
                company={company}
                onCompany={setCompany}
                bench={bench}
                totalComp={b.totalComp}
                benchRole={benchRole}
                onRole={setBenchRole}
                benchLevel={benchLevel}
                onLevel={setBenchLevel}
                benchType={benchType}
                onType={setBenchType}
                band={band}
              />
            </ProSection>

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
              <b className="mx-0.5 text-slate-300">LinkedIn</b> — SalaryLens decodes the CTC right on
              the page.
            </div>
            <div className="mt-1.5 flex items-center gap-1 px-0.5 text-[9px] text-slate-600">
              <Info className="h-2.5 w-2.5" /> Estimate • New tax regime • not financial advice
            </div>
          </>
        ) : (
          <CompareView
            isPro={isPro}
            offers={offers}
            onSave={saveCurrentOffer}
            onRemove={async (id) => setOffers(await removeOffer(id))}
            onUpgrade={() => setShowUpgrade(true)}
            canSave={offers.length < MAX_OFFERS}
          />
        )}
      </div>

      <AnimatePresence>
        {showUpgrade && (
          <UpgradePanel
            onClose={() => setShowUpgrade(false)}
            onBuy={openBuy}
            onUnlock={onUnlock}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function TabBtn({
  active,
  locked,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  locked?: boolean;
  onClick: () => void;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-2 py-1.5 text-[11px] font-semibold transition ${
        active
          ? 'border-mint-500/50 bg-mint-500/15 text-mint-400'
          : 'border-transparent bg-ink-800/60 text-slate-400 hover:text-slate-200'
      }`}
    >
      {icon}
      {children}
      {locked && <Lock className="h-3 w-3 text-slate-500" />}
    </button>
  );
}

/** Pro-gated section: shows content for Pro users, a locked teaser otherwise. */
function ProSection({
  isPro,
  onUpgrade,
  icon,
  title,
  children,
}: {
  isPro: boolean;
  onUpgrade: () => void;
  icon: ReactNode;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="mt-3 rounded-2xl border border-ink-700 bg-ink-900/60 p-3.5">
      <div className="mb-2.5 flex items-center gap-1.5">
        {icon}
        <span className="text-[11px] font-semibold text-slate-300">{title}</span>
        {!isPro && (
          <span className="ml-auto flex items-center gap-1 rounded-full bg-amber-400/10 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-amber-300">
            <Crown className="h-2.5 w-2.5" /> Pro
          </span>
        )}
      </div>
      {isPro ? (
        children
      ) : (
        <div className="relative">
          <div className="pointer-events-none select-none opacity-40 blur-[3px]">{children}</div>
          <button
            onClick={onUpgrade}
            className="absolute inset-0 flex flex-col items-center justify-center gap-1 rounded-lg text-[11px] font-semibold text-mint-400"
          >
            <Lock className="h-4 w-4" />
            Unlock with Pro
          </button>
        </div>
      )}
    </div>
  );
}

function RegimeCard({
  regime,
  oldDeductions,
  onDeductions,
}: {
  regime: ReturnType<typeof compareRegimes>;
  oldDeductions: number;
  onDeductions: (v: number) => void;
}) {
  const { newRegime, oldRegime, better, savingsAnnual } = regime;
  return (
    <div className="space-y-2.5">
      <div className="grid grid-cols-2 gap-2">
        <RegimeCol label="New regime" side={newRegime} winner={better === 'new'} />
        <RegimeCol label="Old regime" side={oldRegime} winner={better === 'old'} />
      </div>
      <div
        className={`rounded-lg px-2.5 py-1.5 text-[11px] font-semibold ${
          better === 'same'
            ? 'bg-ink-800 text-slate-300'
            : 'bg-mint-500/10 text-mint-400'
        }`}
      >
        {better === 'same' ? (
          'Both regimes give you about the same in-hand.'
        ) : (
          <>
            {better === 'new' ? 'New' : 'Old'} regime wins — save{' '}
            <span className="num">{formatCompactINR(savingsAnnual)}</span>/yr
          </>
        )}
      </div>
      <Slider
        label="Old-regime deductions (80C/80D/HRA)"
        value={Math.round(oldDeductions / 1000)}
        suffix="k"
        min={0}
        max={400}
        onChange={(v) => onDeductions(v * 1000)}
      />
    </div>
  );
}

function RegimeCol({
  label,
  side,
  winner,
}: {
  label: string;
  side: { inHandMonthly: number; incomeTaxAnnual: number };
  winner: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-2.5 ${
        winner ? 'border-mint-500/50 bg-mint-500/10' : 'border-ink-700 bg-ink-800/60'
      }`}
    >
      <div className="flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wider text-slate-400">
        {winner && <Crown className="h-2.5 w-2.5 text-mint-400" />}
        {label}
      </div>
      <div className="num mt-1 text-base font-extrabold text-white">
        {formatINR(side.inHandMonthly)}<span className="text-[10px] font-medium text-slate-500">/mo</span>
      </div>
      <div className="num mt-0.5 text-[10px] text-slate-400">
        tax {formatCompactINR(side.incomeTaxAnnual)}/yr
      </div>
    </div>
  );
}

function BenchmarkCard({
  company,
  onCompany,
  bench,
  totalComp,
  benchRole,
  onRole,
  benchLevel,
  onLevel,
  benchType,
  onType,
  band,
}: {
  company: string;
  onCompany: (v: string) => void;
  bench: ReturnType<typeof benchmark>;
  totalComp: number;
  benchRole: string;
  onRole: (v: string) => void;
  benchLevel: Level;
  onLevel: (v: Level) => void;
  benchType: CoType;
  onType: (v: CoType) => void;
  band: ReturnType<typeof lookupBand>;
}) {
  const bandColor =
    bench?.band === 'above'
      ? 'text-mint-400'
      : bench?.band === 'below'
      ? 'text-red-400'
      : 'text-amber-300';

  const role = getRoleBand(benchRole);
  const levels = role ? availableLevels(role) : [];
  const verdictText: Record<string, string> = {
    below: 'well below market',
    low: 'a bit below market',
    around: 'right at market',
    high: 'above market',
    above: 'well above market',
  };
  const verdictColor =
    band?.verdict === 'below' || band?.verdict === 'low'
      ? 'text-red-400'
      : band?.verdict === 'around'
      ? 'text-amber-300'
      : 'text-mint-400';

  return (
    <div className="space-y-3">
      {/* Role × level market band */}
      <div className="space-y-2">
        <div className="flex gap-1.5">
          <select
            value={benchRole}
            onChange={(e) => onRole(e.target.value)}
            className="min-w-0 flex-1 rounded-lg border border-ink-700 bg-ink-900 px-2 py-1.5 text-[11px] text-white outline-none focus:border-mint-500/60"
          >
            {roleKeys().map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
          <select
            value={benchLevel}
            onChange={(e) => onLevel(e.target.value as Level)}
            className="shrink-0 rounded-lg border border-ink-700 bg-ink-900 px-2 py-1.5 text-[11px] text-white outline-none focus:border-mint-500/60"
          >
            {LEVELS.filter((l) => levels.includes(l.key)).map((l) => (
              <option key={l.key} value={l.key}>
                {l.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex gap-1">
          {(['product', 'service'] as CoType[]).map((t) => (
            <button
              key={t}
              onClick={() => onType(t)}
              className={`flex-1 rounded-md border px-2 py-1 text-[10px] font-semibold capitalize transition ${
                benchType === t
                  ? 'border-mint-500/50 bg-mint-500/15 text-mint-400'
                  : 'border-ink-700 bg-ink-800 text-slate-400'
              }`}
            >
              {t} co.
            </button>
          ))}
        </div>

        {band && (
          <div className="rounded-xl border border-ink-700 bg-ink-800/60 p-2.5">
            <div className="num flex items-baseline justify-between text-[11px] text-slate-400">
              <span>{formatCompactINR(band.band.low)}</span>
              <span className="text-slate-300">
                median <b className="text-white">{formatCompactINR(band.band.median)}</b>
              </span>
              <span>{formatCompactINR(band.band.high)}</span>
            </div>
            {/* range bar with the user's total-comp marker */}
            <div className="relative mt-2 h-1.5 w-full rounded-full bg-gradient-to-r from-red-500/40 via-amber-400/40 to-mint-500/50">
              <div
                className="absolute -top-1 h-3.5 w-1 -translate-x-1/2 rounded-full bg-white shadow"
                style={{ left: `${band.position * 100}%` }}
              />
            </div>
            <div className={`num mt-2 text-[12px] font-semibold ${verdictColor}`}>
              Your {formatCompactINR(totalComp)} is {verdictText[band.verdict]}
            </div>
          </div>
        )}
      </div>

      {/* Company match (optional refinement) */}
      <input
        value={company}
        onChange={(e) => onCompany(e.target.value)}
        placeholder="Refine by company (e.g. Google, TCS)"
        className="w-full rounded-lg border border-ink-700 bg-ink-900 px-2.5 py-2 text-[12px] text-white outline-none placeholder:text-slate-600 focus:border-mint-500/60"
      />
      {bench && (
        <div className="rounded-xl border border-ink-700 bg-ink-800/60 p-2.5">
          <div className="text-[11px] text-slate-300">
            Typical mid-SWE at <b className="text-white">{bench.company}</b>:{' '}
            <span className="num font-bold text-white">{formatCompactINR(bench.typicalCtc)}</span>
          </div>
          <div className={`num mt-1 text-[12px] font-semibold ${bandColor}`}>
            Your {formatCompactINR(totalComp)} is{' '}
            {bench.band === 'around'
              ? 'around it'
              : `${Math.abs(Math.round(bench.deltaPct * 100))}% ${bench.band}`}
          </div>
        </div>
      )}
      <div className="text-[9px] leading-relaxed text-slate-600">
        Aggregate market ranges (product cos., metros) from public 2025-26 salary reports — estimates, not offers.
      </div>
    </div>
  );
}

function CompareView({
  isPro,
  offers,
  onSave,
  onRemove,
  onUpgrade,
  canSave,
}: {
  isPro: boolean;
  offers: Offer[];
  onSave: () => void;
  onRemove: (id: string) => void;
  onUpgrade: () => void;
  canSave: boolean;
}) {
  if (!isPro) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-ink-700 bg-ink-900/60 p-6 text-center">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-mint-500/10">
          <ArrowLeftRight className="h-5 w-5 text-mint-400" />
        </div>
        <div className="text-[13px] font-bold text-white">Compare offers side by side</div>
        <div className="text-[11px] leading-relaxed text-slate-400">
          Save multiple offers and see real monthly in-hand ranked, stock included. Perfect when
          you’re juggling offers.
        </div>
        <button
          onClick={onUpgrade}
          className="mt-1 flex items-center gap-1.5 rounded-lg bg-mint-500 px-3.5 py-2 text-[12px] font-bold text-ink-950 transition hover:bg-mint-400"
        >
          <Crown className="h-3.5 w-3.5" /> Unlock Pro — {GUMROAD_CONFIG.PRICE}
        </button>
      </div>
    );
  }

  const rows = offers
    .map((o) => ({ offer: o, b: computeInHand(o.cfg) }))
    .sort((a, x) => x.b.inHandMonthly - a.b.inHandMonthly);
  const best = rows[0]?.b.inHandMonthly ?? 0;

  return (
    <div className="space-y-3">
      <button
        onClick={onSave}
        disabled={!canSave}
        className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-mint-500/40 bg-mint-500/10 px-3 py-2.5 text-[12px] font-bold text-mint-400 transition hover:bg-mint-500/20 disabled:opacity-40"
      >
        <Plus className="h-4 w-4" />
        {canSave ? 'Save current offer to compare' : `Max ${MAX_OFFERS} offers`}
      </button>

      {rows.length === 0 ? (
        <div className="rounded-xl bg-ink-800/70 px-3 py-6 text-center text-[11px] text-slate-400">
          No offers saved yet. Decode a CTC, then save it here to compare.
        </div>
      ) : (
        <div className="space-y-2">
          {rows.map(({ offer, b }, i) => {
            const pct = best > 0 ? b.inHandMonthly / best : 0;
            const isBest = i === 0;
            const gap = best - b.inHandMonthly;
            return (
              <div
                key={offer.id}
                className={`rounded-xl border p-3 ${
                  isBest ? 'border-mint-500/50 bg-mint-500/10' : 'border-ink-700 bg-ink-800/60'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  {isBest && <Crown className="h-3.5 w-3.5 shrink-0 text-mint-400" />}
                  <span className="flex-1 truncate text-[12px] font-bold text-white">
                    {offer.name}
                  </span>
                  <button
                    onClick={() => onRemove(offer.id)}
                    className="text-slate-500 transition hover:text-red-400"
                    aria-label="Remove offer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="num mt-1 flex items-baseline gap-2">
                  <span className="text-lg font-extrabold text-white">
                    {formatINR(b.inHandMonthly)}
                  </span>
                  <span className="text-[10px] text-slate-500">/mo in-hand</span>
                </div>
                <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-ink-700">
                  <div
                    className={`h-full rounded-full ${isBest ? 'bg-mint-400' : 'bg-slate-500'}`}
                    style={{ width: `${Math.max(6, pct * 100)}%` }}
                  />
                </div>
                <div className="num mt-1.5 flex justify-between text-[10px] text-slate-400">
                  <span>{formatCompactINR(offer.cfg.ctc)} CTC{offer.cfg.stockAnnual ? ` + ${formatCompactINR(offer.cfg.stockAnnual)} stock` : ''}</span>
                  <span className={isBest ? 'text-mint-400' : ''}>
                    {isBest ? 'Best in-hand' : `−${formatINR(gap)}/mo`}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function UpgradePanel({
  onClose,
  onBuy,
  onUnlock,
}: {
  onClose: () => void;
  onBuy: () => void;
  onUnlock: () => void;
}) {
  const [key, setKey] = useState('');
  const [status, setStatus] = useState<'idle' | 'checking' | 'error'>('idle');
  const [err, setErr] = useState('');

  const submit = async () => {
    setStatus('checking');
    setErr('');
    const res = await verifyLicense(key);
    if (res.ok) {
      onUnlock();
      onClose();
    } else {
      setStatus('error');
      setErr(res.error ?? 'Could not verify license.');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-20 flex items-end bg-black/60"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        transition={{ duration: 0.22 }}
        className="w-full rounded-t-2xl border-t border-ink-700 bg-ink-900 p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center gap-2">
          <Crown className="h-4 w-4 text-amber-300" />
          <span className="text-[14px] font-extrabold text-white">SalaryLens Pro</span>
          <button onClick={onClose} className="ml-auto text-slate-500 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>

        <ul className="mb-3 space-y-1.5 text-[12px] text-slate-300">
          {[
            'Compare multiple offers side by side',
            'Old vs New tax regime — pick what saves more',
            'Company pay benchmarks (₹, mid-SWE)',
          ].map((f) => (
            <li key={f} className="flex items-center gap-2">
              <Check className="h-3.5 w-3.5 shrink-0 text-mint-400" /> {f}
            </li>
          ))}
        </ul>

        <div className="mb-3 flex items-baseline gap-2">
          <span className="num text-2xl font-extrabold text-white">{GUMROAD_CONFIG.PRICE}</span>
          <span className="num text-sm text-slate-500 line-through">{GUMROAD_CONFIG.PRICE_ANCHOR}</span>
          <span className="text-[11px] text-slate-400">one-time · lifetime</span>
        </div>

        <button
          onClick={onBuy}
          className="mb-3 flex w-full items-center justify-center gap-1.5 rounded-xl bg-mint-500 px-3 py-2.5 text-[13px] font-bold text-ink-950 transition hover:bg-mint-400"
        >
          Get Pro <ExternalLink className="h-3.5 w-3.5" />
        </button>

        <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
          Already bought? Paste license key
        </div>
        <div className="flex gap-1.5">
          <input
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="XXXXXXXX-XXXXXXXX-…"
            className="num w-full rounded-lg border border-ink-700 bg-ink-950 px-2.5 py-2 text-[12px] text-white outline-none placeholder:text-slate-600 focus:border-mint-500/60"
          />
          <button
            onClick={submit}
            disabled={status === 'checking'}
            className="shrink-0 rounded-lg bg-ink-700 px-3 text-[12px] font-bold text-white transition hover:bg-ink-600 disabled:opacity-50"
          >
            {status === 'checking' ? '…' : 'Unlock'}
          </button>
        </div>
        {status === 'error' && <div className="mt-1.5 text-[11px] text-red-400">{err}</div>}
      </motion.div>
    </motion.div>
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
