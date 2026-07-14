import type { PetCard, Rarity, Species } from "@/lib/store";

/** Card-generation engine: silly names, personality stats, rarity rolls. */

const ADJECTIVES = [
  "Fluffy", "Chonky", "Zoomy", "Sassy", "Wiggly", "Sneaky", "Bouncy",
  "Snuggle", "Pudgy", "Turbo", "Noodle", "Waffle", "Mochi", "Biscuit",
];

const TITLES = ["Sir", "Lady", "Captain", "Princess", "Baron", "Professor", "DJ"];

const SUFFIXES: Record<Species, string[]> = {
  dog: ["Barks-a-Lot", "Woofer", "Zoomies", "Snoot", "Borker", "Tailwag"],
  cat: ["fur", "whiskers", "Meowington", "Purrbox", "Toebeans", "Loaf"],
  rabbit: ["hops", "Binky", "Cottontail", "Thumper", "Flopears"],
  bird: ["beak", "Chirps", "Featherton", "Tweetster", "Wingding"],
  other: ["paws", "Floof", "Nibbles", "Scooter", "Wiggles"],
};

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function sillyName(species: Species): string {
  const suffix = pick(SUFFIXES[species]);
  return Math.random() < 0.4
    ? `${pick(TITLES)} ${suffix}`
    : /^[a-z]/.test(suffix)
      ? `${pick(ADJECTIVES)}${suffix}`
      : `${pick(ADJECTIVES)} ${suffix}`;
}

export function randomStats(): PetCard["stats"] {
  const roll = () => 20 + Math.floor(Math.random() * 81);
  return { chonkiness: roll(), friendliness: roll(), energy: roll() };
}

/**
 * Local rarity roll (offline/demo mode). When Supabase is connected the
 * server's compute_rarity() uses real community breed frequency instead.
 */
export function rollRarity(collectionSize = Infinity): Rarity {
  const roll = Math.random() * 100;
  // top tiers only hatch for seasoned collectors (10+ pets)
  if (roll < 7 && collectionSize < 10) return "epic";
  if (roll < 2) return "mythic";
  if (roll < 7) return "legendary";
  if (roll < 17) return "epic";
  if (roll < 35) return "rare";
  if (roll < 60) return "uncommon";
  return "common";
}

// ---------------------------------------------------------------------------
// Scoring & battle attributes (derived deterministically from stats + rarity)
// ---------------------------------------------------------------------------

const RARITY_ORDER: Rarity[] = ["common", "uncommon", "rare", "epic", "legendary", "mythic"];

const XP_BONUS: Record<Rarity, number> = {
  common: 0, uncommon: 30, rare: 60, epic: 100, legendary: 160, mythic: 250,
};

/** XP awarded for a brand-new discovery. */
export function xpForDiscovery(rarity: Rarity): number {
  return 100 + XP_BONUS[rarity];
}

/** XP awarded for revisiting a pet already in the collection. */
export const XP_FOR_REVISIT = 30;

/** Trainer level curve: 250 XP per level. */
export function levelFromXp(xp: number): { level: number; intoLevel: number; perLevel: number } {
  const perLevel = 250;
  return { level: Math.floor(xp / perLevel) + 1, intoLevel: xp % perLevel, perLevel };
}

/** Battle cost/power à la the trading-card reference. Ascension (starRank) permanently adds Power. */
export function battleStats(card: Pick<PetCard, "rarity" | "stats" | "starRank">): { cost: number; power: number } {
  const rarityIdx = RARITY_ORDER.indexOf(card.rarity);
  const avg = (card.stats.chonkiness + card.stats.friendliness + card.stats.energy) / 3;
  const starRank = card.starRank ?? 0;
  return {
    cost: rarityIdx + 1, // 1 (common) … 6 (mythic)
    power: 1 + Math.round((avg / 100) * 4) + Math.floor(rarityIdx * 0.8) + starRank * 2, // grows with rarity, stats, AND ascension
  };
}

/** Personality tribes derived from the randomized stats. */
export function tribesFor(stats: PetCard["stats"]): string[] {
  const tribes: string[] = [];
  if (stats.chonkiness >= 70) tribes.push("Chonky");
  if (stats.energy >= 70) tribes.push("Zoomy");
  if (stats.friendliness >= 70) tribes.push("Cuddly");
  if (stats.energy < 40) tribes.push("Sleepy");
  return tribes.length ? tribes : ["Mysterious"];
}

const ABILITIES: Record<string, { keyword: string; text: string }> = {
  Chonky: { keyword: "Guard", text: "When played: +1 Power for each ally sharing a tribe." },
  Zoomy: { keyword: "Dash", text: "Flees the lane if a stronger enemy arrives." },
  Cuddly: { keyword: "Charm", text: "Reveals a find: your other pets here get +1 Power." },
  Sleepy: { keyword: "Nap", text: "Skips a turn, then wakes with double Power." },
  Mysterious: { keyword: "Copycat", text: "Copies the highest Power among your other pets here." },
};

/** Keyword ability chosen from the pet's first tribe. */
export function abilityFor(stats: PetCard["stats"]): { keyword: string; text: string } {
  return ABILITIES[tribesFor(stats)[0]];
}
