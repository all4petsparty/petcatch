"use client";

import { useAppStore, type Rarity } from "@/lib/store";
import { SPECIES_EMOJI } from "@/components/icons";

const RARITY_DOT: Record<Rarity, string> = {
  common: "bg-ink/25",
  uncommon: "bg-grass",
  rare: "bg-sky-deep",
  epic: "bg-bubblegum",
  legendary: "bg-tangerine",
  mythic: "bg-sunny-deep",
};

/**
 * The PetDex — a sticker-book journal: die-cut pet cutouts on dotted paper
 * with handwritten name labels (falls back to photo cards for old catches).
 */
export default function CollectionView() {
  const collection = useAppStore((s) => s.collection);

  return (
    <div className="flex flex-col gap-4 p-4">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-ink">My PetDex 📖</h1>
          <p className="text-ink/60">
            {collection.length} unique {collection.length === 1 ? "friend" : "friends"} discovered
          </p>
        </div>
      </header>

      {collection.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-card bg-white p-10 text-center shadow-md">
          <span className="text-6xl">🐾</span>
          <p className="text-xl font-bold">No pets caught yet!</p>
          <p className="text-ink/60">
            Tap the big orange paw below and scan your first furry friend.
          </p>
        </div>
      ) : (
        <div className="dotted-paper grid grid-cols-2 gap-x-3 gap-y-6 rounded-card p-5 shadow-md">
          {collection.map((card, i) => (
            <button
              key={card.id}
              type="button"
              className="tappable flex flex-col items-center"
              style={{ transform: `rotate(${i % 2 === 0 ? -1.5 : 1.5}deg)` }}
            >
              <span className={`relative flex h-36 w-full items-end justify-center overflow-hidden ${
                card.hatched !== false && card.cutoutUrl ? `rounded-2xl hatch-bg-${card.backdrop ?? 0} shadow-md` : ""
              }`}>
                {card.hatched === false ? (
                  <span className="flex h-full w-full animate-pulse flex-col items-center justify-center gap-1 rounded-2xl bg-sunny/30">
                    <span className="animate-bob text-5xl">🥚</span>
                    <span className="text-[10px] font-extrabold text-ink/50">Hatching…</span>
                  </span>
                ) : (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={card.cutoutUrl ?? card.imageUrl}
                    alt={card.customName}
                    className={
                      card.cutoutUrl
                        ? "sticker max-h-32 max-w-full object-contain"
                        : "h-36 w-full rounded-2xl border-4 border-white object-cover shadow-md"
                    }
                  />
                )}
                <span className="absolute -left-1 -top-1 text-lg">{SPECIES_EMOJI[card.species]}</span>
                {card.level > 1 && (
                  <span className="absolute -right-1 -top-1 rounded-full bg-sky px-2 py-0.5 text-[10px] font-extrabold text-white shadow">
                    Lv.{card.level}
                  </span>
                )}
              </span>
              <span className="font-script mt-1.5 flex items-center gap-1.5 text-2xl font-bold leading-none text-ink">
                <span className={`inline-block h-2.5 w-2.5 rounded-full ${RARITY_DOT[card.rarity]}`} />
                {card.customName}
              </span>
              <span className="text-[10px] font-bold text-ink/35">
                #{String(card.serialNumber).padStart(6, "0")}
                {card.venueName ? ` · 🏷️ ${card.venueName}` : ""}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
