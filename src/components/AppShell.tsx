"use client";

import { useEffect, useState } from "react";
import { useAppStore } from "@/lib/store";
import { initAuth, handleAuthPopupReturn } from "@/lib/auth";
import { grantPeriodicSnackIfNeeded } from "@/lib/economy";
import BottomNav from "@/components/BottomNav";
import CardReveal from "@/components/CardReveal";
import Welcome from "@/components/Welcome";
import Onboarding from "@/components/Onboarding";
import GuestImport from "@/components/GuestImport";
import AddPetsPrompt from "@/components/AddPetsPrompt";
import WelcomeBack from "@/components/WelcomeBack";
import MapView from "@/views/MapView";
import CollectionView from "@/views/CollectionView";
import CaptureView from "@/views/CaptureView";
import LeaderboardsView from "@/views/LeaderboardsView";
import ProfileView from "@/views/ProfileView";

/**
 * Single-page shell: the five views are swapped by Zustand state rather
 * than routes, so tab switches are instant and camera/map state survives
 * (views stay mounted, hidden with CSS).
 */
export default function AppShell() {
  const activeView = useAppStore((s) => s.activeView);
  const consentAccepted = useAppStore((s) => s.consentAccepted);
  const guestMode = useAppStore((s) => s.guestMode);
  const hasOnboarded = useAppStore((s) => s.hasOnboarded);
  const authUser = useAppStore((s) => s.authUser);
  const [ready, setReady] = useState(false);

  // Rehydrate the persisted store after mount (skipHydration avoids SSR
  // mismatch), then restore any Supabase session
  useEffect(() => {
    useAppStore.persist.rehydrate();
    handleAuthPopupReturn(); // OAuth popup closes itself after storing the session
    initAuth().finally(() => setReady(true));
  }, []);

  // The rolling 12h free Discovery Snack top-up, checked once the app is interactive
  useEffect(() => {
    if (ready && hasOnboarded) grantPeriodicSnackIfNeeded();
  }, [ready, hasOnboarded]);

  // Gate order: consent+sign-in → onboarding carousel → the game
  if (!ready) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-cream">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icons/icon-192.png" alt="PetDexter" className="animate-bob h-24 w-24 rounded-[24%] shadow-lg" />
      </div>
    );
  }
  if (!consentAccepted || (!authUser && !guestMode)) return <Welcome />;
  if (!hasOnboarded) return <Onboarding />;

  const views = [
    { key: "discover", node: <MapView /> },
    { key: "petdex", node: <CollectionView /> },
    { key: "meet", node: <CaptureView /> },
    { key: "play", node: <LeaderboardsView /> },
    { key: "me", node: <ProfileView /> },
  ] as const;

  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col">
      <main className="flex-1 pb-28">
        {views.map(({ key, node }) => (
          <section
            key={key}
            hidden={activeView !== key}
            className={activeView === key ? "animate-pop-in" : ""}
          >
            {node}
          </section>
        ))}
      </main>
      <BottomNav />
      <CardReveal />
      <GuestImport />
      <AddPetsPrompt />
      <WelcomeBack />
    </div>
  );
}
