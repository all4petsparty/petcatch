"use client";

import { useState } from "react";
import { useAppStore } from "@/lib/store";
import { importGuestCatches, type ImportResult } from "@/lib/importGuest";

/**
 * One-time prompt after first sign-in: migrate guest-mode catches into the
 * account. Either choice marks the prompt handled for this user.
 */
export default function GuestImport() {
  const authUser = useAppStore((s) => s.authUser);
  const collection = useAppStore((s) => s.collection);
  const guestImportDoneFor = useAppStore((s) => s.guestImportDoneFor);
  const setGuestImportDoneFor = useAppStore((s) => s.setGuestImportDoneFor);

  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);

  const eligible =
    authUser && collection.length > 0 && guestImportDoneFor !== authUser.id;
  if (!eligible) return null;

  const finish = () => setGuestImportDoneFor(authUser.id);

  async function handleImport() {
    setProgress({ done: 0, total: collection.length });
    try {
      const r = await importGuestCatches((done, total) => setProgress({ done, total }));
      setResult(r);
    } catch {
      setResult({ imported: 0, merged: 0, skipped: collection.length });
    }
    setProgress(null);
  }

  return (
    <div className="fixed inset-0 z-[85] flex items-center justify-center bg-ink/70 p-6 backdrop-blur-sm">
      <div className="animate-pop-in flex w-full max-w-sm flex-col items-center gap-4 rounded-card bg-white p-6 text-center shadow-2xl">
        <span className="text-5xl">🧳</span>

        {result ? (
          <>
            <h2 className="text-xl font-extrabold">Catches imported!</h2>
            <p className="text-sm font-semibold text-ink/60">
              {result.imported} added to your account
              {result.merged > 0 && `, ${result.merged} merged with existing pets`}
              {result.skipped > 0 && `, ${result.skipped} couldn't be moved`}. 🎉
            </p>
            <button
              type="button"
              onClick={finish}
              className="tappable w-full rounded-full bg-grass px-6 py-4 text-lg font-extrabold text-white shadow-md"
            >
              Let&apos;s go!
            </button>
          </>
        ) : progress ? (
          <>
            <h2 className="text-xl font-extrabold">Moving your PetDex…</h2>
            <div className="h-3 w-full overflow-hidden rounded-full bg-cream">
              <div
                className="h-full rounded-full bg-tangerine transition-all"
                style={{ width: `${Math.round((progress.done / progress.total) * 100)}%` }}
              />
            </div>
            <p className="text-sm font-bold text-ink/50">
              {progress.done}/{progress.total} pets
            </p>
          </>
        ) : (
          <>
            <h2 className="text-xl font-extrabold">Bring your guest catches?</h2>
            <p className="text-sm font-semibold text-ink/60">
              You caught <b>{collection.length}</b> {collection.length === 1 ? "pet" : "pets"} before
              signing in. Import {collection.length === 1 ? "it" : "them"} into your account so{" "}
              {collection.length === 1 ? "it appears" : "they appear"} on the community map and
              leaderboards?
            </p>
            <button
              type="button"
              onClick={handleImport}
              className="tappable w-full rounded-full bg-tangerine px-6 py-4 text-lg font-extrabold text-white shadow-md"
            >
              Import my catches 📥
            </button>
            <button type="button" onClick={finish} className="text-sm font-bold text-ink/40">
              Keep them on this device only
            </button>
          </>
        )}
      </div>
    </div>
  );
}
