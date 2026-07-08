import { useAppStore, type PetCard } from "@/lib/store";
import { SIGNATURE_DIM } from "@/lib/vision";

export interface ImportResult {
  imported: number;
  merged: number;
  skipped: number;
}

/**
 * One-time migration of guest-mode (device-only) catches into the signed-in
 * account. Cards with a current-format signature go through the capture_pet
 * RPC (so server-side dedupe applies); older cards are inserted directly.
 * Local level/candy progress is preserved.
 */
export async function importGuestCatches(
  onProgress?: (done: number, total: number) => void
): Promise<ImportResult> {
  const { getSupabase } = await import("@/lib/supabase");
  const supabase = getSupabase();
  const store = useAppStore.getState();

  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user.id;
  if (!userId) throw new Error("Not signed in");

  const result: ImportResult = { imported: 0, merged: 0, skipped: 0 };
  const cards = [...store.collection].reverse(); // oldest first, keeps order

  for (let i = 0; i < cards.length; i++) {
    const card = cards[i];
    try {
      const imageUrl = await ensureUploaded(supabase, userId, card, i);
      const hasSignature = card.signature?.length === SIGNATURE_DIM;

      if (hasSignature) {
        const { data, error } = await supabase.rpc("capture_pet", {
          p_signature: card.signature,
          p_species: card.species,
          p_breed: card.breed,
          p_custom_name: card.customName,
          p_image_url: imageUrl,
          p_lat: card.lat,
          p_lng: card.lng,
          p_venue_id: null,
          p_stats: card.stats,
        });
        if (error) throw error;
        if (data.outcome === "revisit") {
          result.merged++;
        } else {
          result.imported++;
          if (card.level > 1 || card.candy > 1) {
            await supabase
              .from("pet_cards")
              .update({ level: card.level, candy: card.candy })
              .eq("id", data.card_id);
          }
          // adopt the server identity so future revisits match this card
          store.updateCard(card.id, { id: data.card_id, serialNumber: data.serial_number });
        }
      } else {
        // legacy card (old signature format) — direct insert, no dedupe possible
        const { data, error } = await supabase
          .from("pet_cards")
          .insert({
            owner_id: userId,
            custom_name: card.customName,
            species: card.species,
            breed: card.breed,
            rarity: card.rarity,
            image_url: imageUrl,
            lat: card.lat,
            lng: card.lng,
            level: card.level,
            candy: card.candy,
            stats: card.stats,
          })
          .select("id, serial_number")
          .single();
        if (error) throw error;
        result.imported++;
        store.updateCard(card.id, { id: data.id, serialNumber: data.serial_number });
      }
    } catch (err) {
      console.warn("[petcatch] guest import skipped a card:", err);
      result.skipped++;
    }
    onProgress?.(i + 1, cards.length);
  }

  return result;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
async function ensureUploaded(
  supabase: any,
  userId: string,
  card: PetCard,
  index: number
): Promise<string> {
  if (!card.imageUrl.startsWith("data:")) return card.imageUrl; // already hosted
  const blob = await (await fetch(card.imageUrl)).blob();
  const path = `${userId}/import_${Date.now()}_${index}.jpg`;
  const { error } = await supabase.storage
    .from("pet-photos")
    .upload(path, blob, { contentType: blob.type || "image/jpeg" });
  if (error) throw error;
  return supabase.storage.from("pet-photos").getPublicUrl(path).data.publicUrl;
}
