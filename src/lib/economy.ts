import { useAppStore } from "@/lib/store";

/**
 * Game economy (PetDexter V2). Simplified per the wireframe spec §27: a
 * single Discovery Snack resource gates unknown-pet captures, and a single
 * Paw Points score tracks overall progression. No timers, no overlapping
 * coins/treats/candy.
 */

/** Granted once, the first time a user finishes onboarding. */
export const STARTER_SNACKS = 3;

/** Free top-up granted on a rolling window so a player is never hard-blocked. */
export const PERIODIC_FREE_SNACKS = 2;
export const PERIODIC_GRANT_MS = 12 * 60 * 60 * 1000;

export function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Top up Discovery Snacks on a rolling 12h window, checked on app open.
 * Deliberately non-accumulating: skipping a period (app closed for days)
 * still only grants PERIODIC_FREE_SNACKS once, and the clock resets to
 * "now" rather than backfilling every missed 12h window.
 */
export function grantPeriodicSnackIfNeeded() {
  const store = useAppStore.getState();
  const now = Date.now();
  if (store.lastSnackGrantAt && now - store.lastSnackGrantAt < PERIODIC_GRANT_MS) return;
  store.setSnacks(store.snacks + PERIODIC_FREE_SNACKS);
  store.setLastSnackGrantAt(now);
}

/** Milliseconds until the next periodic top-up (0 if one is due now). */
export function msUntilNextSnackGrant(): number {
  const store = useAppStore.getState();
  if (!store.lastSnackGrantAt) return 0;
  return Math.max(0, PERIODIC_GRANT_MS - (Date.now() - store.lastSnackGrantAt));
}

/** One-time starter grant so the capture flow is usable immediately after onboarding. */
export function grantStarterSnacksIfNeeded() {
  const store = useAppStore.getState();
  if (store.starterSnacksGranted) return;
  store.setSnacks(store.snacks + STARTER_SNACKS);
  store.setStarterSnacksGranted(true);
  store.setLastSnackGrantAt(Date.now()); // starts the 12h top-up clock
}

/** Spend one Discovery Snack on an unknown-pet capture. Returns false when empty. */
export function spendSnack(): boolean {
  const store = useAppStore.getState();
  if (store.snacks <= 0) return false;
  store.setSnacks(store.snacks - 1);
  return true;
}

/** Refund a Discovery Snack — a thrown treat that didn't land a capture (no pet recognized, etc.) shouldn't cost the player. */
export function refundSnack() {
  const store = useAppStore.getState();
  store.setSnacks(store.snacks + 1);
}

/** Grant a bonus snack (rewarded ad / achievement / brand QR — ads are unlimited, watch as many as you like). */
export function grantSnacks(n: number) {
  const store = useAppStore.getState();
  store.setSnacks(store.snacks + n);
}

// ---------------------------------------------------------------------------
// Achievements — flat encounter-count milestones for now (Phase 0 stub).
// Full category rebuild (Discovery/Memory/Connection/Relationship/Place/
// Event/Adoption/Community/Group, per spec §28) lands in Phase 2 once
// encounters, connections and relationships exist as real objects.
// ---------------------------------------------------------------------------

export interface Achievement {
  id: string;
  title: string;
  blurb: string;
  goal: number;
  reward: { pawPoints?: number; snacks?: number };
  rewardLabel: string;
}

export const ACHIEVEMENTS: Achievement[] = [
  { id: "first-hello", title: "First Hello!", blurb: "Meet your very first pet. The journal begins.", goal: 1, reward: { pawPoints: 50 }, rewardLabel: "50 Paw Points" },
  { id: "curious-explorer", title: "Curious Explorer", blurb: "Meet 5 pets. They are already plotting.", goal: 5, reward: { pawPoints: 75 }, rewardLabel: "75 Paw Points" },
  { id: "regular-visitor", title: "Regular Visitor", blurb: "Meet 10 pets. You are officially a regular.", goal: 10, reward: { snacks: 3 }, rewardLabel: "3 Discovery Snacks" },
  { id: "neighborhood-wanderer", title: "Neighborhood Wanderer", blurb: "Meet 25 pets. The block knows your name.", goal: 25, reward: { pawPoints: 150 }, rewardLabel: "150 Paw Points" },
  { id: "community-fixture", title: "Community Fixture", blurb: "Meet 50 pets. Good luck remembering them all.", goal: 50, reward: { pawPoints: 300 }, rewardLabel: "300 Paw Points" },
];

/** Pets met out in the world — excludes My Pets, which the user already owns. */
export function metCount(): number {
  return useAppStore.getState().collection.filter((c) => !c.owned).length;
}

/** Claim a reached achievement; applies rewards once. */
export function claimAchievement(a: Achievement): boolean {
  const store = useAppStore.getState();
  if (store.claimedAchievements.includes(a.id)) return false;
  if (metCount() < a.goal) return false;
  store.claimAchievement(a.id);
  if (a.reward.pawPoints) store.addPawPoints(a.reward.pawPoints);
  if (a.reward.snacks) grantSnacks(a.reward.snacks);
  return true;
}

/** The pet this user has met the most times (for the Field Journal). */
export function mostFamiliarPet(): { name: string; encounterCount: number } | null {
  const met = useAppStore.getState().collection.filter((c) => !c.owned);
  if (!met.length) return null;
  const best = met.reduce((a, b) => (b.encounters.length > a.encounters.length ? b : a));
  return { name: best.customName, encounterCount: best.encounters.length };
}
