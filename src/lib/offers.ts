/**
 * SalaryLens Pro — saved offers (for side-by-side Offer Compare).
 * Stored in chrome.storage.local; no server.
 */
import { CtcInput } from './ctc';

const OFFERS_KEY = 'salarylens:offers';
export const MAX_OFFERS = 4;

export interface Offer {
  id: string;
  name: string; // e.g. company / role label
  ctcText: string;
  cfg: CtcInput;
  createdAt: number;
}

function uid(): string {
  return 'o_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

export async function getOffers(): Promise<Offer[]> {
  try {
    const r = await chrome.storage?.local.get(OFFERS_KEY);
    const list = r?.[OFFERS_KEY] as Offer[] | undefined;
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

async function writeOffers(list: Offer[]): Promise<Offer[]> {
  await chrome.storage?.local.set({ [OFFERS_KEY]: list });
  return list;
}

export async function addOffer(input: Omit<Offer, 'id' | 'createdAt'>): Promise<Offer[]> {
  const list = await getOffers();
  if (list.length >= MAX_OFFERS) return list;
  const offer: Offer = { ...input, id: uid(), createdAt: Date.now() };
  return writeOffers([...list, offer]);
}

export async function removeOffer(id: string): Promise<Offer[]> {
  const list = (await getOffers()).filter((o) => o.id !== id);
  return writeOffers(list);
}

export async function renameOffer(id: string, name: string): Promise<Offer[]> {
  const list = (await getOffers()).map((o) => (o.id === id ? { ...o, name } : o));
  return writeOffers(list);
}
