import { detectCTC, bestFromText } from './scan';
import { estimateFromRole, getJobContext, RoleEstimate } from './estimate';
import { computeInHand, DEFAULT_INPUT } from '../lib/ctc';
import { formatINR, formatCompactINR } from '../lib/format';

const HOST_ID = 'salarylens-host';
type Source = 'page' | 'selection' | 'estimate';
let lastKey = '';

let hostEl: HTMLElement | null = null;

/** The job-title element to anchor next to (LinkedIn / Naukri). */
function findTitleEl(): HTMLElement | null {
  // 1) Known LinkedIn / Naukri title selectors (fast path).
  const known = document.querySelector<HTMLElement>(
    '.job-details-jobs-unified-top-card__job-title h1, .job-details-jobs-unified-top-card__job-title, .jobs-unified-top-card__job-title, .topcard__title, .top-card-layout__title, [class*="jd-header-title" i], .styles_jd-header-title__rZwM1'
  );
  if (known) return known;
  // 2) Resilient fallback: the first real <h1> inside LinkedIn's job-detail pane.
  //    LinkedIn renames the title class often, but the job title stays an <h1>.
  const scope =
    document.querySelector(
      '[class*="job-details-jobs-unified-top-card" i], [class*="jobs-unified-top-card" i], .jobs-details, .job-view-layout, main'
    ) || document.body;
  for (const h of Array.from(scope.querySelectorAll<HTMLElement>('h1'))) {
    if ((h.textContent || '').trim().length >= 2 && h.offsetParent !== null) return h;
  }
  return null;
}

/** Place the host inline right after the job title; fall back to floating. */
function anchor(host: HTMLElement): 'inline' | 'float' {
  const title = findTitleEl();
  if (title && title.parentElement) {
    if (title.nextElementSibling !== host) title.insertAdjacentElement('afterend', host);
    host.dataset.slMode = 'inline';
    return 'inline';
  }
  if (host.parentElement !== document.body) document.body.appendChild(host);
  host.dataset.slMode = 'float';
  return 'float';
}

/** Keep the shadow-DOM wrapper's layout class in sync with the current anchor mode. */
function applyMode(host: HTMLElement, mode: 'inline' | 'float') {
  const wrap = host.shadowRoot?.querySelector('.wrap');
  if (wrap) wrap.className = `wrap ${mode}`;
}

/** True only where we should show anything (LinkedIn job pages / Naukri). */
function onJobContext(): boolean {
  const h = location.hostname;
  if (h.includes('naukri.com')) return true;
  if (h.includes('linkedin.com')) return location.pathname.startsWith('/jobs');
  return false;
}

/** Remove the tile when we navigate away from a job page. */
function teardown() {
  if (hostEl?.isConnected) hostEl.remove();
  hostEl = null;
  lastKey = '';
}

function render(annual: number, source: Source, open: boolean, est?: RoleEstimate) {
  const key = `${annual}:${source}:${est?.role || ''}`;

  let host = hostEl;
  if (!host) {
    host = document.createElement('div');
    host.id = HOST_ID;
    host.attachShadow({ mode: 'open' });
    hostEl = host;
  }
  const prevMode = host.dataset.slMode as 'inline' | 'float' | undefined;
  const mode = anchor(host); // place inline after the job title, else float
  // Same content and stable anchor → keep layout in sync and skip a re-render.
  // (A float→inline upgrade, e.g. the title loading late, falls through to render.)
  if (key === lastKey && !open && mode === prevMode) {
    applyMode(host, mode);
    return;
  }

  const b = computeInHand({
    ...DEFAULT_INPUT,
    ctc: annual,
    variablePct: 10,
    basicPct: 45,
    stockAnnual: est?.stockAnnual || 0,
  });
  let srcLine: string;
  if (source === 'selection') srcLine = `From your selection • ${formatCompactINR(annual)}`;
  else if (source === 'estimate' && est)
    srcLine = `Est: ${est.role}${est.company ? ' @ ' + est.company : ''} • ${est.basis} • total ${formatCompactINR(est.low)}–${formatCompactINR(est.high)}`;
  else srcLine = `Detected on page • ${formatCompactINR(annual)}`;

  const root = host.shadowRoot!;
  lastKey = key;
  // Always start minimized (just the pill). Only an explicit text-selection opens it.
  const openCard = open;

  const seg = [
    { c: '#34e0a1', v: b.inHandAnnual, label: 'In-hand' },
    { c: '#3b82f6', v: b.totalEpfAnnual, label: 'EPF' },
    { c: '#f97066', v: b.incomeTaxAnnual, label: 'Tax' },
    { c: '#f5b544', v: b.variableAnnual, label: 'Bonus' },
  ];
  if (b.stockAnnual > 0) seg.push({ c: '#a78bfa', v: b.stockAnnual, label: 'Stock' });
  const segTotal = seg.reduce((s, x) => s + x.v, 0) || 1;
  const bar = seg
    .map((s) => `<span style="width:${(s.v / segTotal) * 100}%;background:${s.c}"></span>`)
    .join('');
  const legend = seg
    .map(
      (s) =>
        `<div class="li"><i style="background:${s.c}"></i>${s.label} <b>${formatCompactINR(s.v)}</b></div>`
    )
    .join('');

  root.innerHTML = `
    <style>
      :host { all: initial; }
      *{box-sizing:border-box}
      .wrap { z-index: 2147483647;
        font-family: 'Inter', system-ui, -apple-system, Segoe UI, sans-serif;
        display:flex; flex-direction:column; align-items:flex-end; }
      .wrap.float { position: fixed; right: 20px; bottom: 20px; }
      .wrap.inline { position: static; align-items:flex-start; margin: 12px 0 6px;
        max-width: 360px; }
      .card { width:332px; color:#e9eef7; position:relative;
        background:
          radial-gradient(120% 80% at 100% 0%, rgba(52,224,161,.14), transparent 60%),
          linear-gradient(160deg,#0c1526 0%,#0a1120 100%);
        border:1px solid rgba(52,224,161,.28); border-radius:18px; padding:16px;
        margin-bottom:12px; overflow:hidden;
        box-shadow:0 24px 60px -18px rgba(0,0,0,.75), 0 0 0 1px rgba(255,255,255,.02) inset;
        display:none; transform-origin:bottom right;
        animation: pop .4s cubic-bezier(.16,1,.3,1); }
      .card.open { display:block; }
      .card.pulse { animation: pop .4s cubic-bezier(.16,1,.3,1), glow 1.4s ease-out .4s 3; }
      @keyframes pop { from{opacity:0;transform:translateY(14px) scale(.96)} to{opacity:1;transform:none} }
      @keyframes glow {
        0%{box-shadow:0 24px 60px -18px rgba(0,0,0,.75), 0 0 0 0 rgba(52,224,161,.55)}
        70%{box-shadow:0 24px 60px -18px rgba(0,0,0,.75), 0 0 0 14px rgba(52,224,161,0)}
        100%{box-shadow:0 24px 60px -18px rgba(0,0,0,.75), 0 0 0 0 rgba(52,224,161,0)} }
      .glowbar{position:absolute;top:0;left:0;right:0;height:2px;
        background:linear-gradient(90deg,transparent,#34e0a1,transparent)}
      .hd { display:flex; align-items:center; gap:9px; margin-bottom:14px; }
      .lg { width:26px;height:26px;border-radius:8px;
        background:linear-gradient(135deg,#34e0a1,#0aa874);
        display:grid;place-items:center;color:#04140d;font-weight:900;font-size:14px;
        box-shadow:0 4px 14px -3px rgba(52,224,161,.6); }
      .ti { font-weight:800;font-size:15px;letter-spacing:-.01em } .ti span{color:#34e0a1}
      .badge{font-size:9px;font-weight:800;letter-spacing:.08em;color:#34e0a1;
        background:rgba(52,224,161,.12);border:1px solid rgba(52,224,161,.3);
        padding:3px 7px;border-radius:6px;text-transform:uppercase}
      .x { margin-left:auto;cursor:pointer;color:#7c8aa5;background:none;border:none;
        font-size:20px;line-height:1;padding:0 2px }
      .x:hover{color:#e9eef7}
      .heroLabel{font-size:11px;color:#8ea0bd;font-weight:600;margin-bottom:3px}
      .heroRow{display:flex;align-items:flex-end;justify-content:space-between;gap:10px}
      .big { font-size:38px;font-weight:800;letter-spacing:-.03em;line-height:1;
        color:#fff;font-variant-numeric:tabular-nums;
        text-shadow:0 0 30px rgba(52,224,161,.25) }
      .big small{font-size:15px;color:#8ea0bd;font-weight:600;margin-left:2px}
      .th{flex:none;text-align:center;padding:7px 11px;border-radius:12px;
        background:rgba(52,224,161,.1);border:1px solid rgba(52,224,161,.25)}
      .th b{display:block;font-size:19px;font-weight:800;color:#34e0a1;font-variant-numeric:tabular-nums;line-height:1}
      .th i{font-style:normal;font-size:9px;color:#8ea0bd;letter-spacing:.04em}
      .sub { color:#8ea0bd;font-size:11px;margin-top:6px }
      .track{display:flex;height:9px;border-radius:6px;overflow:hidden;margin:14px 0 8px;
        background:#111c30}
      .track span{display:block;height:100%}
      .legend{display:flex;flex-wrap:wrap;gap:10px 14px;margin-bottom:12px}
      .li{display:flex;align-items:center;gap:6px;font-size:11px;color:#a9b8d1;
        font-variant-numeric:tabular-nums}
      .li i{width:8px;height:8px;border-radius:3px;display:inline-block}
      .li b{color:#e9eef7;font-weight:700}
      .src{color:#7c8aa5;font-size:10px;margin-top:2px;line-height:1.4}
      .note{color:#5a6b86;font-size:9px;margin-top:8px;line-height:1.4}
      .pill { display:flex; align-items:center; gap:9px; cursor:pointer; position:relative;
        background: linear-gradient(135deg,#34e0a1,#0aa874); color:#04140d;
        padding:11px 16px; border-radius:9999px; font-weight:800; font-size:14px;
        border:none; font-family:inherit;
        box-shadow:0 12px 30px -8px rgba(16,201,138,.7);
        transition: transform .16s ease, box-shadow .16s ease; }
      .pill:hover { transform: translateY(-2px); box-shadow:0 16px 36px -8px rgba(16,201,138,.85); }
      .pill .ping{position:absolute;inset:0;border-radius:9999px;
        box-shadow:0 0 0 0 rgba(52,224,161,.7);animation:ping 2.2s cubic-bezier(0,0,.2,1) infinite}
      @keyframes ping{0%{box-shadow:0 0 0 0 rgba(52,224,161,.55)}
        70%{box-shadow:0 0 0 12px rgba(52,224,161,0)}100%{box-shadow:0 0 0 0 rgba(52,224,161,0)}}
      .pill .lens{width:16px;height:16px;border-radius:50%;
        border:2px solid #04140d;position:relative;flex:none;opacity:.85}
      .pill .lens:after{content:'';position:absolute;right:-4px;bottom:-3px;width:6px;height:2px;
        background:#04140d;transform:rotate(45deg);border-radius:2px}
    </style>
    <div class="wrap ${mode}">
      <div class="card ${openCard ? 'open' : ''} ${openCard ? 'pulse' : ''}" id="sl-card">
        <div class="glowbar"></div>
        <div class="hd">
          <div class="lg">₹</div>
          <div class="ti">Salary<span>Lens</span></div>
          <span class="badge">${source === 'estimate' ? 'Estimated' : source === 'selection' ? 'Selection' : 'In-hand'}</span>
          <button class="x" id="sl-x" title="Collapse">×</button>
        </div>
        <div class="heroLabel">${source === 'estimate' ? 'Est. monthly in-hand (cash)' : 'Real monthly in-hand'}</div>
        <div class="heroRow">
          <div class="big">${source === 'estimate' ? '~' : ''}${formatINR(b.inHandMonthly)}<small>/mo</small></div>
          <div class="th"><b>${Math.round(b.takeHomePct * 100)}%</b><i>of cash</i></div>
        </div>
        <div class="sub">${
          source === 'estimate' && est
            ? `~${formatCompactINR(b.totalComp)} total comp · cash ${formatCompactINR(annual)}${b.stockAnnual > 0 ? ` + ${formatCompactINR(b.stockAnnual)} stock/yr` : ''}`
            : `from ${formatCompactINR(annual)} CTC · New regime FY25-26`
        }</div>
        <div class="track">${bar}</div>
        <div class="legend">${legend}</div>
        <div class="src">${srcLine}</div>
        <div class="note">${
          source === 'estimate'
            ? 'Rough market estimate — no salary listed. Stock (RSU/ESOP) vests over years & isn\u2019t monthly cash. Select real salary text to override.'
            : 'Estimate • open the extension to fine-tune basic %, variable & PF.'
        }</div>
      </div>
      <button class="pill" id="sl-pill">
        <span class="ping"></span><span class="lens"></span>
        ${source === 'estimate' ? '~' : ''}${formatINR(b.inHandMonthly)}/mo in-hand
      </button>
    </div>
  `;

  const card = root.getElementById('sl-card')!;
  root.getElementById('sl-pill')!.addEventListener('click', () => {
    card.classList.toggle('open');
    card.classList.remove('pulse');
  });
  root.getElementById('sl-x')!.addEventListener('click', () => card.classList.remove('open'));
}

function scan() {
  // Only ever show anything on a real job page (LinkedIn is a SPA — the script now
  // loads site-wide, so bail out everywhere else and clean up if we drifted off a job).
  if (!onJobContext()) {
    teardown();
    return;
  }
  const hit = detectCTC();
  if (hit) {
    console.debug('[SalaryLens] detected CTC on page:', hit.annual);
    render(hit.annual, 'page', false);
    return;
  }
  // No salary on the page → estimate from the job role.
  const ctx = getJobContext();
  const est = estimateFromRole(ctx);
  if (est) {
    console.debug('[SalaryLens] no salary listed — estimated from role:', est);
    render(est.cashCtc, 'estimate', false, est);
    return;
  }
  // We genuinely can't tell — be honest instead of showing a wrong number.
  if (ctx.title) {
    console.debug('[SalaryLens] not enough data to estimate CTC for:', ctx.title);
    renderNote();
  }
}

/** Honest "no data" tile shown when neither detection nor estimate is reliable. */
function renderNote() {
  const key = 'note';
  if (key === lastKey) return;
  lastKey = key;
  let host = hostEl;
  if (!host) {
    host = document.createElement('div');
    host.id = HOST_ID;
    host.attachShadow({ mode: 'open' });
    hostEl = host;
  }
  const mode = anchor(host);
  host.shadowRoot!.innerHTML = `
    <style>
      :host{all:initial}*{box-sizing:border-box}
      .wrap{z-index:2147483647;font-family:'Inter',system-ui,sans-serif;display:flex}
      .wrap.float{position:fixed;right:20px;bottom:20px}
      .wrap.inline{position:static;margin:12px 0 6px}
      .chip{display:flex;align-items:center;gap:8px;max-width:320px;
        background:linear-gradient(160deg,#0c1526,#0a1120);color:#a9b8d1;
        border:1px solid #223049;border-radius:12px;padding:10px 13px;font-size:12px;line-height:1.4;
        box-shadow:0 14px 34px -14px rgba(0,0,0,.7)}
      .dot{width:20px;height:20px;border-radius:6px;flex:none;display:grid;place-items:center;
        background:rgba(148,163,184,.15);color:#94a3b8;font-weight:800;font-size:12px}
      b{color:#e9eef7;font-weight:700}
    </style>
    <div class="wrap ${mode}">
      <div class="chip">
        <span class="dot">₹</span>
        <span><b>Not enough data</b> to estimate this CTC. If a salary is listed, select the text to decode it.</span>
      </div>
    </div>`;
}

let t: number | undefined;
function debouncedScan() {
  clearTimeout(t);
  t = window.setTimeout(scan, 600);
}

// Decode whatever CTC-like text the user selects — works even when the page hides salary.
document.addEventListener('mouseup', () => {
  const sel = window.getSelection()?.toString() || '';
  if (sel.length < 2 || sel.length > 80) return;
  const val = bestFromText(sel);
  if (val) {
    console.debug('[SalaryLens] decoded from selection:', val);
    render(val, 'selection', true);
  }
});

// Re-attach the tile if LinkedIn's re-render strips it out, and upgrade a late
// float→inline once the job title finally shows up (preserves content, no re-pulse).
function remount() {
  if (!hostEl) return;
  const title = findTitleEl();
  const mode = hostEl.dataset.slMode;
  const inlineReady = !!(title && title.parentElement);
  const drifted = mode === 'inline' && title && title.nextElementSibling !== hostEl;
  const upgrade = mode === 'float' && inlineReady; // title loaded late → move inline
  if (!hostEl.isConnected || drifted || upgrade) {
    const newMode = anchor(hostEl);
    applyMode(hostEl, newMode);
  }
}

// Re-scan on SPA navigation (LinkedIn switches jobs without a reload).
let lastUrl = location.href;
setInterval(() => {
  if (location.href !== lastUrl) {
    lastUrl = location.href;
    lastKey = '';
    debouncedScan();
  }
  remount();
}, 700);

scan();
const mo = new MutationObserver(debouncedScan);
mo.observe(document.body, { childList: true, subtree: true, characterData: true });

console.log('[SalaryLens] content script active on', location.host, '— select any salary text to decode.');
