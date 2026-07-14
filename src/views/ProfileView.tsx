"use client";

import { useEffect, useState } from "react";
import { useAppStore, type Species } from "@/lib/store";
import { SPECIES_EMOJI } from "@/components/icons";
import { levelFromXp } from "@/lib/cardFactory";
import {
  ACHIEVEMENTS, claimAchievement, currentCans, formatDuration, grantCans,
  rarestCatch, todayKey, MAX_CANS, AD_DAILY_COINS,
} from "@/lib/economy";
import SettingsSheet from "@/components/SettingsSheet";
import RewardedAd from "@/components/RewardedAd";
import BoostStore from "@/components/BoostStore";
import { FOOD_CATALOG } from "@/lib/food";

const SPECIES_ORDER: Species[] = ["dog", "cat", "rabbit", "bird", "other"];
const SPECIES_COLOR: Record<Species, string> = {
  dog: "bg-tangerine", cat: "bg-sky", rabbit: "bg-bubblegum", bird: "bg-grass", other: "bg-sunny",
};

/** Profile — Field Journal, Stash, achievements, and stats (CatchCat-inspired). */
export default function ProfileView() {
  const collection = useAppStore((s) => s.collection);
  const userXp = useAppStore((s) => s.userXp);
  const coins = useAppStore((s) => s.coins);
  const treats = useAppStore((s) => s.treats);
  const streakDays = useAppStore((s) => s.streakDays);
  const lastCatchDay = useAppStore((s) => s.lastCatchDay);
  const claimed = useAppStore((s) => s.claimedAchievements);
  const adCoinsDay = useAppStore((s) => s.adCoinsDay);
  const authUser = useAppStore((s) => s.authUser);
  const cansState = useAppStore((s) => s.cans);

  const foodInventory = useAppStore((s) => s.foodInventory);
  const [showSettings, setShowSettings] = useState(false);
  const [showStore, setShowStore] = useState(false);
  const [ad, setAd] = useState<null | "can" | "coins">(null);
  const [, tick] = useState(0);

  // refresh the can timer every 30s while visible
  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 30_000);
    return () => clearInterval(t);
  }, []);

  const total = collection.length;
  const { level, intoLevel, perLevel } = levelFromXp(userXp);
  const { count: cans, nextRefillMs } = currentCans();
  void cansState; // subscribe so spending cans re-renders
  const today = todayKey();
  const todayCount = collection.filter((c) => c.createdAt.slice(0, 10) === today).length;
  const rarest = rarestCatch();
  const streak = lastCatchDay === today || lastCatchDay === new Date(Date.now() - 86400000).toISOString().slice(0, 10) ? streakDays : 0;
  const adCoinsUsed = adCoinsDay === today;

  return (
    <div className="flex flex-col gap-4 p-4">
      <header className="flex items-center gap-4">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-sunny text-4xl shadow-md">🧑‍🚀</div>
        <div className="flex-1">
          <h1 className="text-2xl font-extrabold text-ink">
            {authUser?.name ?? authUser?.email?.split("@")[0] ?? "Pet Trainer"}
          </h1>
          <p className="text-ink/60">{total} unique pets caught</p>
          <div className="mt-1.5 flex items-center gap-2">
            <span className="rounded-full bg-sunny px-2 py-0.5 text-xs font-extrabold text-ink">Lv.{level}</span>
            <div className="h-3 flex-1 overflow-hidden rounded-full bg-white shadow-inner">
              <div className="h-full rounded-full bg-gradient-to-r from-sunny to-tangerine transition-all"
                style={{ width: `${Math.round((intoLevel / perLevel) * 100)}%` }} />
            </div>
            <span className="text-xs font-bold text-ink/50">{intoLevel}/{perLevel} XP</span>
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

      {/* Field Journal (Rarest / Today / Streak) */}
      <section className="rounded-card bg-white p-5 shadow-md">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-lg font-extrabold">📖 Field Journal</h2>
          <span className="rounded-2xl bg-cream px-3 py-1 text-xl font-extrabold">{total}</span>
        </div>
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center gap-3 rounded-2xl bg-sunny/30 px-4 py-3">
            <span className="text-xl">⭐</span>
            <span className="text-xs font-extrabold text-ink/50">RAREST</span>
            <span className="ml-auto font-extrabold capitalize">
              {rarest ? `${rarest.rarity} · ${rarest.name}` : "—"}
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

      {/* Stash: snack cans + currencies */}
      <section className="rounded-card bg-white p-5 shadow-md">
        <h2 className="mb-3 text-lg font-extrabold">🎒 Stash</h2>
        <div className="mb-1 flex items-center justify-between text-sm font-extrabold">
          <span>🥫 Snack cans</span>
          <span>{cans} / {MAX_CANS}{cans > MAX_CANS ? " (bonus!)" : ""}</span>
        </div>
        <div className="h-4 overflow-hidden rounded-full bg-cream">
          <div className="h-full rounded-full bg-tangerine transition-all"
            style={{ width: `${Math.min(100, (cans / MAX_CANS) * 100)}%` }} />
        </div>
        <p className="mt-1 text-xs font-semibold text-ink/50">
          {nextRefillMs == null ? "Full — go catch something!" : `Next can in ${formatDuration(nextRefillMs)}`}
        </p>
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={() => setAd("can")}
            className="tappable flex-1 rounded-full bg-sunny px-3 py-2.5 text-sm font-extrabold text-ink shadow-sm"
          >
            🎬 Bonus can
          </button>
          <button
            type="button"
            disabled={adCoinsUsed}
            onClick={() => setAd("coins")}
            className="tappable flex-1 rounded-full bg-sunny px-3 py-2.5 text-sm font-extrabold text-ink shadow-sm disabled:opacity-40"
          >
            🎬 +{AD_DAILY_COINS} coins {adCoinsUsed ? "(done today)" : "· 1/day"}
          </button>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <span className="flex items-center justify-between rounded-2xl bg-cream px-4 py-3 font-extrabold">
            🪙 Coins <span>{coins}</span>
          </span>
          <span className="flex items-center justify-between rounded-2xl bg-cream px-4 py-3 font-extrabold">
            🍪 Treats <span>{treats}</span>
          </span>
        </div>

        <div className="mt-3 flex items-center justify-between rounded-2xl bg-tangerine/10 px-4 py-3">
          <span className="text-sm font-extrabold">
            🍖 Pet food{" "}
            <span className="text-ink/40">
              ({FOOD_CATALOG.reduce((sum, f) => sum + (foodInventory[f.id] ?? 0), 0)} items)
            </span>
          </span>
          <button
            type="button"
            onClick={() => setShowStore(true)}
            className="tappable rounded-full bg-tangerine px-4 py-2 text-xs font-extrabold text-white shadow-sm"
          >
            🏪 Boost Store
          </button>
        </div>
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
          <p className="text-ink/60">Catch pets to see your stats bloom! 🌱</p>
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
      {showStore && <BoostStore onClose={() => setShowStore(false)} />}
      {ad && (
        <RewardedAd
          rewardLabel={ad === "can" ? "1 snack can" : `${AD_DAILY_COINS} coins`}
          onComplete={() => {
            if (ad === "can") grantCans(1);
            else {
              useAppStore.getState().addCoins(AD_DAILY_COINS);
              useAppStore.getState().setAdCoinsDay(todayKey());
            }
          }}
          onClose={() => setAd(null)}
        />
      )}
    </div>
  );
}
