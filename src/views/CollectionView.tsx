"use client";

import { useState } from "react";
import { useAppStore, type Species, type PetCard } from "@/lib/store";
import { SPECIES_EMOJI } from "@/components/icons";
import CardDetail from "@/components/CardDetail";
import CaptureMyPet from "@/components/CaptureMyPet";

const FRAME = "from-ink/20 to-ink/5";

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

type LibraryTab = "mine" | "met" | "community" | "adoption";
const TABS: { key: LibraryTab; label: string }[] = [
  { key: "mine", label: "My Pets" },
  { key: "met", label: "Pets Met" },
  { key: "community", label: "Community" },
  { key: "adoption", label: "Adoption" },
];

function backdropOf(card: PetCard): number {
  return card.backdrop ?? (card.id.charCodeAt(0) + card.id.charCodeAt(3)) % 4;
}

/** Mini collector card used inside a category. */
function MiniCard({ card, index, onOpen }: { card: PetCard; index: number; onOpen: () => void }) {
  const processing = card.hatched === false;
  const bd = backdropOf(card);
  return (
    <button
      type="button"
      onClick={onOpen}
      className={`tappable w-full rounded-2xl bg-gradient-to-br p-1.5 shadow-lg ${processing ? "from-sunny to-sunny-deep" : FRAME}`}
      style={{ transform: `rotate(${index % 2 === 0 ? -1.2 : 1.2}deg)` }}
    >
      <span className="block overflow-hidden rounded-xl bg-white">
        <span className={`relative flex h-32 w-full items-end justify-center overflow-hidden ${processing ? "bg-sunny/25" : `hatch-bg-${bd}`}`}>
          {processing ? (
            <span className="flex h-full w-full animate-pulse flex-col items-center justify-center gap-1">
              <span className="animate-bob text-5xl">🐾</span>
              <span className="text-[10px] font-extrabold text-ink/50">Saving…</span>
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
          {!card.owned && card.encounters.length > 1 && (
            <span className="absolute right-1.5 top-1.5 rounded-full bg-sky px-2 py-0.5 text-[10px] font-extrabold text-white shadow">
              Met {card.encounters.length}×
            </span>
          )}
        </span>
        <span className="block px-2 pb-2 pt-1 text-center">
          <span className="font-script block truncate text-2xl font-bold leading-tight text-ink">{card.customName}</span>
          <span className="flex items-center justify-between text-[9px] font-extrabold">
            <span className="uppercase tracking-wide text-ink/40">
              {processing ? "saving" : (card.breed ?? SPECIES_LABEL[card.species].slice(0, -1))}
            </span>
            <span className="text-ink/35">#{String(card.serialNumber).padStart(6, "0")}</span>
          </span>
        </span>
      </span>
    </button>
  );
}

/** Species-grouped card browser, shared by the My Pets and Pets Met tabs. */
function SpeciesLibrary({
  cards, emptyTitle, emptyBody, emptyAction,
}: {
  cards: PetCard[];
  emptyTitle: string;
  emptyBody: string;
  emptyAction?: React.ReactNode;
}) {
  const [category, setCategory] = useState<Species | null>(null);
  const [detail, setDetail] = useState<PetCard | null>(null);

  const categories = SPECIES_ORDER
    .map((species) => ({ species, cards: cards.filter((c) => c.species === species) }))
    .filter((g) => g.cards.length > 0);

  if (cards.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-card bg-white p-10 text-center shadow-md">
        <span className="text-6xl">🐾</span>
        <p className="text-xl font-bold">{emptyTitle}</p>
        <p className="text-ink/60">{emptyBody}</p>
        {emptyAction}
      </div>
    );
  }

  if (category) {
    const inCategory = cards.filter((c) => c.species === category);
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setCategory(null)}
            className="tappable flex h-10 w-10 items-center justify-center rounded-full bg-white text-xl font-extrabold shadow-md"
            aria-label="Back to categories"
          >
            ‹
          </button>
          <div>
            <h2 className="text-xl font-extrabold text-ink">
              {SPECIES_EMOJI[category]} {SPECIES_LABEL[category]}
            </h2>
            <p className="text-sm text-ink/60">{inCategory.length} in this category</p>
          </div>
        </div>
        <div className="dotted-paper grid grid-cols-2 gap-x-3 gap-y-5 rounded-card p-4 shadow-md">
          {inCategory.map((card, i) => (
            <MiniCard key={card.id} card={card} index={i} onOpen={() => setDetail(card)} />
          ))}
        </div>
        {detail && <CardDetail card={detail} onClose={() => setDetail(null)} />}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {categories.map(({ species, cards: inCategory }) => {
        const previews = inCategory.slice(0, 3);
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
                    {inCategory.length} {inCategory.length === 1 ? "card" : "cards"}
                  </span>
                </span>
              </span>
              <span className="flex shrink-0 -space-x-3">
                {previews.map((c, i) => (
                  <span
                    key={c.id}
                    className={`flex h-11 w-9 items-center justify-center overflow-hidden rounded-lg border-2 border-white shadow ${c.hatched === false ? "bg-sunny/40" : `hatch-bg-${backdropOf(c)}`}`}
                    style={{ transform: `rotate(${(i - 1) * 8}deg)` }}
                  >
                    {c.hatched === false ? (
                      <span className="text-base">🐾</span>
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
  );
}

function ComingSoon({ emoji, title, body }: { emoji: string; title: string; body: string }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-card bg-white p-10 text-center shadow-md">
      <span className="text-6xl">{emoji}</span>
      <p className="text-xl font-bold">{title}</p>
      <p className="text-ink/60">{body}</p>
    </div>
  );
}

/**
 * PetDex library (spec §16): My Pets / Pets Met / Community / Adoption
 * tabs. My Pets and Pets Met are species-grouped browsers; Community and
 * Adoption need canonical places and verified organizations (Phase 3/5)
 * so they're placeholders for now.
 */
export default function CollectionView() {
  const collection = useAppStore((s) => s.collection);
  const [tab, setTab] = useState<LibraryTab>("met");
  const [showAddPet, setShowAddPet] = useState(false);

  const myPets = collection.filter((c) => c.owned);
  const metPets = collection.filter((c) => !c.owned);

  return (
    <div className="flex flex-col gap-4 p-4">
      <header>
        <h1 className="text-3xl font-extrabold text-ink">My PetDex 📖</h1>
        <p className="text-ink/60">
          {myPets.length} owned · {metPets.length} met
        </p>
      </header>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`tappable whitespace-nowrap rounded-full px-4 py-2 font-bold ${
              tab === t.key ? "bg-sunny text-ink shadow-md" : "bg-white text-ink/50"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "mine" && (
        <>
          <button
            type="button"
            onClick={() => setShowAddPet(true)}
            className="tappable rounded-full bg-bubblegum px-4 py-3 text-center font-extrabold text-white shadow-md"
          >
            + Add My Pet 🏠
          </button>
          <SpeciesLibrary
            cards={myPets}
            emptyTitle="No pets registered yet!"
            emptyBody="Add your own pet family here - just throw them a treat to capture!"
          />
        </>
      )}

      {tab === "met" && (
        <SpeciesLibrary
          cards={metPets}
          emptyTitle="No pets met yet!"
          emptyBody="Throw a treat at your first furry friend below."
        />
      )}

      {tab === "community" && (
        <ComingSoon
          emoji="🌍"
          title="Community pets are coming soon"
          body="Once canonical places exist, pets spotted repeatedly in a shared area will show up here with community moderation."
        />
      )}

      {tab === "adoption" && (
        <ComingSoon
          emoji="🐕‍🦺"
          title="Adoption pets are coming soon"
          body="Verified animal welfare organizations will be able to publish adoptable pets here for you to save, share, and ask about."
        />
      )}

      {showAddPet && <CaptureMyPet onClose={() => setShowAddPet(false)} />}
    </div>
  );
}
