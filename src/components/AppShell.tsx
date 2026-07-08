"use client";

import { useEffect, useState } from "react";
import { useAppStore } from "@/lib/store";
import { initAuth } from "@/lib/auth";
import BottomNav from "@/components/BottomNav";
import CardReveal from "@/components/CardReveal";
import BattleArena from "@/components/BattleArena";
import Welcome from "@/components/Welcome";
import Onboarding from "@/components/Onboarding";
import GuestImport from "@/components/GuestImport";
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
    initAuth().finally(() => setReady(true));
  }, []);

  // Gate order: consent+sign-in → onboarding carousel → the game
  if (!ready) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-cream">
        <span className="animate-bob text-6xl">🐾</span>
      </div>
    );
  }
  if (!consentAccepted || (!authUser && !guestMode)) return <Welcome />;
  if (!hasOnboarded) return <Onboarding />;

  const views = [
    { key: "map", node: <MapView /> },
    { key: "collection", node: <CollectionView /> },
    { key: "capture", node: <CaptureView /> },
    { key: "leaderboards", node: <LeaderboardsView /> },
    { key: "profile", node: <ProfileView /> },
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
      <BattleArena />
      <GuestImport />
    </div>
  );
}
