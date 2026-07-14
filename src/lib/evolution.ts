import { useAppStore, type PetCard } from "@/lib/store";

/**
 * Ascension — the answer to "what happens once a pet is fully boosted?"
 * Feeding raises stats up to the current rank's cap; once every stat is
 * capped, the pet can Evolve using its OWN candy (earned from revisits and
 * from feeding past the cap — see food.ts overflow handling), which raises
 * the cap for the next rank and grants a permanent Power bonus. This gives
 * boosting a repeating, always-has-a-next-step loop instead of a dead end
 * at 100, mirroring the evolve/ascend loop in Pokémon-style collectors.
 */
export const MAX_STAR_RANK = 3;

/** Stat ceiling at each rank, index 0..MAX_STAR_RANK. */
const CAP_PER_RANK = [100, 115, 130, 145];

/** Candy cost to evolve FROM this rank to the next. */
const EVOLVE_COST_PER_RANK = [15, 30, 45];

export function statCap(starRank = 0): number {
  return CAP_PER_RANK[Math.min(Math.max(starRank, 0), MAX_STAR_RANK)];
}

/** Candy cost to evolve, or null if already at max rank. */
export function evolveCost(starRank = 0): number | null {
  return starRank < MAX_STAR_RANK ? EVOLVE_COST_PER_RANK[starRank] : null;
}

/** All three stats must be at the current rank's cap to evolve. */
export function isEvolutionReady(card: Pick<PetCard, "stats" | "starRank">): boolean {
  const cap = statCap(card.starRank ?? 0);
  return card.stats.chonkiness >= cap && card.stats.friendliness >= cap && card.stats.energy >= cap;
}

export interface EvolveResult {
  newRank: number;
  cost: number;
}

/** Evolve a ready, affordable card. Returns null if not eligible. */
export function evolveCard(cardId: string): EvolveResult | null {
  const store = useAppStore.getState();
  const card = store.collection.find((c) => c.id === cardId);
  if (!card) return null;
  const rank = card.starRank ?? 0;
  const cost = evolveCost(rank);
  if (cost === null) return null; // already fully ascended
  if (!isEvolutionReady(card)) return null;
  if (card.candy < cost) return null;

  store.updateCard(cardId, { starRank: rank + 1, candy: card.candy - cost });
  return { newRank: rank + 1, cost };
}
