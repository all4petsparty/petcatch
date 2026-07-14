"use client";

import { useState } from "react";
import { useAppStore } from "@/lib/store";
import {
  FOOD_CATALOG, TREAT_COST, canClaimFoodAdToday, claimFoodAdToday,
  grantFood, buyFoodWithTreats,
} from "@/lib/food";
import { SPECIES_EMOJI } from "@/components/icons";
import Portal from "@/components/Portal";
import RewardedAd from "@/components/RewardedAd";

/**
 * Boost Store — the brand-food shop. Each item is watchable via a
 * sponsor-branded rewarded video (1/day/item, free) or purchasable with
 * treats. This is the niche-advertising surface: what you stock up on
 * signals whether you're a dog person, a cat person, a bird person, etc.
 */
export default function BoostStore({ onClose }: { onClose: () => void }) {
  const foodInventory = useAppStore((s) => s.foodInventory);
  const treats = useAppStore((s) => s.treats);
  const foodAdClaims = useAppStore((s) => s.foodAdClaims);
  void foodAdClaims; // subscribe so "watched today" updates after claiming

  const [adFor, setAdFor] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const adItem = adFor ? FOOD_CATALOG.find((f) => f.id === adFor) : null;

  return (
    <Portal>
      <div className="fixed inset-0 z-[78] flex items-end justify-center bg-ink/50 backdrop-blur-sm" onClick={onClose}>
        <div
          className="animate-pop-in max-h-[85dvh] w-full max-w-lg overflow-y-auto rounded-t-card bg-white p-5 pb-10 shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-ink/15" />
          <h2 className="mb-1 text-2xl font-extrabold">🏪 Boost Store</h2>
          <p className="mb-4 text-sm text-ink/50">
            Feed the right brand to the right pet for the biggest boost — generic kibble works on
            anyone, but everyone loves their own food best!
          </p>

          <div className="flex flex-col gap-3">
            {FOOD_CATALOG.map((item) => {
              const owned = foodInventory[item.id] ?? 0;
              const canAd = canClaimFoodAdToday(item.id);
              const cost = TREAT_COST[item.tier];
              const canBuy = treats >= cost;
              return (
                <div key={item.id} className="rounded-2xl bg-cream p-4">
                  <div className="flex items-center gap-3">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-3xl shadow-sm">
                      {item.emoji}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-extrabold leading-tight">{item.name}</p>
                      <p className="text-[11px] font-bold text-ink/40">
                        {item.brand} ·{" "}
                        {item.species === "all" ? "Works on all pets" : `${SPECIES_EMOJI[item.species]} Best for ${item.species}s`}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-xs font-extrabold text-ink/60">
                      ×{owned}
                    </span>
                  </div>
                  <p className="mt-2 text-xs italic text-ink/50">&ldquo;{item.tagline}&rdquo;</p>
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      disabled={!canAd}
                      onClick={() => setAdFor(item.id)}
                      className="tappable flex-1 rounded-full bg-tangerine px-3 py-2 text-xs font-extrabold text-white shadow-sm disabled:opacity-40"
                    >
                      🎬 {canAd ? "Watch ad · +1" : "Watched today"}
                    </button>
                    <button
                      type="button"
                      disabled={!canBuy}
                      onClick={() => {
                        if (buyFoodWithTreats(item.id)) setNote(`+1 ${item.name}! 🎉`);
                      }}
                      className="tappable flex-1 rounded-full bg-sunny px-3 py-2 text-xs font-extrabold text-ink shadow-sm disabled:opacity-40"
                    >
                      Buy · {cost}🍪
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {note && (
            <p className="animate-pop-in mt-4 rounded-2xl bg-sunny/40 px-4 py-3 text-center text-sm font-bold">{note}</p>
          )}

          <button
            type="button"
            onClick={onClose}
            className="tappable mx-auto mt-5 block rounded-full bg-cream px-8 py-3 font-extrabold text-ink shadow-sm"
          >
            Close
          </button>
        </div>
      </div>

      {adItem && (
        <RewardedAd
          rewardLabel={`1 ${adItem.name}`}
          sponsor={{ brand: adItem.brand, tagline: adItem.tagline, emoji: adItem.emoji }}
          onComplete={() => {
            grantFood(adItem.id, 1);
            claimFoodAdToday(adItem.id);
            setNote(`+1 ${adItem.name}! 🎉`);
          }}
          onClose={() => setAdFor(null)}
        />
      )}
    </Portal>
  );
}
