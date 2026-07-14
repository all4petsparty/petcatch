"use client";

import { useState } from "react";
import { useAppStore, type Rarity, type Species, type PetCard } from "@/lib/store";
import { SPECIES_EMOJI } from "@/components/icons";
import CardDetail from "@/components/CardDetail";

const RARITY_FRAME: Record<Rarity, string> = {
  common: "from-ink/30 to-ink/10",
  uncommon: "from-grass to-grass-deep",
  rare: "from-sky to-sky-deep",
  epic: "from-bubblegum to-tangerine",
  legendary: "from-tangerine to-tangerine-deep",
  mythic: "from-sunny via-tangerine to-bubblegum",
};

const RARITY_TEXT: Record<Rarity, string> = {
  common: "text-ink/50", uncommon: "text-grass-deep", rare: "text-sky-deep",
  epic: "text-bubblegum", legendary: "text-tangerine-deep", mythic: "text-tangerine-deep",
};

const RARITY_ORDER: Rarity[] = ["common", "uncommon", "rare", "epic", "legendary", "mythic"];

const SPECIES_ORDER: Species[] = ["dog", "cat", "rabbit", "bird", "other"];
const SPECIES_LABEL: Record<Species, string> = {
  dog: "Dogs", cat: "Cats", rabbit: "Rabbits", bird: "Birds", other: "Others",
};
const SPECIES_ACCENT: Record<Species, string> = {
  dog: "from-tangerine to-tangerine-deep",
  cat: "from-sky to-sky-deep",
  rabbit: "from-bubblegum to-tangerine",
  bird: "from-grass to-grass-deep",
  other: "from-sunny to-sunny-deep",
};

function backdropOf(card: PetCard): number {
  return card.backdrop ?? (card.id.charCodeAt(0) + card.id.charCodeAt(3)) % 4;
}

/** Mini collector card used inside a category. */
function MiniCard({ card, index, onOpen }: { card: PetCard; index: number; onOpen: () => void }) {
  const hatching = card.hatched === false;
  const bd = backdropOf(card);
  return (
    <button
      type="button"
      onClick={onOpen}
      className={`tappable w-full rounded-2xl bg-gradient-to-br p-1.5 shadow-lg ${hatching ? "from-sunny to-sunny-deep" : RARITY_FRAME[card.rarity]}`}
      style={{ transform: `rotate(${index % 2 === 0 ? -1.2 : 1.2}deg)` }}
    >
      <span className="block overflow-hidden rounded-xl bg-white">
        <span className={`relative flex h-32 w-full items-end justify-center overflow-hidden ${hatching ? "bg-sunny/25" : `hatch-bg-${bd}`}`}>
          {hatching ? (
            <span className="flex h-full w-full animate-pulse flex-col items-center justify-center gap-1">
              <span className="animate-bob text-5xl">🥚</span>
              <span className="text-[10px] font-extrabold text-ink/50">Hatching…</span>
            </span>
          ) : (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={card.cutoutUrl ?? card.imageUrl}
              alt={card.customName}
              className={card.cutoutUrl ? "sticker max-h-28 max-w-[90%] object-contain" : "h-32 w-full object-cover"}
            />
          )}
          <span className="absolute left-1.5 top-1.5 rounded-full bg-white/85 px-1.5 text-sm shadow">{SPECIES_EMOJI[card.species]}</span>
          {card.level > 1 && (
            <span className="absolute right-1.5 top-1.5 rounded-full bg-sky px-2 py-0.5 text-[10px] font-extrabold text-white shadow">Lv.{card.level}</span>
          )}
          {!!card.starRank && (
            <span className="absolute left-1.5 bottom-1.5 rounded-full bg-ink/70 px-1.5 py-0.5 text-[10px] font-extrabold text-sunny shadow">
              {"⭐".repeat(card.starRank)}
            </span>
          )}
        </span>
        <span className="block px-2 pb-2 pt-1 text-center">
          <span className="font-script block truncate text-2xl font-bold leading-tight text-ink">{card.customName}</span>
          <span className="flex items-center justify-between text-[9px] font-extrabold">
            <span className={`uppercase tracking-wide ${hatching ? "text-ink/40" : RARITY_TEXT[card.rarity]}`}>
              {hatching ? "🥚 hatching" : `★ ${card.rarity}`}
            </span>
            <span className="text-ink/35">#{String(card.serialNumber).padStart(6, "0")}</span>
          </span>
        </span>
      </span>
    </button>
  );
}

/**
 * PetDex — category-first. The overview lists the species you've collected;
 * tapping one opens its card grid; tapping a card opens the full detail view.
 */
export default function CollectionView() {
  const collection = useAppStore((s) => s.collection);
  const [category, setCategory] = useState<Species | null>(null);
  const [detail, setDetail] = useState<PetCard | null>(null);

  // Group + order categories that actually have pets
  const categories = SPECIES_ORDER
    .map((species) => ({ species, cards: collection.filter((c) => c.species === species) }))
    .filter((g) => g.cards.length > 0);

  if (collection.length === 0) {
    return (
      <div className="flex flex-col gap-4 p-4">
        <header>
          <h1 className="text-3xl font-extrabold text-ink">My PetDex 📖</h1>
          <p className="text-ink/60">No pets caught yet</p>
        </header>
        <div className="flex flex-col items-center gap-3 rounded-card bg-white p-10 text-center shadow-md">
          <span className="text-6xl">🐾</span>
          <p className="text-xl font-bold">No pets caught yet!</p>
          <p className="text-ink/60">Throw a treat at your first furry friend below.</p>
        </div>
      </div>
    );
  }

  // ---- Category detail: grid of cards in the chosen species ----
  if (category) {
    const cards = collection.filter((c) => c.species === category);
    return (
      <div className="flex flex-col gap-4 p-4">
        <header className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setCategory(null)}
            className="tappable flex h-10 w-10 items-center justify-center rounded-full bg-white text-xl font-extrabold shadow-md"
            aria-label="Back to categories"
          >
            ‹
          </button>
          <div>
            <h1 className="text-2xl font-extrabold text-ink">
              {SPECIES_EMOJI[category]} {SPECIES_LABEL[category]}
            </h1>
            <p className="text-sm text-ink/60">{cards.length} collected</p>
          </div>
        </header>
        <div className="dotted-paper grid grid-cols-2 gap-x-3 gap-y-5 rounded-card p-4 shadow-md">
          {cards.map((card, i) => (
            <MiniCard key={card.id} card={card} index={i} onOpen={() => setDetail(card)} />
          ))}
        </div>
        {detail && <CardDetail card={detail} onClose={() => setDetail(null)} />}
      </div>
    );
  }

  // ---- Overview: one tile per collected category ----
  return (
    <div className="flex flex-col gap-4 p-4">
      <header>
        <h1 className="text-3xl font-extrabold text-ink">My PetDex 📖</h1>
        <p className="text-ink/60">
          {collection.length} {collection.length === 1 ? "friend" : "friends"} across {categories.length}{" "}
          {categories.length === 1 ? "category" : "categories"}
        </p>
      </header>

      <div className="flex flex-col gap-3">
        {categories.map(({ species, cards }) => {
          const best = cards.reduce((a, b) =>
            RARITY_ORDER.indexOf(b.rarity) > RARITY_ORDER.indexOf(a.rarity) && b.hatched !== false ? b : a
          );
          const previews = cards.slice(0, 3);
          return (
            <button
              key={species}
              type="button"
              onClick={() => setCategory(species)}
              className={`tappable flex items-center gap-4 rounded-card bg-gradient-to-br p-1.5 text-left shadow-lg ${SPECIES_ACCENT[species]}`}
            >
              <span className="flex flex-1 items-center gap-3 rounded-[1.4rem] bg-white p-3">
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-cream text-3xl">
                  {SPECIES_EMOJI[species]}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xl font-extrabold text-ink">{SPECIES_LABEL[species]}</span>
                  <span className="mt-0.5 flex flex-wrap items-center gap-1.5">
                    <span className="text-sm font-bold text-ink/50">
                      {cards.length} {cards.length === 1 ? "card" : "cards"}
                    </span>
                    {best.hatched !== false && (
                      <span className={`rounded-full bg-cream px-2 py-0.5 text-[10px] font-extrabold uppercase ${RARITY_TEXT[best.rarity]}`}>
                        ★ {best.rarity}
                      </span>
                    )}
                  </span>
                </span>
                {/* fanned card previews */}
                <span className="flex shrink-0 -space-x-3">
                  {previews.map((c, i) => (
                    <span
                      key={c.id}
                      className={`flex h-11 w-9 items-center justify-center overflow-hidden rounded-lg border-2 border-white shadow ${c.hatched === false ? "bg-sunny/40" : `hatch-bg-${backdropOf(c)}`}`}
                      style={{ transform: `rotate(${(i - 1) * 8}deg)` }}
                    >
                      {c.hatched === false ? (
                        <span className="text-base">🥚</span>
                      ) : (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={c.cutoutUrl ?? c.imageUrl} alt="" className={c.cutoutUrl ? "sticker max-h-9 object-contain" : "h-full w-full object-cover"} />
                      )}
                    </span>
                  ))}
                </span>
                <span className="shrink-0 text-2xl text-ink/25">›</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
