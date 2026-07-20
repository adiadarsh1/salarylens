/**
 * SalaryLens Pro — Gumroad license layer.
 *
 * Payments run through Gumroad (a Merchant-of-Record that handles global
 * tax/GST and pays out to India). No server required: the user buys Pro,
 * pastes their license key, and we verify it against Gumroad's public API.
 *
 * IMPORTANT (setup): create a SalaryLens product on Gumroad, then paste its
 * license-API product id + public checkout URL below. The offer_code param
 * pre-applies the launch discount at checkout.
 */

const GUMROAD = {
  // TODO(user): replace with the SalaryLens Gumroad product id + buy URL.
  // Set the Gumroad base price to $2.99 (≈ ₹250). India-only product, so
  // do NOT enable PPP here (unlike Snippix) — $2.99 is already the India price.
  PRODUCT_ID: 'Nzz-SdeFSrijKed-1wPgyg==',
  BUY_URL: 'https://adiadarsh.gumroad.com/l/salarylens?offer_code=LAUNCH',
  PRICE: '₹249',
  PRICE_ANCHOR: '₹499',
} as const;

export const GUMROAD_CONFIG = GUMROAD;

const PRO_KEY = 'salarylens:pro';

export interface ProState {
  proUnlocked: boolean;
  licenseKey: string;
}

const DEFAULT_PRO: ProState = { proUnlocked: false, licenseKey: '' };

export async function getPro(): Promise<ProState> {
  try {
    const r = await chrome.storage?.local.get(PRO_KEY);
    return { ...DEFAULT_PRO, ...(r?.[PRO_KEY] as Partial<ProState> | undefined) };
  } catch {
    return { ...DEFAULT_PRO };
  }
}

export async function setPro(patch: Partial<ProState>): Promise<ProState> {
  const next = { ...(await getPro()), ...patch };
  await chrome.storage?.local.set({ [PRO_KEY]: next });
  return next;
}

export interface VerifyResult {
  ok: boolean;
  error?: string;
}

/** Verify a Gumroad license key. Unlocks Pro on success. */
export async function verifyLicense(key: string): Promise<VerifyResult> {
  const licenseKey = key.trim();
  if (!licenseKey) return { ok: false, error: 'Enter your license key.' };
  try {
    const body = new URLSearchParams({
      product_id: GUMROAD.PRODUCT_ID,
      license_key: licenseKey,
      increment_uses_count: 'false',
    });
    const res = await fetch('https://api.gumroad.com/v2/licenses/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
    const data = await res.json();
    if (!data?.success || !data?.purchase) {
      return { ok: false, error: 'Invalid license key.' };
    }
    const p = data.purchase;
    const active =
      !p.refunded &&
      !p.chargebacked &&
      !p.subscription_cancelled_at &&
      !p.subscription_failed_at;
    if (!active) return { ok: false, error: 'This license is no longer active.' };
    await setPro({ proUnlocked: true, licenseKey });
    return { ok: true };
  } catch {
    return { ok: false, error: 'Could not reach Gumroad. Check your connection.' };
  }
}
