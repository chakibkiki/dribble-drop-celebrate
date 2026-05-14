import { GIFTS, QUOTAS, type StoreType } from "./quotaConfig";

export type RemainingStock = Record<string, number>;

export function computeRemainingStock(
  storeType: StoreType,
  distributedByKey: Record<string, number>
): RemainingStock {
  const initial = QUOTAS[storeType].stocks;
  const remaining: RemainingStock = {};
  for (const key of Object.keys(initial)) {
    remaining[key] = Math.max(0, initial[key] - (distributedByKey[key] ?? 0));
  }
  return remaining;
}

/**
 * Choisit un cadeau via tirage pondéré.
 * - P3 : probabilité progressive (0 avant le seuil, croît jusqu'à 1 en fin de journée)
 * - P1 et P2 : pondéré par stock restant
 * Retourne null si aucun stock disponible.
 */
export function pickGift(
  storeType: StoreType,
  attemptNumber: number, // 1-based
  remaining: RemainingStock
): { key: string; label: string; tier: 1 | 2 | 3 } | null {
  const cfg = QUOTAS[storeType];

  const tierStock = (t: 1 | 2 | 3) =>
    Object.values(GIFTS)
      .filter((g) => g.tier === t)
      .reduce((s, g) => s + (remaining[g.key] ?? 0), 0);

  const stockP1 = tierStock(1);
  const stockP2 = tierStock(2);
  const stockP3 = tierStock(3);

  // Multiplicateur P3 progressif : 0 avant seuil, monte vers 1 en fin de journée
  let p3Mult = 0;
  if (attemptNumber >= cfg.p3Threshold && stockP3 > 0) {
    const span = Math.max(1, cfg.total - cfg.p3Threshold);
    p3Mult = Math.min(1, (attemptNumber - cfg.p3Threshold + 1) / span);
  }

  const weights: { tier: 1 | 2 | 3; w: number }[] = [
    { tier: 1, w: stockP1 },
    { tier: 2, w: stockP2 },
    { tier: 3, w: stockP3 * p3Mult },
  ].filter((x) => x.w > 0);

  if (weights.length === 0) {
    // Fallback : tout est nul mais peut-être P3 sans seuil atteint -> autoriser P3
    if (stockP3 > 0) weights.push({ tier: 3, w: stockP3 });
    else return null;
  }

  const total = weights.reduce((s, x) => s + x.w, 0);
  let r = Math.random() * total;
  let chosenTier: 1 | 2 | 3 = weights[0].tier;
  for (const x of weights) {
    r -= x.w;
    if (r <= 0) {
      chosenTier = x.tier;
      break;
    }
  }

  // Tirage du cadeau dans le palier proportionnel au stock
  const tierGifts = Object.values(GIFTS).filter((g) => g.tier === chosenTier && (remaining[g.key] ?? 0) > 0);
  if (tierGifts.length === 0) return null;
  const tg = tierGifts.reduce((s, g) => s + remaining[g.key], 0);
  let r2 = Math.random() * tg;
  let chosen = tierGifts[0];
  for (const g of tierGifts) {
    r2 -= remaining[g.key];
    if (r2 <= 0) {
      chosen = g;
      break;
    }
  }
  return { key: chosen.key, label: chosen.label, tier: chosen.tier };
}

/**
 * Mappe un palier au slot Plinko (0..4).
 * Slots : 0=P2 ext gauche, 1=P1 gauche, 2=P3 centre (GOAL), 3=P1 droite, 4=P2 ext droite
 */
export function tierToSlot(tier: 1 | 2 | 3): number {
  if (tier === 3) return 2;
  if (tier === 1) return Math.random() < 0.5 ? 1 : 3;
  return Math.random() < 0.5 ? 0 : 4;
}

export const SLOT_LABELS = ["Palier 02", "Palier 01", "GOAL!", "Palier 01", "Palier 02"];