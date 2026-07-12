import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

/** The five bottom-nav views. */
export type ViewKey = "map" | "collection" | "capture" | "leaderboards" | "profile";

export type Species = "dog" | "cat" | "rabbit" | "bird" | "other";

export type Rarity = "common" | "uncommon" | "rare" | "epic" | "legendary" | "mythic";

export interface PetCard {
  id: string;
  serialNumber: number;
  customName: string;
  species: Species;
  breed: string | null;
  rarity: Rarity;
  imageUrl: string;
  lat: number | null;
  lng: number | null;
  venueName: string | null;
  level: number;
  candy: number;
  stats: { chonkiness: number; friendliness: number; energy: number };
  /** L2-normalized DINOv2 embedding — kept locally for offline uniqueness checks */
  signature?: number[];
  /** Extra signatures from confirmed revisits (up to 3 viewing angles) */
  signatures?: number[][];
  /** Transparent sticker cutout (on-device background removal) */
  cutoutUrl?: string | null;
  /** false while the card is still "hatching" (background processing) */
  hatched?: boolean;
  /** index of the mystical backdrop revealed at hatch */
  backdrop?: number;
  createdAt: string;
}

export interface CheckedInVenue {
  id: string;
  name: string;
  distanceM: number;
}

export type CaptureOutcomeState =
  | { outcome: "new_discovery"; card: PetCard; xp: number }
  | { outcome: "revisit"; cardId: string; level: number; candy: number; xp: number }
  | null;

/**
 * A capture in flight. Created the moment classification passes (fast), so
 * the catch minigame starts immediately; the cutout and the uniqueness
 * verdict stream in while the player plays.
 */
export interface CaptureFlow {
  photoUrl: string;
  status: "brewing" | "carded" | "rejected";
  reason?: string;
  card?: PetCard;
}

/** A champion drawn for a Steal War (own card or the rival's snapshot). */
export interface BattleChampion {
  name: string;
  species: Species;
  rarity: Rarity;
  power: number;
  imageUrl: string | null;
  cutoutUrl?: string | null;
}

/** An active Steal War over a contested pet. */
export interface BattleState {
  contested: PetCard;
  rivalName: string;
  venueName: string;
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

  // ⚔️ Steal War in progress
  activeBattle: BattleState | null;
  setActiveBattle: (battle: BattleState | null) => void;

  // Trainer XP (persisted)
  userXp: number;
  addXp: (amount: number) => void;

  // 🥫 Game economy (persisted)
  cans: { count: number; lastRefillAt: number };
  setCans: (cans: { count: number; lastRefillAt: number }) => void;
  coins: number;
  addCoins: (n: number) => void;
  treats: number;
  addTreats: (n: number) => void;
  streakDays: number;
  lastCatchDay: string | null;
  registerCatch: (dayKey: string) => void;
  claimedAchievements: string[];
  claimAchievement: (id: string) => void;
  adCoinsDay: string | null;
  setAdCoinsDay: (day: string) => void;

  // The capture currently in flight / being revealed
  captureFlow: CaptureFlow | null;
  setCaptureFlow: (flow: CaptureFlow | null) => void;
  patchCaptureFlow: (patch: Partial<CaptureFlow>) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      activeView: "map",
      setActiveView: (view) => set({ activeView: view }),

      consentAccepted: false,
      setConsentAccepted: (consentAccepted) => set({ consentAccepted }),
      guestMode: false,
      setGuestMode: (guestMode) => set({ guestMode }),
      hasOnboarded: false,
      setHasOnboarded: (hasOnboarded) => set({ hasOnboarded }),
      guestImportDoneFor: null,
      setGuestImportDoneFor: (guestImportDoneFor) => set({ guestImportDoneFor }),

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

      activeBattle: null,
      setActiveBattle: (activeBattle) => set({ activeBattle }),

      userXp: 0,
      addXp: (amount) => set((s) => ({ userXp: s.userXp + amount })),

      cans: { count: 4, lastRefillAt: Date.now() },
      setCans: (cans) => set({ cans }),
      coins: 0,
      addCoins: (n) => set((s) => ({ coins: Math.max(0, s.coins + n) })),
      treats: 0,
      addTreats: (n) => set((s) => ({ treats: Math.max(0, s.treats + n) })),
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
      adCoinsDay: null,
      setAdCoinsDay: (adCoinsDay) => set({ adCoinsDay }),

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
        userXp: s.userXp,
        consentAccepted: s.consentAccepted,
        guestMode: s.guestMode,
        hasOnboarded: s.hasOnboarded,
        guestImportDoneFor: s.guestImportDoneFor,
        cans: s.cans,
        coins: s.coins,
        treats: s.treats,
        streakDays: s.streakDays,
        lastCatchDay: s.lastCatchDay,
        claimedAchievements: s.claimedAchievements,
        adCoinsDay: s.adCoinsDay,
      }),
      // Rehydrated manually in AppShell after mount to avoid SSR mismatch
      skipHydration: true,
    }
  )
);
