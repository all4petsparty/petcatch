"use client";

import { useEffect, useState } from "react";
import { useAppStore } from "@/lib/store";
import Portal from "@/components/Portal";
import { TREATS } from "@/lib/treats";

/**
 * One-time animated explainer shown the first time a user opens the Meet!
 * capture screen: step 1 shows the treat picker (hold to reveal flavors),
 * step 2 shows the drag-to-throw motion with an animated arrow. Dismissed
 * for good via the persisted meetTutorialSeen flag.
 */
export default function CaptureTutorial() {
  const activeView = useAppStore((s) => s.activeView);
  const meetTutorialSeen = useAppStore((s) => s.meetTutorialSeen);
  const setMeetTutorialSeen = useAppStore((s) => s.setMeetTutorialSeen);
  const [step, setStep] = useState<1 | 2>(1);

  const active = activeView === "meet" && !meetTutorialSeen;

  useEffect(() => {
    if (!active) return;
    const t = setTimeout(() => setStep(2), 2600);
    return () => clearTimeout(t);
  }, [active]);

  if (!active) return null;
  const dismiss = () => setMeetTutorialSeen(true);

  return (
    <Portal>
      <div className="fixed inset-0 z-[65] flex flex-col items-center justify-center gap-6 bg-ink/80 p-6 backdrop-blur-sm">
        {step === 1 ? (
          <div className="flex flex-col items-center gap-6 text-center">
            <div className="relative flex h-40 w-56 items-center justify-center">
              {/* satellite treats fanning out around the main treat, matching TreatThrower's layout.
                  Positioning transform lives on the outer span; animate-pop-in's own transform
                  keyframe lives on the inner span, so the two don't clobber each other. */}
              <span className="absolute" style={{ transform: "translate(-76px, -18px)" }}>
                <span className="animate-pop-in block text-3xl" style={{ animationDelay: "0.1s" }}>{TREATS.bird.emoji}</span>
              </span>
              <span className="absolute" style={{ transform: "translate(0px, -92px)" }}>
                <span className="animate-pop-in block text-3xl" style={{ animationDelay: "0.25s" }}>{TREATS.fish.emoji}</span>
              </span>
              <span className="absolute" style={{ transform: "translate(76px, -18px)" }}>
                <span className="animate-pop-in block text-3xl" style={{ animationDelay: "0.4s" }}>{TREATS.salad.emoji}</span>
              </span>
              <span className="animate-ring-pulse absolute h-16 w-16 rounded-full bg-sunny/60" />
              <span className="relative flex h-16 w-16 items-center justify-center rounded-full border-4 border-sunny bg-tangerine text-3xl shadow-xl">
                {TREATS.bone.emoji}
              </span>
            </div>
            <p className="max-w-xs text-lg font-extrabold text-white">
              Hold the treat to pick your flavor 🦴🌾🐟🥬
            </p>
            <p className="max-w-xs text-sm font-semibold text-white/70">
              Every pet loves a treat — the flavor's just for fun, it won't change what you catch.
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-6 text-center">
            <div className="relative flex h-40 w-40 items-center justify-center">
              <span className="absolute h-28 w-28 rounded-3xl border-4 border-dashed border-sunny/70" />
              <span className="animate-throw-arrow absolute text-4xl">⬆️</span>
              <span className="absolute bottom-2 text-4xl">🦴</span>
            </div>
            <p className="max-w-xs text-lg font-extrabold text-white">
              Drag &amp; release on the pet to capture them!
            </p>
            <p className="max-w-xs text-sm font-semibold text-white/70">
              Line up the treat over your furry friend and let go.
            </p>
          </div>
        )}

        <div className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${step === 1 ? "bg-sunny" : "bg-white/30"}`} />
          <span className={`h-2 w-2 rounded-full ${step === 2 ? "bg-sunny" : "bg-white/30"}`} />
        </div>

        <button
          type="button"
          onClick={dismiss}
          className="tappable rounded-full bg-grass px-8 py-3 font-extrabold text-white shadow-md"
        >
          Got it, let's go! 🐾
        </button>
      </div>
    </Portal>
  );
}
