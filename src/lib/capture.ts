import { useAppStore, type PetCard, type Species } from "@/lib/store";
import { cosineSimilarity, segmentPet, embedSignature } from "@/lib/vision";
import { rollRarity, sillyName, randomStats, xpForDiscovery, XP_FOR_REVISIT } from "@/lib/cardFactory";
import { COINS_NEW_DISCOVERY, COINS_REVISIT, TREATS_NEW_DISCOVERY, todayKey } from "@/lib/economy";

/**
 * Re-identification threshold for DINOv2 cutout embeddings. Benchmarks:
 * same dog across views scores 0.79–0.94, different species near 0 —
 * so 0.80 recognizes revisits reliably with a wide safety margin.
 */
const SIMILARITY_THRESHOLD = 0.8;
const MAX_SIGNATURES_PER_CARD = 3;
/** A new view this dissimilar from stored ones is worth remembering. */
const NEW_VIEW_MAX_SIM = 0.93;

/**
 * Minimum real-world time between REWARDED revisits of the same pet.
 * Recognition and dedupe still happen instantly on every scan (you can
 * never mint a duplicate card) — this only gates the level-up/candy/XP
 * payout, so rapid rescanning of one pet can't farm free progress.
 */
const REVISIT_COOLDOWN_MS = 4 * 60 * 60 * 1000; // 4 hours

/** Patch the reveal overlay's resolution ONLY if it's still showing this exact capture. */
function reportResolution(cardId: string, resolution: NonNullable<import("@/lib/store").CaptureFlow["resolution"]>) {
  const store = useAppStore.getState();
  if (store.captureFlow?.card?.id === cardId) store.patchCaptureFlow({ resolution });
}

/** Mint the instant (unhatched) card shown right after the treat lands. No
 *  rewards are granted yet — those are decided once the real outcome
 *  (new vs. revisit vs. too-soon-revisit) is known, in finalizeCapture(). */
export function startCapture(photoUrl: string, species: Species, breed: string | null): PetCard {
  const store = useAppStore.getState();
  const card: PetCard = {
    id: crypto.randomUUID(),
    serialNumber: store.collection.reduce((m, c) => Math.max(m, c.serialNumber), 0) + 1,
    customName: sillyName(species),
    species,
    breed,
    rarity: rollRarity(store.collection.length), // hidden until hatch; may be overridden by server sync
    imageUrl: photoUrl,
    lat: store.position?.lat ?? null,
    lng: store.position?.lng ?? null,
    venueName: store.checkedInVenue?.name ?? null,
    level: 1,
    candy: 1,
    stats: randomStats(),
    hatched: false,
    backdrop: Math.floor(Math.random() * 4),
    createdAt: new Date().toISOString(),
  };
  store.addCard(card);
  return card;
}

/**
 * Background hatching: cutout → signature → dedupe → reward → reveal.
 *  - New pet: full discovery reward (rarity-scaled XP, coins, treats).
 *  - Revisit, cooldown elapsed: smaller revisit reward, level +1, +3 candy.
 *  - Revisit, too soon: recognized (no duplicate card) but NO reward —
 *    this is what stops "just rescan your own dog" from farming XP/candy.
 */
export async function finalizeCapture(card: PetCard): Promise<void> {
  const store = useAppStore.getState();
  try {
    const cutoutUrl = await segmentPet(card.imageUrl);
    const signature = await embedSignature(cutoutUrl ?? card.imageUrl);
    await resolveMatchAndReward(card, signature, cutoutUrl);
  } catch (err) {
    console.warn("[petdexter] hatch failed, card keeps its photo:", err);
    store.updateCard(card.id, { hatched: true });
    reportResolution(card.id, { kind: "error" });
  }
}

/**
 * Dedupe + cooldown + reward logic, decoupled from the on-device AI calls
 * above so it can run (and be tested) with an already-computed signature.
 */
export async function resolveMatchAndReward(
  card: PetCard,
  signature: number[],
  cutoutUrl: string | null
): Promise<void> {
  const store = useAppStore.getState();
  const patch = (resolution: NonNullable<import("@/lib/store").CaptureFlow["resolution"]>) =>
    reportResolution(card.id, resolution);

  // Species-gated dedupe against every stored viewing angle of every other card
  let bestId: string | null = null;
  let bestSim = 0;
  for (const c of store.collection) {
    if (c.id === card.id || c.species !== card.species) continue;
    for (const view of [c.signature, ...(c.signatures ?? [])]) {
      if (!view || view.length !== signature.length) continue;
      const sim = cosineSimilarity(signature, view);
      if (sim > bestSim) { bestSim = sim; bestId = c.id; }
    }
  }

  if (bestId && bestSim >= SIMILARITY_THRESHOLD) {
    const existing = store.collection.find((c) => c.id === bestId)!;
    store.removeCard(card.id); // the egg was just this scan's placeholder — the real pet already exists

    const lastRevisit = new Date(existing.lastRevisitAt ?? existing.createdAt).getTime();
    const elapsed = Date.now() - lastRevisit;

    if (elapsed < REVISIT_COOLDOWN_MS) {
      // Recognized, but rewarding it again this soon would let a player
      // farm infinite level-ups/candy by just rescanning the same photo.
      store.registerCatch(todayKey());
      patch({ kind: "revisit_cooldown", cooldownRemainingMs: REVISIT_COOLDOWN_MS - elapsed });
      return;
    }

    const views = existing.signatures ?? [];
    const level = existing.level + 1;
    const candy = existing.candy + 3;
    store.updateCard(bestId, {
      level, candy,
      lastRevisitAt: new Date().toISOString(),
      signatures: bestSim < NEW_VIEW_MAX_SIM && views.length < MAX_SIGNATURES_PER_CARD
        ? [...views, signature] : views,
    });
    store.addXp(XP_FOR_REVISIT);
    store.addCoins(COINS_REVISIT);
    store.registerCatch(todayKey());
    patch({ kind: "revisit", xp: XP_FOR_REVISIT, coins: COINS_REVISIT, level });
    return;
  }

  // Genuinely new — hatch it for real
  store.updateCard(card.id, {
    cutoutUrl, signature, hatched: true, lastRevisitAt: new Date().toISOString(),
  });
  let finalRarity = card.rarity;

  // Sync to Supabase when signed in (server re-checks uniqueness across devices)
  try {
    const { getSupabase } = await import("@/lib/supabase");
    const supabase = getSupabase();
    const { data: s } = await supabase.auth.getSession();
    const uid = s.session?.user.id;
    if (uid) {
      const blob = await (await fetch(card.imageUrl)).blob();
      const path = `${uid}/${Date.now()}.jpg`;
      const { error: upErr } = await supabase.storage.from("pet-photos").upload(path, blob, { contentType: "image/jpeg" });
      if (!upErr) {
        const url = supabase.storage.from("pet-photos").getPublicUrl(path).data.publicUrl;
        const { data } = await supabase.rpc("capture_pet", {
          p_signature: signature, p_species: card.species, p_breed: card.breed,
          p_custom_name: card.customName, p_image_url: url,
          p_lat: card.lat, p_lng: card.lng,
          p_venue_id: store.checkedInVenue?.id ?? null, p_stats: card.stats,
        });
        if (data?.outcome === "new_discovery") {
          finalRarity = data.rarity;
          store.updateCard(card.id, { id: data.card_id, serialNumber: data.serial_number, rarity: data.rarity });
        } else if (data?.outcome === "revisit") {
          // the server found a cross-device duplicate we didn't have locally yet
          store.removeCard(card.id);
          store.addXp(XP_FOR_REVISIT);
          store.addCoins(COINS_REVISIT);
          store.registerCatch(todayKey());
          patch({ kind: "revisit", xp: XP_FOR_REVISIT, coins: COINS_REVISIT, level: data.level });
          return;
        } else if (data?.outcome === "revisit_cooldown") {
          // recognized on another device, but too soon since its last reward there too
          store.removeCard(card.id);
          store.registerCatch(todayKey());
          patch({ kind: "revisit_cooldown", cooldownRemainingMs: data.cooldown_remaining_ms ?? 0 });
          return;
        }
      }
    }
  } catch {
    // no session / offline — the card still lives locally, that's fine
  }

  const xp = xpForDiscovery(finalRarity);
  store.addXp(xp);
  store.addCoins(COINS_NEW_DISCOVERY);
  store.addTreats(TREATS_NEW_DISCOVERY);
  store.registerCatch(todayKey());
  patch({ kind: "new", xp, coins: COINS_NEW_DISCOVERY, treats: TREATS_NEW_DISCOVERY });
}
