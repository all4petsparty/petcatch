"use client";

import { useEffect, useState } from "react";
import { useAppStore } from "@/lib/store";
import { ACHIEVEMENTS, claimAchievement, grantSnacks, metCount } from "@/lib/economy";
import Portal from "@/components/Portal";
import FullScreenAd from "@/components/FullScreenAd";

/** Snacks at or below this count trigger the restock nudge. */
const LOW_SNACKS = 1;
const SESSION_KEY = "pc_welcomed_session";

/**
 * "Welcome back" nudge shown once per app open (fresh session): surfaces the
 * next unfinished mission and, when Discovery Snacks are low, prompts a
 * restock via rewarded video. Renders after the entry gates.
 */
export default function WelcomeBack() {
  const collection = useAppStore((s) => s.collection);
  const snacks = useAppStore((s) => s.snacks);
  const claimed = useAppStore((s) => s.claimedAchievements);
  const setActiveView = useAppStore((s) => s.setActiveView);
  const authUser = useAppStore((s) => s.authUser);
  const guestImportDoneFor = useAppStore((s) => s.guestImportDoneFor);
  const myPetsPromptSeen = useAppStore((s) => s.myPetsPromptSeen);

  const [open, setOpen] = useState(false);
  const [showAd, setShowAd] = useState(false);
  const [claimNote, setClaimNote] = useState<string | null>(null);

  // Decide once, shortly after the app becomes interactive
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem(SESSION_KEY)) return;
    // don't collide with the one-time "add your own pets" prompt (first-ever login)
    if (!myPetsPromptSeen) return;
    // don't collide with the first-sign-in guest-import prompt
    const importPending =
      authUser && collection.length > 0 && guestImportDoneFor !== authUser.id;
    if (importPending) return;

    const t = setTimeout(() => {
      sessionStorage.setItem(SESSION_KEY, "1");
      setOpen(true);
    }, 700);
    return () => clearTimeout(t);
    // run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!open) return null;

  const lowSnacks = snacks <= LOW_SNACKS;

  // next unfinished mission = first unclaimed achievement
  const met = metCount();
  const mission = ACHIEVEMENTS.find((a) => !claimed.includes(a.id));
  const missionReached = mission ? met >= mission.goal : false;
  const missionProgress = mission ? Math.min(met, mission.goal) : 0;

  const close = () => setOpen(false);

  function goMeet() {
    close();
    setActiveView("meet");
  }

  function handleClaim() {
    if (!mission) return;
    if (claimAchievement(mission)) {
      setClaimNote(`Claimed ${mission.rewardLabel}! 🎁`);
      setTimeout(close, 1200);
    }
  }

  return (
    <Portal>
      <div className="fixed inset-0 z-[80] flex items-center justify-center bg-ink/70 p-6 backdrop-blur-sm" onClick={close}>
        <div
          className="animate-pop-in flex w-full max-w-sm flex-col gap-4 rounded-card bg-white p-6 shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="text-center">
            <span className="text-5xl">🐾</span>
            <h2 className="mt-1 text-2xl font-extrabold">Welcome back!</h2>
          </div>

          {/* Low-snacks restock nudge (priority) */}
          {lowSnacks && (
            <div className="flex flex-col gap-3 rounded-2xl bg-tangerine/15 p-4">
              <p className="text-sm font-bold text-ink/80">
                🍬 You&apos;re running low on Discovery Snacks (<b>{snacks}</b>)! Watch a short ad to restock and keep meeting pets.
              </p>
              <button
                type="button"
                onClick={() => setShowAd(true)}
                className="tappable flex items-center justify-center gap-2 rounded-full bg-tangerine px-4 py-3 text-sm font-extrabold text-white shadow-md"
              >
                ▶️ Tap to watch an ad for +1 snack
              </button>
            </div>
          )}

          {/* Next mission */}
          {mission ? (
            <div className="flex flex-col gap-2 rounded-2xl bg-cream p-4">
              <p className="text-xs font-extrabold uppercase tracking-widest text-tangerine-deep">
                {missionReached ? "Mission complete!" : "Your next mission"}
              </p>
              <p className="font-extrabold">
                {missionReached ? `${mission.title} 🏆` : `Ready to: ${mission.blurb}`}
              </p>
              <div className="flex items-center gap-2">
                <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-white">
                  <div
                    className={`h-full rounded-full ${missionReached ? "bg-grass" : "bg-sunny-deep"}`}
                    style={{ width: `${(missionProgress / mission.goal) * 100}%` }}
                  />
                </div>
                <span className="text-xs font-bold text-ink/50">{missionProgress}/{mission.goal}</span>
              </div>
              <button
                type="button"
                onClick={missionReached ? handleClaim : goMeet}
                className="tappable mt-1 rounded-full bg-grass px-4 py-3 font-extrabold text-white shadow-md"
              >
                {missionReached ? `Claim ${mission.rewardLabel} 🎁` : "Start meeting pets 📸"}
              </button>
            </div>
          ) : (
            <div className="rounded-2xl bg-grass/15 p-4 text-center font-bold text-grass-deep">
              🌟 All missions complete — you&apos;re a legend! Go meet more friends.
            </div>
          )}

          {claimNote && (
            <p className="animate-pop-in rounded-2xl bg-sunny/40 px-4 py-2 text-center text-sm font-bold">{claimNote}</p>
          )}

          <button type="button" onClick={close} className="text-sm font-bold text-ink/40">
            Maybe later
          </button>
        </div>
      </div>

      {showAd && (
        <FullScreenAd
          onFinish={() => {
            grantSnacks(1);
            setShowAd(false);
            setClaimNote("+1 snack! 🍬");
          }}
        />
      )}
    </Portal>
  );
}
