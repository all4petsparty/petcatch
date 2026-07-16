"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useAppStore, type Species, type PetCard } from "@/lib/store";
import { preloadModels, grabFrame, classifyFrame } from "@/lib/vision";
import { syncOwnedPetToSupabase } from "@/lib/connections";
import { SPECIES_EMOJI } from "@/components/icons";
import TreatThrower from "@/components/TreatThrower";

const SPECIES_OPTIONS: Species[] = ["dog", "cat", "rabbit", "bird", "other"];
const TRAIT_OPTIONS = [
  "Playful", "Shy", "Cuddly", "Zoomy", "Sleepy", "Chatty", "Gentle", "Curious", "Food-motivated",
];

/**
 * Camera-based "Add My Pet" (spec §4/§5 My Pet, plus the throw-a-treat
 * capture gesture the user loves — reused here for personal pets too).
 * Same live camera + treat-throw as Meet!, but: no Discovery Snack is
 * spent, there's no species/community matching pipeline, and after the
 * photo lands the user goes straight to a details form instead of the
 * reward-reveal card, since a My Pet has nothing to "discover."
 */
export default function CaptureMyPet({ onClose }: { onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const addCard = useAppStore((s) => s.addCard);
  const collection = useAppStore((s) => s.collection);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // step 2: details form, once a photo is captured
  const [photo, setPhoto] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [species, setSpecies] = useState<Species>("dog");
  const [breed, setBreed] = useState("");
  const [traits, setTraits] = useState<string[]>([]);

  useEffect(() => {
    if (photo) return; // camera not needed once we're on the details step
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
        setCameraError("Camera unavailable — allow camera access to capture your pet!");
      }
    })();
    return () => stream?.getTracks().forEach((t) => t.stop());
  }, [photo]);

  async function handleThrow(dataUrl: string) {
    setPhoto(dataUrl);
    // best-effort species guess to pre-fill the form — never rejects: it's the user's own pet
    try {
      const scan = await classifyFrame(dataUrl);
      if (scan.species) setSpecies(scan.species);
      if (scan.breed) setBreed(scan.breed);
    } catch {
      // classifier unavailable — user can still pick species manually below
    }
  }

  function handleTreatThrow() {
    const video = videoRef.current;
    if (video && video.readyState >= 2) handleThrow(grabFrame(video));
  }

  function toggleTrait(t: string) {
    setTraits((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t].slice(0, 3)));
  }

  function handleSave() {
    const trimmed = name.trim();
    if (!trimmed || !photo) return;
    const card: PetCard = {
      id: crypto.randomUUID(),
      serialNumber: collection.reduce((m, c) => Math.max(m, c.serialNumber), 0) + 1,
      customName: trimmed,
      nameConfirmed: true,
      species,
      breed: breed.trim() || null,
      traits,
      imageUrl: photo,
      lat: null, lng: null, venueName: null,
      owned: true,
      encounters: [],
      hatched: true,
      backdrop: Math.floor(Math.random() * 4),
      createdAt: new Date().toISOString(),
    };
    addCard(card);
    syncOwnedPetToSupabase(card); // background — no-ops if signed out
    onClose();
  }

  if (typeof document === "undefined") return null;

  // ---- Step 2: details form (photo already captured) ----
  if (photo) {
    return createPortal(
      <div className="fixed inset-0 z-[75] flex items-end justify-center bg-ink/60 backdrop-blur-sm" onClick={onClose}>
        <div
          className="animate-pop-in max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-card bg-white p-5 pb-8 shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-ink/15" />
          <h2 className="mb-1 text-2xl font-extrabold">Nice shot! 📸</h2>
          <p className="mb-4 text-sm text-ink/50">Now tell us about them — this is free, no Discovery Snack spent.</p>

          <div className="mx-auto mb-4 h-40 w-40 overflow-hidden rounded-3xl border-4 border-sunny shadow-md">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photo} alt="Captured" className="h-full w-full object-cover" />
          </div>

          <label className="mb-3 block">
            <span className="mb-1 block text-xs font-extrabold uppercase tracking-widest text-ink/40">Name</span>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Their name"
              className="w-full rounded-full border-2 border-sunny bg-cream px-4 py-3 font-bold outline-none focus:border-tangerine"
            />
          </label>

          <div className="mb-3">
            <span className="mb-1 block text-xs font-extrabold uppercase tracking-widest text-ink/40">Species</span>
            <div className="flex flex-wrap gap-2">
              {SPECIES_OPTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSpecies(s)}
                  className={`tappable rounded-full px-3 py-2 text-sm font-bold ${
                    species === s ? "bg-tangerine text-white" : "bg-cream text-ink/60"
                  }`}
                >
                  {SPECIES_EMOJI[s]} {s[0].toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <label className="mb-3 block">
            <span className="mb-1 block text-xs font-extrabold uppercase tracking-widest text-ink/40">Breed (optional)</span>
            <input
              value={breed}
              onChange={(e) => setBreed(e.target.value)}
              placeholder="e.g. Pembroke Corgi"
              className="w-full rounded-full border-2 border-sunny bg-cream px-4 py-3 font-bold outline-none focus:border-tangerine"
            />
          </label>

          <div className="mb-5">
            <span className="mb-1 block text-xs font-extrabold uppercase tracking-widest text-ink/40">Traits (up to 3, optional)</span>
            <div className="flex flex-wrap gap-1.5">
              {TRAIT_OPTIONS.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => toggleTrait(t)}
                  className={`tappable rounded-full px-2.5 py-1 text-xs font-bold ${
                    traits.includes(t) ? "bg-grass text-white" : "bg-cream text-ink/50"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <button type="button" onClick={() => setPhoto(null)} className="tappable flex-1 rounded-full bg-cream px-4 py-3 font-extrabold text-ink shadow-sm">
              Retake
            </button>
            <button
              type="button"
              disabled={!name.trim()}
              onClick={handleSave}
              className="tappable flex-1 rounded-full bg-grass px-4 py-3 font-extrabold text-white shadow-md disabled:opacity-40"
            >
              Save Pet 🐾
            </button>
          </div>
        </div>
      </div>,
      document.body
    );
  }

  // ---- Step 1: camera + throw-treat gesture ----
  return createPortal(
    <div className="fixed inset-0 z-[75] flex flex-col gap-4 overflow-y-auto bg-cream p-4" onClick={(e) => e.stopPropagation()}>
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-ink">Add My Pet 🏠</h1>
          <p className="text-sm text-ink/60">Throw a treat at your pet to snap their photo — free, no snacks spent.</p>
        </div>
        <button type="button" onClick={onClose} aria-label="Cancel"
          className="tappable flex h-10 w-10 items-center justify-center rounded-full bg-white text-lg font-extrabold shadow-md">
          ✕
        </button>
      </header>

      <div ref={frameRef} className="relative aspect-[3/4] overflow-hidden rounded-card bg-ink shadow-lg">
        <video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-cover" />
        {cameraError && (
          <div className="absolute inset-0 flex items-center justify-center p-6 text-center font-bold text-white">
            {cameraError}
          </div>
        )}
        <div className="pointer-events-none absolute inset-8 rounded-[2rem] border-4 border-dashed border-bubblegum/80" />
        <div className="pointer-events-none absolute inset-x-0 bottom-3 text-center text-xs font-bold text-white/80">
          🎯 Drag the treat onto your pet to capture!
        </div>
      </div>

      <TreatThrower zoneRef={frameRef} onThrow={handleTreatThrow} />
    </div>,
    document.body
  );
}
