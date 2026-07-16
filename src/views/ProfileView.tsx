"use client";

import { useState } from "react";
import { useAppStore, type Species } from "@/lib/store";
import { SPECIES_EMOJI } from "@/components/icons";
import { explorerLevelFromPoints } from "@/lib/cardFactory";
import {
  ACHIEVEMENTS, claimAchievement, grantSnacks, mostFamiliarPet, todayKey, metCount,
} from "@/lib/economy";
import SettingsSheet from "@/components/SettingsSheet";
import FullScreenAd from "@/components/FullScreenAd";
import PetFamilyCard from "@/components/PetFamilyCard";
import ScanConnect from "@/components/ScanConnect";

const SPECIES_ORDER: Species[] = ["dog", "cat", "rabbit", "bird", "other"];
const SPECIES_COLOR: Record<Species, string> = {
  dog: "bg-tangerine", cat: "bg-sky", rabbit: "bg-bubblegum", bird: "bg-grass", other: "bg-sunny",
};

/** Me — Field Journal, Stash, achievements, and stats. */
export default function ProfileView() {
  const collection = useAppStore((s) => s.collection);
  const pawPoints = useAppStore((s) => s.pawPoints);
  const snacks = useAppStore((s) => s.snacks);
  const streakDays = useAppStore((s) => s.streakDays);
  const lastCatchDay = useAppStore((s) => s.lastCatchDay);
  const claimed = useAppStore((s) => s.claimedAchievements);
  const authUser = useAppStore((s) => s.authUser);

  const [showSettings, setShowSettings] = useState(false);
  const [showAd, setShowAd] = useState(false);
  const [adReadyToClaim, setAdReadyToClaim] = useState(false);
  const [showFamilyCard, setShowFamilyCard] = useState(false);
  const [showScan, setShowScan] = useState(false);

  const total = metCount();
  const myPetsCount = collection.filter((c) => c.owned).length;
  const { level, intoLevel, perLevel } = explorerLevelFromPoints(pawPoints);
  const today = todayKey();
  const todayCount = collection.filter((c) => c.createdAt.slice(0, 10) === today).length;
  const mostFamiliar = mostFamiliarPet();
  const streak = lastCatchDay === today || lastCatchDay === new Date(Date.now() - 86400000).toISOString().slice(0, 10) ? streakDays : 0;

  return (
    <div className="flex flex-col gap-4 p-4">
      <header className="flex items-center gap-4">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-sunny text-4xl shadow-md">🧑‍🚀</div>
        <div className="flex-1">
          <h1 className="text-2xl font-extrabold text-ink">
            {authUser?.name ?? authUser?.email?.split("@")[0] ?? "Pet Trainer"}
          </h1>
          <p className="text-ink/60">{total} unique pets met{myPetsCount > 0 ? ` · ${myPetsCount} my pets` : ""}</p>
          <div className="mt-1.5 flex items-center gap-2">
            <span className="rounded-full bg-sunny px-2 py-0.5 text-xs font-extrabold text-ink">Lv.{level}</span>
            <div className="h-3 flex-1 overflow-hidden rounded-full bg-white shadow-inner">
              <div className="h-full rounded-full bg-gradient-to-r from-sunny to-tangerine transition-all"
                style={{ width: `${Math.round((intoLevel / perLevel) * 100)}%` }} />
            </div>
            <span className="text-xs font-bold text-ink/50">{intoLevel}/{perLevel} pts</span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShowSettings(true)}
          aria-label="Settings"
          className="tappable flex h-11 w-11 items-center justify-center rounded-full bg-white text-xl shadow-md"
        >
          ⚙️
        </button>
      </header>

      {/* Field Journal (Most Familiar / Today / Streak) */}
      <section className="rounded-card bg-white p-5 shadow-md">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-lg font-extrabold">📖 Field Journal</h2>
          <span className="rounded-2xl bg-cream px-3 py-1 text-xl font-extrabold">{total}</span>
        </div>
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center gap-3 rounded-2xl bg-sunny/30 px-4 py-3">
            <span className="text-xl">🤝</span>
            <span className="text-xs font-extrabold text-ink/50">MOST FAMILIAR</span>
            <span className="ml-auto font-extrabold">
              {mostFamiliar ? `${mostFamiliar.name} · ${mostFamiliar.encounterCount}×` : "—"}
            </span>
          </div>
          <div className="flex items-center gap-3 rounded-2xl bg-tangerine/20 px-4 py-3">
            <span className="text-xl">📸</span>
            <span className="text-xs font-extrabold text-ink/50">TODAY</span>
            <span className="ml-auto font-extrabold">{todayCount}</span>
          </div>
          <div className="flex items-center gap-3 rounded-2xl bg-grass/20 px-4 py-3">
            <span className="text-xl">🔥</span>
            <span className="text-xs font-extrabold text-ink/50">STREAK</span>
            <span className="ml-auto font-extrabold">{streak}d</span>
          </div>
        </div>
      </section>

      {/* Pet Family — QR connections (spec §15) */}
      <section className="rounded-card bg-white p-5 shadow-md">
        <h2 className="mb-1 text-lg font-extrabold">🪪 Pet Family</h2>
        <p className="mb-3 text-xs font-semibold text-ink/50">
          Connect with other pet parents for free — share your calling card or scan theirs.
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setShowFamilyCard(true)}
            className="tappable flex-1 rounded-full bg-bubblegum px-4 py-3 text-sm font-extrabold text-white shadow-sm"
          >
            My Calling Card
          </button>
          <button
            type="button"
            onClick={() => setShowScan(true)}
            className="tappable flex-1 rounded-full bg-sky px-4 py-3 text-sm font-extrabold text-white shadow-sm"
          >
            Scan QR 🔗
          </button>
        </div>
        {!authUser && <p className="mt-2 text-xs font-bold text-tangerine-deep">Sign in to get your own scannable code.</p>}
      </section>

      {/* Stash: Discovery Snacks + Paw Points */}
      <section className="rounded-card bg-white p-5 shadow-md">
        <h2 className="mb-3 text-lg font-extrabold">🎒 Stash</h2>
        <div className="grid grid-cols-2 gap-2">
          <span className="flex items-center justify-between rounded-2xl bg-cream px-4 py-3 font-extrabold">
            🍬 Snacks <span>{snacks}</span>
          </span>
          <span className="flex items-center justify-between rounded-2xl bg-cream px-4 py-3 font-extrabold">
            🐾 Paw Points <span>{pawPoints}</span>
          </span>
        </div>
        {adReadyToClaim ? (
          <button
            type="button"
            onClick={() => {
              grantSnacks(1);
              setAdReadyToClaim(false);
            }}
            className="tappable mt-3 w-full animate-wiggle rounded-full bg-grass px-3 py-2.5 text-sm font-extrabold text-white shadow-sm"
          >
            🎁 Claim your free snack!
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setShowAd(true)}
            className="tappable mt-3 flex w-full items-center justify-center gap-2 rounded-full bg-sunny px-3 py-2.5 text-sm font-extrabold text-ink shadow-sm"
          >
            ▶️ Tap to watch an ad for +1 snack
          </button>
        )}
        <p className="mt-2 text-xs font-semibold text-ink/50">
          🍬 +2 free snacks show up automatically every 12 hours — and you can watch unlimited ads any time for +1 each.
        </p>
      </section>

      {/* Achievements */}
      <section className="rounded-card bg-white p-5 shadow-md">
        <h2 className="mb-3 text-lg font-extrabold">🏆 Achievements</h2>
        <div className="flex flex-col gap-2.5">
          {ACHIEVEMENTS.map((a) => {
            const progress = Math.min(total, a.goal);
            const reached = progress >= a.goal;
            const isClaimed = claimed.includes(a.id);
            return (
              <div key={a.id} className={`rounded-2xl p-4 ${isClaimed ? "bg-grass/15" : "bg-cream"}`}>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-extrabold">{isClaimed ? "✅" : "⭐"} {a.title}</span>
                  <span className="rounded-full bg-white px-2.5 py-0.5 text-xs font-extrabold text-ink/60">
                    {progress}/{a.goal}
                  </span>
                </div>
                <p className="mt-0.5 text-xs font-semibold text-ink/50">{a.blurb}</p>
                <div className="mt-2 flex items-center gap-2">
                  <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-white">
                    <div className={`h-full rounded-full ${isClaimed ? "bg-grass" : "bg-sunny-deep"}`}
                      style={{ width: `${(progress / a.goal) * 100}%` }} />
                  </div>
                  {reached && !isClaimed ? (
                    <button
                      type="button"
                      onClick={() => claimAchievement(a)}
                      className="tappable animate-wiggle rounded-full bg-tangerine px-3 py-1 text-xs font-extrabold text-white shadow"
                    >
                      Claim {a.rewardLabel}!
                    </button>
                  ) : (
                    <span className="text-[10px] font-extrabold uppercase text-ink/40">{a.rewardLabel}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Collection breakdown */}
      <section className="rounded-card bg-white p-5 shadow-md">
        <h2 className="mb-3 text-lg font-extrabold">Collection Breakdown</h2>
        {total === 0 ? (
          <p className="text-ink/60">Meet pets to see your stats bloom! 🌱</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {SPECIES_ORDER.map((species) => ({
              species, count: collection.filter((c) => c.species === species).length,
            }))
              .filter((c) => c.count > 0)
              .map(({ species, count }) => {
                const pct = Math.round((count / total) * 100);
                return (
                  <li key={species} className="flex items-center gap-2">
                    <span className="w-8 text-xl">{SPECIES_EMOJI[species]}</span>
                    <div className="h-5 flex-1 overflow-hidden rounded-full bg-cream">
                      <div className={`h-full rounded-full ${SPECIES_COLOR[species]} transition-all`}
                        style={{ width: `${pct}%` }} />
                    </div>
                    <span className="w-12 text-right text-sm font-bold">{pct}%</span>
                  </li>
                );
              })}
          </ul>
        )}
      </section>

      {showSettings && <SettingsSheet onClose={() => setShowSettings(false)} />}
      {showFamilyCard && <PetFamilyCard onClose={() => setShowFamilyCard(false)} />}
      {showScan && <ScanConnect onClose={() => setShowScan(false)} />}
      {showAd && (
        <FullScreenAd
          onFinish={() => {
            setShowAd(false);
            setAdReadyToClaim(true);
          }}
        />
      )}
    </div>
  );
}
