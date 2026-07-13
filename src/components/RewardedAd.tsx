"use client";

import { useEffect, useState } from "react";
import Portal from "@/components/Portal";

/**
 * Rewarded ad placement (T&C §3 / Privacy §4: Google AdMob rewarded units
 * support the free platform). This is the placement shell — drop the real
 * ad unit (AdMob/Ad Manager web rewarded API) into the marked slot; the
 * grant fires only after the countdown "view" completes, mirroring the
 * rewarded-ad contract.
 */
export default function RewardedAd({
  rewardLabel,
  onComplete,
  onClose,
}: {
  rewardLabel: string;
  onComplete: () => void;
  onClose: () => void;
}) {
  const [secondsLeft, setSecondsLeft] = useState(5);
  const done = secondsLeft <= 0;

  useEffect(() => {
    if (done) return;
    const t = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [secondsLeft, done]);

  return (
    <Portal>
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-ink/80 p-6 backdrop-blur-sm">
      <div className="animate-pop-in flex w-full max-w-sm flex-col items-center gap-4 rounded-card bg-white p-6 text-center shadow-2xl">
        <span className="text-xs font-extrabold uppercase tracking-widest text-ink/40">
          Sponsored break
        </span>
        {/* AdMob / Ad Manager rewarded unit renders here */}
        <div className="flex h-44 w-full flex-col items-center justify-center gap-2 rounded-2xl bg-cream">
          <span className="text-5xl">🎬</span>
          <span className="font-bold text-ink/50">
            {done ? "Thanks for watching!" : `Ad playing… ${secondsLeft}s`}
          </span>
        </div>
        <button
          type="button"
          disabled={!done}
          onClick={() => {
            onComplete();
            onClose();
          }}
          className="tappable w-full rounded-full bg-grass px-6 py-4 text-lg font-extrabold text-white shadow-md disabled:opacity-40"
        >
          Claim {rewardLabel} 🎁
        </button>
        <button type="button" onClick={onClose} className="text-sm font-bold text-ink/40">
          No thanks
        </button>
      </div>
    </div>
    </Portal>
  );
}
