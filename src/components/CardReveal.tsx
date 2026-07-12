"use client";

import { useMemo } from "react";
import { useAppStore } from "@/lib/store";
import { SPECIES_EMOJI } from "@/components/icons";

const REJECT_TEXT: Record<string, string> = {
  screen_detected: "That looks like a screen — PetCatch only counts real-life friends! 📺",
  no_animal: "No pet found in the shot — aim for a dog, cat, rabbit, or bird! 🔍",
  too_still: "Too still — find a live, wiggly friend! 🖼️",
  error: "The treat rolled away — try another toss! 😵",
};

function Sparkles({ count = 10 }: { count?: number }) {
  const stars = useMemo(
    () => Array.from({ length: count }, () => ({
      left: 8 + Math.random() * 84, top: 4 + Math.random() * 88,
      delay: Math.random() * 1.4, size: 12 + Math.random() * 14,
      char: Math.random() < 0.5 ? "✦" : "★",
    })),
    [count]
  );
  return (
    <>
      {stars.map((s, i) => (
        <span key={i} className="pointer-events-none absolute animate-twinkle text-sunny drop-shadow"
          style={{ left: `${s.left}%`, top: `${s.top}%`, fontSize: s.size, animationDelay: `${s.delay}s` }}>
          {s.char}
        </span>
      ))}
    </>
  );
}

/**
 * Fast capture reveal: 2s brew → collector card with the photo, name, and
 * stats (rarity hidden — it's revealed later when the card "hatches" in
 * the PetDex after background processing).
 */
export default function CardReveal() {
  const flow = useAppStore((s) => s.captureFlow);
  const setCaptureFlow = useAppStore((s) => s.setCaptureFlow);
  const setActiveView = useAppStore((s) => s.setActiveView);
  if (!flow) return null;

  const dismiss = () => setCaptureFlow(null);

  if (flow.status === "brewing") {
    return (
      <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center gap-6 bg-ink/85 p-6 backdrop-blur-md">
        <div className="relative flex h-56 w-56 items-center justify-center">
          <Sparkles count={14} />
          <span className="animate-bob text-8xl">🍲</span>
          <span className="absolute -top-2 animate-wiggle text-4xl">✨</span>
        </div>
        <p className="animate-pulse text-xl font-extrabold text-white">Something is brewing…</p>
      </div>
    );
  }

  if (flow.status === "rejected") {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/70 p-6 backdrop-blur-sm">
        <div className="animate-pop-in flex w-full max-w-sm flex-col items-center gap-3 rounded-card bg-white p-8 text-center shadow-2xl">
          <span className="text-6xl">😿</span>
          <p className="text-lg font-extrabold">{REJECT_TEXT[flow.reason ?? "error"]}</p>
          <button type="button" onClick={dismiss}
            className="tappable rounded-full bg-grass px-8 py-3 font-extrabold text-white shadow-md">
            Try again
          </button>
        </div>
      </div>
    );
  }

  const card = flow.card!;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-ink/80 p-5 backdrop-blur-md">
      <div className="animate-pop-in w-full max-w-sm">
        {/* collector card: photo in frame, name + credentials below */}
        <div className="rounded-card bg-gradient-to-br from-sunny via-tangerine to-sunny-deep p-2 shadow-2xl">
          <div className="overflow-hidden rounded-[1.4rem] bg-cream">
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={card.imageUrl} alt={card.customName} className="aspect-square w-full object-cover" />
              <span className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1 text-2xl shadow">
                {SPECIES_EMOJI[card.species]}
              </span>
              <span className="absolute right-3 top-3 rounded-full bg-ink/70 px-3 py-1 text-xs font-bold text-white">
                #{String(card.serialNumber).padStart(6, "0")}
              </span>
            </div>
            <div className="flex flex-col gap-2 p-4 text-center">
              <h2 className="font-script text-4xl font-bold">{card.customName}</h2>
              {card.breed && <p className="-mt-1 text-sm font-bold text-ink/50">{card.breed}</p>}
              <div className="flex justify-center gap-2 text-xs font-extrabold">
                <span className="rounded-full bg-white px-3 py-1">🍩 {card.stats.chonkiness}</span>
                <span className="rounded-full bg-white px-3 py-1">💛 {card.stats.friendliness}</span>
                <span className="rounded-full bg-white px-3 py-1">⚡ {card.stats.energy}</span>
              </div>
              <span className="mx-auto rounded-full bg-sunny px-4 py-1 text-sm font-extrabold text-ink">
                XP +100 · 🍬 +1
              </span>
              <p className="rounded-2xl bg-white px-3 py-2 text-xs font-bold text-ink/60">
                🥚 Rarity: hatching… Return to your PetDex to see what your pet has hatched into!
              </p>
            </div>
          </div>
        </div>
        <div className="mt-4 flex gap-3">
          <button type="button" onClick={dismiss}
            className="tappable flex-1 rounded-full bg-white px-4 py-3 font-extrabold text-ink shadow-md">
            Keep Catching 📸
          </button>
          <button type="button" onClick={() => { dismiss(); setActiveView("collection"); }}
            className="tappable flex-1 rounded-full bg-grass px-4 py-3 font-extrabold text-white shadow-md">
            See PetDex 📖
          </button>
        </div>
      </div>
    </div>
  );
}
