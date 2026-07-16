import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { TreatType } from "@/lib/treats";

/** The five bottom-nav views (PetDexter V2 IA — see PetDexter_V2_Implementation_Plan.md §1). */
export type ViewKey = "discover" | "petdex" | "meet" | "play" | "me";

export type Species = "dog" | "cat" | "rabbit" | "bird" | "other";

/**
 * One dated meeting with a pet — the local stand-in for the spec's
 * `encounters` table (§34) until the real per-user Encounter/canonical-Pet
 * schema is live on the backend (Phase 1 migration, not yet executed).
 */
export interface Encounter {
  date: string; // ISO timestamp
  lat: number | null;
  lng: number | null;
  venueName: string | null;
}

/**
 * A pet card in the PetDex — either a pet the user owns ("My Pet", spec §4)
 * or a pet they've met out in the world ("Pets Met"). Interim (Phase 1)
 * shape: still one local record per pet rather than a full canonical
 * Pet + Encounter split, but every meeting is now logged individually so
 * Familiarity (§13) can be computed from real history instead of a counter.
 * No field here implies a real pet has random worth, combat power, or can
 * be lost through play.
 */
export interface PetCard {
  id: string;
  serialNumber: number;
  /** The pet's name — either entered by the user or a suggested placeholder nickname. */
  customName: string;
  /** True once a real name has been entered/confirmed (vs. an auto-suggested nickname). */
  nameConfirmed?: boolean;
  species: Species;
  breed: string | null;
  /** Up to 3 owner/community-entered traits (e.g. "Playful", "Shy"). */
  traits: string[];
  imageUrl: string;
  lat: number | null;
  lng: number | null;
  venueName: string | null;
  /** True for a pet the user registered as their own (spec §4 "My Pet"); false for a pet met out in the world. */
  owned?: boolean;
  /** Every dated meeting with this pet, oldest first. My Pets start with none. */
  encounters: Encounter[];
  /** Set when this card arrived via a Pet Family QR connection (spec §15) — the sharing parent's display name. */
  connectedFrom?: string;
  /** The remote pet_profiles.id, once an owned pet has been synced to Supabase (needed for QR sharing). */
  remoteId?: string;
  /** L2-normalized DINOv2 embedding — kept locally for offline recognition. */
  signature?: number[];
  /** Extra signatures from confirmed reunions (up to 3 viewing angles). */
  signatures?: number[][];
  /** Transparent sticker cutout (on-device background removal). */
  cutoutUrl?: string | null;
  /** false while the card art is still being processed in the background. */
  hatched?: boolean;
  /** index of the card backdrop. */
  backdrop?: number;
  createdAt: string;
}

export interface CheckedInVenue {
  id: string;
  name: string;
  distanceM: number;
}

/**
 * Reward outcome once background processing resolves — decoupled from the
 * instant card reveal. Mirrors the spec's capture/identification result
 * table: a same-day re-meeting is recognized but never mints extra unique
 * value, and a reunion just appends to the same pet's history.
 */
export type CaptureResolution =
  | { kind: "new"; points: number }
  | { kind: "reunion"; points: number; encounterCount: number }
  | { kind: "same_day" }
  | { kind: "error" };

/**
 * A capture in flight. Created the moment classification passes (fast), so
 * the reveal starts immediately; the cutout and match/reward resolution
 * stream in while the card is already on screen.
 */
export interface CaptureFlow {
  photoUrl: string;
  status: "brewing" | "carded" | "rejected";
  reason?: string;
  card?: PetCard;
  resolution?: CaptureResolution;
}

export interface AuthUser {
  id: string;
  email: string | null;
  name: string | null;
}

interface AppState {
  // Navigation
  activeView: ViewKey;
  setActiveView: (view: ViewKey) => void;

  // Entry gates (persisted)
  consentAccepted: boolean;
  setConsentAccepted: (v: boolean) => void;
  guestMode: boolean;
  setGuestMode: (v: boolean) => void;
  hasOnboarded: boolean;
  setHasOnboarded: (v: boolean) => void;
  /** User id whose guest-catch import prompt has been handled (one-time). */
  guestImportDoneFor: string | null;
  setGuestImportDoneFor: (userId: string | null) => void;
  /** True once the one-time "add your own pets" prompt has been shown/dismissed. */
  myPetsPromptSeen: boolean;
  setMyPetsPromptSeen: (v: boolean) => void;
  /** True once the one-time Meet! capture tutorial (treats + throw) has been shown. */
  meetTutorialSeen: boolean;
  setMeetTutorialSeen: (v: boolean) => void;

  // The currently-selected treat flavor — cosmetic only (persisted)
  selectedTreat: TreatType;
  setSelectedTreat: (t: TreatType) => void;

  // Auth session (memory only — Supabase persists its own session)
  authUser: AuthUser | null;
  setAuthUser: (u: AuthUser | null) => void;

  // Geolocation
  position: { lat: number; lng: number } | null;
  setPosition: (position: { lat: number; lng: number } | null) => void;

  // B2B venue check-in
  checkedInVenue: CheckedInVenue | null;
  setCheckedInVenue: (venue: CheckedInVenue | null) => void;

  // The user's PetDex (persisted)
  collection: PetCard[];
  setCollection: (cards: PetCard[]) => void;
  addCard: (card: PetCard) => void;
  updateCard: (id: string, patch: Partial<PetCard>) => void;
  removeCard: (id: string) => void;

  // Paw Points — single progression currency (persisted)
  pawPoints: number;
  addPawPoints: (amount: number) => void;

  // 🍬 Discovery Snacks — capture cost, flat daily grant (persisted)
  snacks: number;
  setSnacks: (n: number) => void;
  lastSnackGrantDay: string | null;
  setLastSnackGrantDay: (day: string) => void;
  adSnackDay: string | null;
  setAdSnackDay: (day: string) => void;

  streakDays: number;
  lastCatchDay: string | null;
  registerCatch: (dayKey: string) => void;
  claimedAchievements: string[];
  claimAchievement: (id: string) => void;

  // The capture currently in flight / being revealed
  captureFlow: CaptureFlow | null;
  setCaptureFlow: (flow: CaptureFlow | null) => void;
  patchCaptureFlow: (patch: Partial<CaptureFlow>) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      activeView: "discover",
      setActiveView: (view) => set({ activeView: view }),

      consentAccepted: false,
      setConsentAccepted: (consentAccepted) => set({ consentAccepted }),
      guestMode: false,
      setGuestMode: (guestMode) => set({ guestMode }),
      hasOnboarded: false,
      setHasOnboarded: (hasOnboarded) => set({ hasOnboarded }),
      guestImportDoneFor: null,
      setGuestImportDoneFor: (guestImportDoneFor) => set({ guestImportDoneFor }),
      myPetsPromptSeen: false,
      setMyPetsPromptSeen: (myPetsPromptSeen) => set({ myPetsPromptSeen }),
      meetTutorialSeen: false,
      setMeetTutorialSeen: (meetTutorialSeen) => set({ meetTutorialSeen }),

      selectedTreat: "bone",
      setSelectedTreat: (selectedTreat) => set({ selectedTreat }),

      authUser: null,
      setAuthUser: (authUser) => set({ authUser }),

      position: null,
      setPosition: (position) => set({ position }),

      checkedInVenue: null,
      setCheckedInVenue: (checkedInVenue) => set({ checkedInVenue }),

      collection: [],
      setCollection: (collection) => set({ collection }),
      addCard: (card) => set((s) => ({ collection: [card, ...s.collection] })),
      updateCard: (id, patch) =>
        set((s) => ({
          collection: s.collection.map((c) => (c.id === id ? { ...c, ...patch } : c)),
        })),
      removeCard: (id) =>
        set((s) => ({ collection: s.collection.filter((c) => c.id !== id) })),

      pawPoints: 0,
      addPawPoints: (amount) => set((s) => ({ pawPoints: Math.max(0, s.pawPoints + amount) })),

      snacks: 0,
      setSnacks: (n) => set({ snacks: Math.max(0, n) }),
      lastSnackGrantDay: null,
      setLastSnackGrantDay: (lastSnackGrantDay) => set({ lastSnackGrantDay }),
      adSnackDay: null,
      setAdSnackDay: (adSnackDay) => set({ adSnackDay }),

      streakDays: 0,
      lastCatchDay: null,
      registerCatch: (dayKey) =>
        set((s) => {
          if (s.lastCatchDay === dayKey) return {};
          const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
          return {
            lastCatchDay: dayKey,
            streakDays: s.lastCatchDay === yesterday ? s.streakDays + 1 : 1,
          };
        }),
      claimedAchievements: [],
      claimAchievement: (id) =>
        set((s) =>
          s.claimedAchievements.includes(id)
            ? {}
            : { claimedAchievements: [...s.claimedAchievements, id] }
        ),

      captureFlow: null,
      setCaptureFlow: (captureFlow) => set({ captureFlow }),
      patchCaptureFlow: (patch) =>
        set((s) => (s.captureFlow ? { captureFlow: { ...s.captureFlow, ...patch } } : {})),
    }),
    {
      name: "petcatch-store",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        collection: s.collection,
        pawPoints: s.pawPoints,
        consentAccepted: s.consentAccepted,
        guestMode: s.guestMode,
        hasOnboarded: s.hasOnboarded,
        guestImportDoneFor: s.guestImportDoneFor,
        snacks: s.snacks,
        lastSnackGrantDay: s.lastSnackGrantDay,
        adSnackDay: s.adSnackDay,
        streakDays: s.streakDays,
        lastCatchDay: s.lastCatchDay,
        claimedAchievements: s.claimedAchievements,
        myPetsPromptSeen: s.myPetsPromptSeen,
        meetTutorialSeen: s.meetTutorialSeen,
        selectedTreat: s.selectedTreat,
      }),
      // Rehydrated manually in AppShell after mount to avoid SSR mismatch
      skipHydration: true,
      version: 3,
      /**
       * Normalizes every persisted card to the CURRENT PetCard shape,
       * regardless of how old it is — including cards from the original
       * pre-Phase-0 build (rarity/stats/candy era) that predate fields like
       * `traits` and `encounters` entirely. Deliberately re-derives every
       * field from scratch rather than only patching what v1→v2 touched:
       * an earlier version of this function only backfilled `encounters`,
       * left `traits` undefined on very old cards, and — since it only ran
       * once per version bump — silently stayed broken for anyone who'd
       * already been migrated to "version 2", causing a hard crash
       * (`card.traits.includes` on undefined) when opening such a card.
       * This version is intentionally idempotent/safe to rerun on
       * already-current data, so bumping the version number here is
       * always a safe way to force every client to re-normalize.
       */
      migrate: (persisted) => {
        const state = persisted as { collection?: Array<Record<string, unknown>> };
        if (Array.isArray(state?.collection)) {
          state.collection = state.collection.map((c) => {
            const legacyCount = typeof c.encounterCount === "number" ? c.encounterCount : 1;
            const lastMetAt = typeof c.lastMetAt === "string" ? c.lastMetAt : (c.createdAt as string);
            const encounters = Array.isArray(c.encounters)
              ? c.encounters
              : Array.from({ length: Math.max(1, legacyCount) }, () => ({
                  date: lastMetAt, lat: c.lat ?? null, lng: c.lng ?? null, venueName: c.venueName ?? null,
                }));
            const { encounterCount: _ec, lastMetAt: _lm, ...rest } = c;
            return {
              ...rest,
              traits: Array.isArray(c.traits) ? c.traits : [],
              owned: typeof c.owned === "boolean" ? c.owned : false,
              hatched: typeof c.hatched === "boolean" ? c.hatched : true,
              backdrop: typeof c.backdrop === "number" ? c.backdrop : 0,
              encounters,
            };
          });
        }
        return state;
      },
    }
  )
);
