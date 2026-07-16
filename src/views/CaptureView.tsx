"use client";

import { useEffect, useRef, useState } from "react";
import { useAppStore } from "@/lib/store";
import { preloadModels, grabFrame, classifyFrame, imageToDataUrl } from "@/lib/vision";
import { startCapture, finalizeCapture } from "@/lib/capture";
import { spendSnack, refundSnack, grantSnacks } from "@/lib/economy";
import FullScreenAd from "@/components/FullScreenAd";
import TreatThrower from "@/components/TreatThrower";
import CaptureTutorial from "@/components/CaptureTutorial";

const REJECT_MESSAGES: Record<string, string> = {
  screen_detected: "That looks like a screen! 📺 PetDexter only counts real-life friends.",
  no_animal: "No pet in the shot! 🔍 Aim the treat at a dog, cat, rabbit, or bird.",
  no_snacks: "Out of Discovery Snacks! 🍬 Watch an ad for a bonus snack, or wait for your next free top-up.",
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
 * Meet! view — throw a treat at the pet on the live camera to meet them.
 * The card appears within ~5s; the cutout/re-identification finishes in
 * the background afterwards. The thrown item's flavor (bone/bird feed/
 * fish/salad leaf, picked via TreatThrower's hold-to-choose picker) is
 * purely cosmetic — species is always determined by on-device image
 * analysis, never by which treat was thrown.
 */
export default function CaptureView() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const activeView = useAppStore((s) => s.activeView);
  const checkedInVenue = useAppStore((s) => s.checkedInVenue);
  const setCaptureFlow = useAppStore((s) => s.setCaptureFlow);
  const patchCaptureFlow = useAppStore((s) => s.patchCaptureFlow);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState<string | null>(null);
  const [showAd, setShowAd] = useState(false);
  const snacks = useAppStore((s) => s.snacks);

  useEffect(() => {
    if (activeView !== "meet") return;
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
        setCameraError("Camera unavailable — allow camera access to meet pets!");
      }
    })();
    return () => stream?.getTracks().forEach((t) => t.stop());
  }, [activeView]);

  /** The treat landed → snap the frame and run the 2s brew + fast card. */
  async function throwCapture(dataUrl: string) {
    if (!spendSnack()) {
      setRejectReason("no_snacks");
      return;
    }
    setRejectReason(null);
    setCaptureFlow({ photoUrl: dataUrl, status: "brewing" });
    const brew = new Promise((r) => setTimeout(r, 2000)); // minimum brew time
    try {
      const [scan] = await Promise.all([classifyFrame(dataUrl), brew]);
      if (!scan.ok) {
        refundSnack(); // no capture landed — the thrown treat shouldn't cost the player
        patchCaptureFlow({ status: "rejected", reason: scan.reason ?? "error" });
        return;
      }
      const card = startCapture(dataUrl, scan.species, scan.breed);
      patchCaptureFlow({ status: "carded", card });
      // finish processing in the background — no waiting
      finalizeCapture(card);
    } catch {
      refundSnack();
      patchCaptureFlow({ status: "rejected", reason: "error" });
    }
  }

  function handleTreatThrow() {
    const video = videoRef.current;
    if (video && video.readyState >= 2) throwCapture(grabFrame(video));
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
          <h1 className="text-3xl font-extrabold text-ink">Meet a Pet! 📸</h1>
          <p className="text-ink/60">Throw a treat at a real animal to meet them.</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <button type="button" onClick={() => setShowAd(true)}
            className="tappable rounded-full bg-white px-3 py-1.5 text-sm font-extrabold shadow-md">
            🍬 {snacks}
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
          🎯 Drag the treat onto the pet to meet them!
        </div>
      </div>

      <TreatThrower zoneRef={frameRef} onThrow={handleTreatThrow} />

      {rejectReason === "no_snacks" ? (
        <div className="animate-pop-in flex flex-col items-center gap-2.5 rounded-2xl bg-tangerine/20 px-4 py-3 text-center">
          <p className="font-bold text-tangerine-deep">{REJECT_MESSAGES.no_snacks}</p>
          <button
            type="button"
            onClick={() => setShowAd(true)}
            className="tappable flex items-center gap-2 rounded-full bg-tangerine px-5 py-2.5 text-sm font-extrabold text-white shadow-md"
          >
            ▶️ Tap to watch an ad for +1 snack
          </button>
        </div>
      ) : rejectReason ? (
        <p className="animate-pop-in rounded-2xl bg-tangerine/20 px-4 py-3 text-center font-bold text-tangerine-deep">
          {REJECT_MESSAGES[rejectReason]}
        </p>
      ) : null}

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
      </section>

      {showAd && (
        <FullScreenAd
          onFinish={() => {
            grantSnacks(1);
            setShowAd(false);
            setRejectReason(null);
          }}
        />
      )}

      <CaptureTutorial />
    </div>
  );
}
