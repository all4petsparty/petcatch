"use client";

import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useAppStore, type PetCard, type Rarity } from "@/lib/store";
import { SPECIES_EMOJI } from "@/components/icons";
import { battleStats, tribesFor, abilityFor } from "@/lib/cardFactory";
import { FOOD_CATALOG, feedPet, matchTypeFor, reactionText } from "@/lib/food";
import { MAX_STAR_RANK, statCap, evolveCost, isEvolutionReady, evolveCard } from "@/lib/evolution";
import BoostStore from "@/components/BoostStore";

const RARITY_FRAME: Record<Rarity, string> = {
  common: "from-ink/30 to-ink/10",
  uncommon: "from-grass to-grass-deep",
  rare: "from-sky to-sky-deep",
  epic: "from-bubblegum to-tangerine",
  legendary: "from-tangerine to-tangerine-deep",
  mythic: "from-sunny via-tangerine to-bubblegum",
};

const RARITY_CHIP: Record<Rarity, string> = {
  common: "bg-ink/10 text-ink/70",
  uncommon: "bg-grass/25 text-grass-deep",
  rare: "bg-sky/25 text-sky-deep",
  epic: "bg-bubblegum/25 text-bubblegum",
  legendary: "bg-tangerine/25 text-tangerine-deep",
  mythic: "bg-sunny text-tangerine-deep",
};

const MATCH_BADGE: Record<string, string> = {
  match: "bg-grass/20 text-grass-deep",
  generic: "bg-ink/10 text-ink/50",
  mismatch: "bg-tangerine/15 text-tangerine-deep",
};
const MATCH_LABEL: Record<string, string> = {
  match: "Perfect match!",
  generic: "Okay for anyone",
  mismatch: "Not a fan…",
};

const STAT_META = [
  { key: "chonkiness", label: "🍩 Chonkiness", bar: "bg-tangerine" },
  { key: "friendliness", label: "💛 Friendliness", bar: "bg-sunny-deep" },
  { key: "energy", label: "⚡ Energy", bar: "bg-sky-deep" },
] as const;

function Sparkles({ count = 10 }: { count?: number }) {
  const stars = useMemo(
    () =>
      Array.from({ length: count }, () => ({
        left: 6 + Math.random() * 88,
        top: 4 + Math.random() * 90,
        delay: Math.random() * 1.4,
        size: 10 + Math.random() * 14,
        char: Math.random() < 0.5 ? "✦" : "★",
      })),
    [count]
  );
  return (
    <>
      {stars.map((s, i) => (
        <span
          key={i}
          className="pointer-events-none absolute animate-twinkle text-sunny drop-shadow"
          style={{ left: `${s.left}%`, top: `${s.top}%`, fontSize: s.size, animationDelay: `${s.delay}s` }}
        >
          {s.char}
        </span>
      ))}
    </>
  );
}

/** Full-detail collector card — fills the screen, scrolls if the card is tall. */
export default function CardDetail({ card: cardProp, onClose }: { card: PetCard; onClose: () => void }) {
  // Read the live card from the store so feeding updates reflect immediately
  const card = useAppStore((s) => s.collection.find((c) => c.id === cardProp.id)) ?? cardProp;
  const foodInventory = useAppStore((s) => s.foodInventory);
  const [reaction, setReaction] = useState<string | null>(null);
  const [showStore, setShowStore] = useState(false);
  const [evolveNote, setEvolveNote] = useState<string | null>(null);

  const hatching = card.hatched === false;
  const bd = card.backdrop ?? (card.id.charCodeAt(0) + card.id.charCodeAt(3)) % 4;
  const { cost, power } = battleStats(card);
  const tribes = tribesFor(card.stats);
  const ability = abilityFor(card.stats);
  const caught = new Date(card.createdAt).toLocaleDateString(undefined, {
    year: "numeric", month: "short", day: "numeric",
  });

  const starRank = card.starRank ?? 0;
  const cap = statCap(starRank);
  const nextCost = evolveCost(starRank);
  const readyToEvolve = isEvolutionReady(card);

  const ownedFoods = FOOD_CATALOG.filter((f) => (foodInventory[f.id] ?? 0) > 0);

  function handleFeed(foodId: string) {
    const result = feedPet(card.id, foodId);
    if (!result) return;
    setReaction(reactionText(card.customName, result));
    setTimeout(() => setReaction(null), 3200);
  }

  function handleEvolve() {
    const result = evolveCard(card.id);
    if (!result) return;
    setEvolveNote(`${card.customName} ascended to ⭐×${result.newRank}! Stat cap is now ${statCap(result.newRank)}.`);
    setTimeout(() => setEvolveNote(null), 3600);
  }

  // Portal to <body>: the active view <section> keeps a `transform` from the
  // pop-in animation, which would otherwise trap this fixed overlay inside it.
  if (typeof document === "undefined") return null;
  return createPortal(
    <div className="fixed inset-0 z-[70] overflow-y-auto bg-ink/90 backdrop-blur-md" onClick={onClose}>
      {/* always-reachable close button (safe-area aware) */}
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="fixed right-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-lg font-extrabold text-ink shadow-lg"
        style={{ top: "max(1rem, env(safe-area-inset-top))" }}
      >
        ✕
      </button>

      {/* min-h-dvh centers a short card and lets a tall one scroll from the top */}
      <div className="flex min-h-dvh items-center justify-center px-4 py-6">
        <div className="animate-pop-in w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
          <div className={`rounded-card bg-gradient-to-br p-2 shadow-2xl ${hatching ? "from-sunny to-sunny-deep" : RARITY_FRAME[card.rarity]}`}>
            <div className="overflow-hidden rounded-[1.4rem] bg-white">
              {/* Art area — height-capped so the whole card fits one screen */}
              <div className={`relative flex h-[36vh] max-h-80 min-h-52 items-end justify-center overflow-hidden ${hatching ? "bg-sunny/25" : `hatch-bg-${bd}`}`}>
                <Sparkles count={hatching ? 0 : 12} />
                <span className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1 text-2xl shadow">
                  {SPECIES_EMOJI[card.species]}
                </span>
                <span className="absolute right-3 top-3 rounded-full bg-ink/70 px-3 py-1 text-xs font-bold text-white">
                  #{String(card.serialNumber).padStart(6, "0")}
                </span>
                {card.level > 1 && (
                  <span className="absolute right-3 top-11 rounded-full bg-sky px-3 py-1 text-xs font-extrabold text-white shadow">
                    Lv.{card.level}
                  </span>
                )}
                {starRank > 0 && (
                  <span className="absolute left-3 bottom-3 rounded-full bg-ink/70 px-3 py-1 text-xs font-extrabold text-sunny shadow">
                    {"⭐".repeat(starRank)} Ascended
                  </span>
                )}
                {hatching ? (
                  <div className="flex h-full w-full animate-pulse flex-col items-center justify-center gap-2">
                    <span className="animate-bob text-7xl">🥚</span>
                    <span className="text-sm font-extrabold text-ink/50">Still hatching…</span>
                  </div>
                ) : (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={card.cutoutUrl ?? card.imageUrl}
                    alt={card.customName}
                    className={card.cutoutUrl ? "sticker max-h-[92%] max-w-[88%] object-contain" : "h-full w-full object-cover"}
                  />
                )}
                {card.venueName && (
                  <span className="absolute bottom-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-sunny px-3 py-1 text-[11px] font-extrabold text-ink shadow">
                    🏷️ Captured at {card.venueName}
                  </span>
                )}
              </div>

              {/* Details */}
              <div className="flex flex-col gap-2.5 p-4">
                <div className="text-center">
                  <h2 className="font-script text-4xl font-bold leading-tight">{card.customName}</h2>
                  <div className="mt-1 flex items-center justify-center gap-2">
                    {card.breed && <span className="text-sm font-bold text-ink/50">{card.breed}</span>}
                    <span className={`rounded-full px-3 py-0.5 text-xs font-extrabold uppercase ${hatching ? "bg-ink/10 text-ink/40" : RARITY_CHIP[card.rarity]}`}>
                      {hatching ? "hatching" : card.rarity}
                    </span>
                  </div>
                  {!!card.feedCount && (
                    <p className="mt-1 text-[11px] font-bold text-ink/40">
                      🍖 Fed {card.feedCount}× · Powered by {card.lastFedBrand}
                    </p>
                  )}
                </div>

                {/* Personality stats — bars are relative to the current ascension cap */}
                <div className="flex flex-col gap-1.5">
                  {STAT_META.map(({ key, label, bar }) => (
                    <div key={key} className="flex items-center gap-2 text-sm font-bold">
                      <span className="w-32 shrink-0">{label}</span>
                      <div className="h-3 flex-1 overflow-hidden rounded-full bg-cream">
                        <div className={`h-full rounded-full ${bar} transition-all`} style={{ width: `${Math.min(100, (card.stats[key] / cap) * 100)}%` }} />
                      </div>
                      <span className="w-14 text-right text-xs text-ink/50">{card.stats[key]}/{cap}</span>
                    </div>
                  ))}
                </div>

                {/* Battle panel */}
                <div className="flex gap-2">
                  <span className="flex-1 rounded-2xl bg-cream px-3 py-2 text-center">
                    <span className="block text-[10px] font-extrabold text-ink/40">COST</span>
                    <span className="text-xl font-extrabold text-tangerine-deep">{cost}</span>
                  </span>
                  <span className="flex-1 rounded-2xl bg-cream px-3 py-2 text-center">
                    <span className="block text-[10px] font-extrabold text-ink/40">POWER</span>
                    <span className="text-xl font-extrabold text-sky-deep">{power}</span>
                  </span>
                  <span className="flex-1 rounded-2xl bg-cream px-3 py-2 text-center">
                    <span className="block text-[10px] font-extrabold text-ink/40">🍬 CANDY</span>
                    <span className="text-xl font-extrabold text-bubblegum">{card.candy}</span>
                  </span>
                </div>

                {/* Tribes + ability */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] font-extrabold text-ink/40">TRIBES</span>
                  {tribes.map((t) => (
                    <span key={t} className="rounded-full bg-grass/20 px-2.5 py-0.5 text-xs font-bold text-grass-deep">{t}</span>
                  ))}
                </div>
                <div className="rounded-2xl bg-cream p-3">
                  <span className="rounded-full bg-sunny px-2.5 py-0.5 text-xs font-extrabold text-ink">{ability.keyword}</span>
                  <p className="mt-1.5 text-xs font-semibold leading-snug text-ink/70">{ability.text}</p>
                </div>

                {/* Evolution — the answer to "what happens once stats are maxed?" */}
                {!hatching && (
                  <div className="rounded-2xl border-2 border-dashed border-bubblegum/60 p-3">
                    <p className="mb-1 text-xs font-extrabold uppercase tracking-widest text-bubblegum">
                      ✨ Ascension
                    </p>
                    {nextCost === null ? (
                      <p className="text-xs font-bold text-ink/60">
                        {"⭐".repeat(MAX_STAR_RANK)} Fully ascended — max Power reached!
                      </p>
                    ) : readyToEvolve ? (
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-bold text-ink/60">
                          All stats maxed! Evolve to {"⭐".repeat(starRank + 1)} for +2 Power and a higher cap.
                        </p>
                        <button
                          type="button"
                          disabled={card.candy < nextCost}
                          onClick={handleEvolve}
                          className="tappable shrink-0 rounded-full bg-bubblegum px-3 py-2 text-xs font-extrabold text-white shadow-sm disabled:opacity-40"
                        >
                          Evolve · {nextCost}🍬
                        </button>
                      </div>
                    ) : (
                      <p className="text-xs font-bold text-ink/50">
                        Feed all 3 stats up to {cap} to unlock evolving for {nextCost} 🍬.
                      </p>
                    )}
                    {evolveNote && (
                      <p className="animate-pop-in mt-2 rounded-xl bg-bubblegum/15 px-3 py-2 text-center text-xs font-bold text-bubblegum">
                        {evolveNote}
                      </p>
                    )}
                  </div>
                )}

                {/* Feed panel */}
                {!hatching && (
                  <div className="rounded-2xl border-2 border-dashed border-sunny/60 p-3">
                    <p className="mb-2 text-xs font-extrabold uppercase tracking-widest text-tangerine-deep">
                      🍖 Feed for a boost
                    </p>
                    {ownedFoods.length === 0 ? (
                      <button
                        type="button"
                        onClick={() => setShowStore(true)}
                        className="tappable w-full rounded-full bg-sunny px-4 py-2.5 text-sm font-extrabold text-ink shadow-sm"
                      >
                        🏪 Visit the Boost Store
                      </button>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {ownedFoods.map((food) => {
                          const owned = foodInventory[food.id] ?? 0;
                          const match = matchTypeFor(food, card.species);
                          return (
                            <div key={food.id} className="flex items-center gap-2 rounded-xl bg-cream px-3 py-2">
                              <span className="text-xl">{food.emoji}</span>
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-xs font-extrabold">{food.name}</p>
                                <span className={`inline-block rounded-full px-1.5 py-0.5 text-[9px] font-extrabold ${MATCH_BADGE[match]}`}>
                                  {MATCH_LABEL[match]}
                                </span>
                              </div>
                              <span className="text-[10px] font-extrabold text-ink/40">×{owned}</span>
                              <button
                                type="button"
                                onClick={() => handleFeed(food.id)}
                                className="tappable rounded-full bg-tangerine px-3 py-1.5 text-xs font-extrabold text-white shadow-sm"
                              >
                                Feed
                              </button>
                            </div>
                          );
                        })}
                        <button
                          type="button"
                          onClick={() => setShowStore(true)}
                          className="text-center text-xs font-bold text-tangerine-deep underline"
                        >
                          Get more food →
                        </button>
                      </div>
                    )}
                    {reaction && (
                      <p className="animate-pop-in mt-2 rounded-xl bg-sunny/40 px-3 py-2 text-center text-xs font-bold">
                        {reaction}
                      </p>
                    )}
                  </div>
                )}

                <p className="text-center text-[11px] font-bold text-ink/35">Caught {caught}</p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="tappable mx-auto mt-4 block rounded-full bg-white px-8 py-3 font-extrabold text-ink shadow-md"
          >
            Close ✕
          </button>
        </div>
      </div>

      {showStore && <BoostStore onClose={() => setShowStore(false)} />}
    </div>,
    document.body
  );
}
