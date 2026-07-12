"use client";

import { useEffect, useRef, useState } from "react";
import { useAppStore } from "@/lib/store";
import { preloadModels, grabFrame, classifyFrame, imageToDataUrl } from "@/lib/vision";
import { startCapture, finalizeCapture } from "@/lib/capture";
import { startDemoBattle } from "@/lib/battle";
import { currentCans, spendCan, formatDuration, grantCans, MAX_CANS } from "@/lib/economy";
import RewardedAd from "@/components/RewardedAd";

const REJECT_MESSAGES: Record<string, string> = {
  screen_detected: "That looks like a screen! 📺 PetCatch only counts real-life friends.",
  no_animal: "No pet in the shot! 🔍 Aim the treat at a dog, cat, rabbit, or bird.",
  no_cans: "Out of snack cans! 🥫 Wait for a refill or watch an ad for a bonus can.",
  error: "The treat missed! 😵 Give it another toss.",
};

const DEMO_PETS = [
  { src: "/demo/dog.jpg", emoji: "🐶", label: "Corgi" },
  { src: "/demo/dog2.jpg", emoji: "🐶", label: "Corgi again" },
  { src: "/demo/cat.jpg", emoji: "🐱", label: "Cat" },
  { src: "/demo/bird.jpg", emoji: "🐦", label: "Macaw" },
  { src: "/demo/rabbit.jpg", emoji: "🐰", label: "Bunny" },
];
const DEMO_CENTER = { lat: 14.5995, lng: 120.9842 };

/**
 * Capture view — throw the treat at the pet on the live camera to snap it.
 * The card appears within ~5s; heavy AI (cutout, re-identification,
 * server sync) "hatches" in the background afterwards.
 */
export default function CaptureView() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const activeView = useAppStore((s) => s.activeView);
  const checkedInVenue = useAppStore((s) => s.checkedInVenue);
  const setCaptureFlow = useAppStore((s) => s.setCaptureFlow);
  const patchCaptureFlow = useAppStore((s) => s.patchCaptureFlow);
  const collection = useAppStore((s) => s.collection);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState<string | null>(null);
  const [showAd, setShowAd] = useState(false);
  const cansState = useAppStore((s) => s.cans);
  void cansState;
  const { count: canCount, nextRefillMs } = currentCans();

  // treat drag
  const [drag, setDrag] = useState<{ dx: number; dy: number } | null>(null);
  const dragOrigin = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (activeView !== "capture") return;
    let stream: MediaStream | undefined;
    preloadModels();
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" }, audio: false,
        });
        if (videoRef.current) videoRef.current.srcObject = stream;
        setCameraError(null);
      } catch {
        setCameraError("Camera unavailable — allow camera access to catch pets!");
      }
    })();
    return () => stream?.getTracks().forEach((t) => t.stop());
  }, [activeView]);

  /** The treat landed → snap the frame and run the 2s brew + fast card. */
  async function throwCapture(dataUrl: string) {
    if (!spendCan()) {
      setRejectReason("no_cans");
      return;
    }
    setRejectReason(null);
    setCaptureFlow({ photoUrl: dataUrl, status: "brewing" });
    const brew = new Promise((r) => setTimeout(r, 2000)); // minimum brew time
    try {
      const [scan] = await Promise.all([classifyFrame(dataUrl), brew]);
      if (!scan.ok) {
        patchCaptureFlow({ status: "rejected", reason: scan.reason ?? "error" });
        return;
      }
      const card = startCapture(dataUrl, scan.species, scan.breed);
      patchCaptureFlow({ status: "carded", card });
      // hatch in the background — no waiting
      finalizeCapture(card);
    } catch {
      patchCaptureFlow({ status: "rejected", reason: "error" });
    }
  }

  function onTreatDown(e: React.PointerEvent) {
    try { (e.target as HTMLElement).setPointerCapture(e.pointerId); } catch {}
    dragOrigin.current = { x: e.clientX, y: e.clientY };
    setDrag({ dx: 0, dy: 0 });
  }
  function onTreatMove(e: React.PointerEvent) {
    if (!dragOrigin.current) return;
    setDrag({ dx: e.clientX - dragOrigin.current.x, dy: e.clientY - dragOrigin.current.y });
  }
  function onTreatUp(e: React.PointerEvent) {
    if (!dragOrigin.current) return;
    const zone = frameRef.current?.getBoundingClientRect();
    const hit = zone && e.clientX >= zone.left && e.clientX <= zone.right &&
      e.clientY >= zone.top && e.clientY <= zone.bottom;
    dragOrigin.current = null;
    setDrag(null);
    const video = videoRef.current;
    if (hit && video && video.readyState >= 2) throwCapture(grabFrame(video));
  }

  async function handleDemoThrow(src: string) {
    useAppStore.getState().setPosition({
      lat: DEMO_CENTER.lat + (Math.random() - 0.5) * 0.02,
      lng: DEMO_CENTER.lng + (Math.random() - 0.5) * 0.02,
    });
    throwCapture(await imageToDataUrl(src));
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-ink">Catch a Pet! 📸</h1>
          <p className="text-ink/60">Throw the treat at a real animal to snap it.</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <button type="button" onClick={() => canCount < MAX_CANS && setShowAd(true)}
            className="tappable rounded-full bg-white px-3 py-1.5 text-sm font-extrabold shadow-md">
            🥫 {canCount}/{MAX_CANS}
            {nextRefillMs != null && (
              <span className="ml-1 text-[10px] font-bold text-ink/40">+1 in {formatDuration(nextRefillMs)}</span>
            )}
          </button>
          {checkedInVenue && (
            <span className="animate-pop-in rounded-full bg-grass px-3 py-1 text-xs font-bold text-white">
              📍 {checkedInVenue.name}
            </span>
          )}
        </div>
      </header>

      <div ref={frameRef} className="relative aspect-[3/4] overflow-hidden rounded-card bg-ink shadow-lg">
        <video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-cover" />
        {cameraError && (
          <div className="absolute inset-0 flex items-center justify-center p-6 text-center font-bold text-white">
            {cameraError}
          </div>
        )}
        <div className="pointer-events-none absolute inset-8 rounded-[2rem] border-4 border-dashed border-sunny/80" />
        <div className="pointer-events-none absolute inset-x-0 bottom-3 text-center text-xs font-bold text-white/80">
          🎯 Drag the treat onto the pet to catch it!
        </div>
      </div>

      <button
        type="button"
        aria-label="Treat — drag onto the camera to capture"
        onPointerDown={onTreatDown}
        onPointerMove={onTreatMove}
        onPointerUp={onTreatUp}
        className={`mx-auto flex h-20 w-20 touch-none items-center justify-center rounded-full border-8 border-sunny bg-tangerine text-4xl shadow-xl ${drag ? "" : "transition-transform"}`}
        style={drag ? { transform: `translate(${drag.dx}px, ${drag.dy}px) scale(1.2)` } : undefined}
      >
        🥫
      </button>

      {rejectReason && (
        <p className="animate-pop-in rounded-2xl bg-tangerine/20 px-4 py-3 text-center font-bold text-tangerine-deep">
          {REJECT_MESSAGES[rejectReason]}
        </p>
      )}

      <section className="rounded-card bg-white p-4 shadow-md">
        <h2 className="font-extrabold">🧪 Demo throws</h2>
        <p className="mb-3 text-xs text-ink/50">No pet nearby? Toss a treat at a sample photo.</p>
        <div className="flex gap-3">
          {DEMO_PETS.map((pet) => (
            <button key={pet.src} type="button" onClick={() => handleDemoThrow(pet.src)}
              className="tappable flex flex-1 flex-col items-center gap-1">
              <span className="relative block h-14 w-14 overflow-hidden rounded-2xl border-4 border-sunny">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={pet.src} alt={pet.label} className="h-full w-full object-cover" />
              </span>
              <span className="text-[10px] font-bold text-ink/60">{pet.emoji} {pet.label}</span>
            </button>
          ))}
        </div>
        <button
          type="button"
          disabled={collection.length === 0}
          onClick={() => startDemoBattle(collection[Math.floor(Math.random() * collection.length)])}
          className="tappable mt-3 w-full rounded-full bg-tangerine px-4 py-3 font-extrabold text-white shadow-md disabled:opacity-40"
        >
          ⚔️ Rival Steal War (demo)
        </button>
      </section>

      {showAd && (
        <RewardedAd rewardLabel="1 snack can" onComplete={() => grantCans(1)} onClose={() => setShowAd(false)} />
      )}
    </div>
  );
}
