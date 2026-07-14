import { useAppStore, type Species, type PetCard } from "@/lib/store";
import { todayKey } from "@/lib/economy";
import { statCap } from "@/lib/evolution";

/**
 * Brand food catalog (Phase 1 of the boost economy). Feeding the right
 * brand to the right species gives the full boost; a generic item works
 * on anyone at half strength; the wrong species barely cares. This is what
 * makes food collection matter — and what lets sponsors target dog people
 * vs. cat people vs. bird people with their own branded rewarded videos.
 */
export interface FoodItem {
  id: string;
  brand: string;
  name: string;
  species: Species | "all";
  emoji: string;
  tier: "basic" | "premium";
  /** total stat points granted on a full-match feed, before distribution */
  boost: number;
  /** how the boost splits across [chonkiness, friendliness, energy] */
  weights: [number, number, number];
  tagline: string;
}

export const FOOD_CATALOG: FoodItem[] = [
  {
    id: "basic-kibble", brand: "PetDexter", name: "Basic Kibble", species: "all",
    emoji: "🥣", tier: "basic", boost: 6, weights: [0.34, 0.33, 0.33],
    tagline: "A balanced bite for any critter — works okay on everyone.",
  },
  {
    id: "powerpets-dog", brand: "PowerPets", name: "PowerPets Dog Formula", species: "dog",
    emoji: "🦴", tier: "premium", boost: 18, weights: [0.6, 0.15, 0.25],
    tagline: "Vet-formulated protein blend for dogs on the go.",
  },
  {
    id: "powerpets-cat", brand: "PowerPets", name: "PowerPets Cat Formula", species: "cat",
    emoji: "🐟", tier: "premium", boost: 18, weights: [0.15, 0.35, 0.5],
    tagline: "Grain-free salmon recipe cats can't resist.",
  },
  {
    id: "hophop-rabbit", brand: "HopHop", name: "HopHop Rabbit Blend", species: "rabbit",
    emoji: "🥕", tier: "premium", boost: 18, weights: [0.2, 0.6, 0.2],
    tagline: "Timothy hay + veggies for happy hoppers.",
  },
  {
    id: "wingfuel-bird", brand: "WingFuel", name: "WingFuel Seed Mix", species: "bird",
    emoji: "🌻", tier: "premium", boost: 18, weights: [0.15, 0.25, 0.6],
    tagline: "Sunflower-rich seed mix for feathered flyers.",
  },
];

/** Treat cost at the Boost Store counter. */
export const TREAT_COST: Record<FoodItem["tier"], number> = { basic: 8, premium: 20 };

export type MatchType = "match" | "generic" | "mismatch";
const MULTIPLIER: Record<MatchType, number> = { match: 1, generic: 0.5, mismatch: 0.2 };

export function matchTypeFor(item: FoodItem, species: Species): MatchType {
  if (item.species === "all") return "generic";
  return item.species === species ? "match" : "mismatch";
}

export interface FeedResult {
  item: FoodItem;
  matchType: MatchType;
  gains: { chonkiness: number; friendliness: number; energy: number };
  totalGain: number;
  /** stat points that would have overflowed the cap, converted to candy instead */
  overflowCandy: number;
}

/** Flavor text for the feed reaction toast. */
export function reactionText(name: string, r: FeedResult): string {
  const overflow = r.overflowCandy > 0 ? ` (stats maxed — +${r.overflowCandy} 🍬 instead!)` : "";
  if (r.matchType === "match") return `${name} loved the ${r.item.name}! 😻 +${r.totalGain} stats${overflow}`;
  if (r.matchType === "generic") return `${name} munched the ${r.item.name} happily. 🙂 +${r.totalGain} stats${overflow}`;
  return `${name} sniffed the ${r.item.name} and wandered off... 🙄 +${r.totalGain} stats${overflow}`;
}

function distribute(total: number, weights: [number, number, number]) {
  return {
    chonkiness: Math.round(total * weights[0]),
    friendliness: Math.round(total * weights[1]),
    energy: Math.round(total * weights[2]),
  };
}

export function ownedFood(foodId: string): number {
  return useAppStore.getState().foodInventory[foodId] ?? 0;
}

export function grantFood(foodId: string, n = 1) {
  useAppStore.getState().addFood(foodId, n);
}

export function canClaimFoodAdToday(foodId: string): boolean {
  return useAppStore.getState().foodAdClaims[foodId] !== todayKey();
}

export function claimFoodAdToday(foodId: string) {
  useAppStore.getState().setFoodAdClaim(foodId, todayKey());
}

/** Spend treats for one unit of food. Returns false if unaffordable. */
export function buyFoodWithTreats(foodId: string): boolean {
  const item = FOOD_CATALOG.find((f) => f.id === foodId);
  if (!item) return false;
  const store = useAppStore.getState();
  const cost = TREAT_COST[item.tier];
  if (store.treats < cost) return false;
  store.addTreats(-cost);
  store.addFood(foodId, 1);
  return true;
}

/** One-time starter kibble so the feed feature is discoverable immediately. */
export function grantStarterFoodIfNeeded() {
  const store = useAppStore.getState();
  if (store.starterFoodGranted) return;
  store.addFood("basic-kibble", 2);
  store.setStarterFoodGranted(true);
}

/**
 * Feed a food item to a caught pet. Applies the species-matched boost,
 * distributed across stats per the food's flavor, clamped at the pet's
 * current ascension cap (see evolution.ts). Any amount that would have
 * overflowed the cap converts 1:1 into the pet's own candy instead of
 * being wasted — so feeding a maxed-out pet still always pays off, and
 * that candy is exactly what funds its next Evolution.
 */
export function feedPet(cardId: string, foodId: string): FeedResult | null {
  const store = useAppStore.getState();
  const item = FOOD_CATALOG.find((f) => f.id === foodId);
  const card = store.collection.find((c) => c.id === cardId);
  const owned = store.foodInventory[foodId] ?? 0;
  if (!item || !card || owned <= 0) return null;

  const cap = statCap(card.starRank ?? 0);
  const matchType = matchTypeFor(item, card.species);
  const rawGains = distribute(Math.round(item.boost * MULTIPLIER[matchType]), item.weights);
  const stats: PetCard["stats"] = { ...card.stats };
  const gains = { chonkiness: 0, friendliness: 0, energy: 0 };
  let overflowCandy = 0;
  (Object.keys(rawGains) as (keyof typeof rawGains)[]).forEach((k) => {
    const room = Math.max(0, cap - stats[k]);
    const applied = Math.min(room, rawGains[k]);
    gains[k] = applied;
    stats[k] += applied;
    overflowCandy += rawGains[k] - applied;
  });
  const totalGain = gains.chonkiness + gains.friendliness + gains.energy;

  store.addFood(foodId, -1);
  store.updateCard(cardId, {
    stats,
    feedCount: (card.feedCount ?? 0) + 1,
    lastFedBrand: item.brand,
    candy: card.candy + overflowCandy,
  });
  store.addXp(matchType === "match" ? 15 : matchType === "generic" ? 8 : 3);

  return { item, matchType, gains, totalGain, overflowCandy };
}
