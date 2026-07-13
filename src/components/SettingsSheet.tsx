"use client";

import { useState } from "react";
import Link from "next/link";
import { useAppStore } from "@/lib/store";
import { signOut, deleteAccount } from "@/lib/auth";
import { loadSamplePetDex } from "@/lib/samplePets";

/** Settings (CatchCat-style hub): account, notifications, legal, sign out, deletion. */
export default function SettingsSheet({ onClose }: { onClose: () => void }) {
  const authUser = useAppStore((s) => s.authUser);
  const setGuestMode = useAppStore((s) => s.setGuestMode);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [sampleConfirm, setSampleConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  async function handleNotifications() {
    if (!("Notification" in window)) return setNote("Notifications aren't supported in this browser.");
    const perm = await Notification.requestPermission();
    setNote(perm === "granted" ? "Notifications enabled! 🔔" : "Notifications are blocked in browser settings.");
  }

  async function handleSignOut() {
    setBusy(true);
    await signOut();
    setGuestMode(false); // back to the welcome gate
    setBusy(false);
    onClose();
  }

  async function handleDelete() {
    setBusy(true);
    const { error } = await deleteAccount();
    setBusy(false);
    if (error) return setNote(error);
    localStorage.removeItem("petcatch-store");
    location.reload();
  }

  const row = "tappable flex w-full items-center gap-3 rounded-2xl bg-cream px-4 py-4 font-extrabold shadow-sm";

  return (
    <div className="fixed inset-0 z-[75] flex items-end justify-center bg-ink/50 backdrop-blur-sm" onClick={onClose}>
      <div
        className="animate-pop-in max-h-[85dvh] w-full max-w-lg overflow-y-auto rounded-t-card bg-white p-5 pb-10 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-ink/15" />
        <h2 className="mb-1 text-2xl font-extrabold">Settings ⚙️</h2>
        <p className="mb-4 text-sm text-ink/50">
          {authUser ? `Signed in as ${authUser.email ?? authUser.name}` : "Playing as guest — device only"}
        </p>

        <p className="mb-2 text-xs font-extrabold uppercase tracking-widest text-tangerine-deep">Account &amp; App</p>
        <div className="flex flex-col gap-2.5">
          <button type="button" onClick={handleNotifications} className={row}>
            🔔 Notifications <span className="ml-auto text-ink/30">›</span>
          </button>
          <Link href="/legal" className={row} onClick={onClose}>
            ⚖️ Legal — Terms &amp; Privacy <span className="ml-auto text-ink/30">›</span>
          </Link>
          <a href="mailto:all4petspawty@gmail.com?subject=PetCatch%20feedback" className={row}>
            💬 Feedback &amp; support <span className="ml-auto text-ink/30">›</span>
          </a>
        </div>

        <p className="mb-2 mt-5 text-xs font-extrabold uppercase tracking-widest text-tangerine-deep">Demo</p>
        <div className="flex flex-col gap-2.5">
          {sampleConfirm ? (
            <button
              type="button"
              onClick={() => { loadSamplePetDex(); setNote("Sample PetDex loaded! 🎉 Check the PetDex tab."); setSampleConfirm(false); }}
              className="tappable w-full rounded-2xl bg-grass px-4 py-4 font-extrabold text-white shadow-sm"
            >
              Replace my cards with 8 sample pets — tap to confirm
            </button>
          ) : (
            <button type="button" onClick={() => setSampleConfirm(true)} className={row}>
              🎨 Load sample PetDex <span className="ml-auto text-ink/30">›</span>
            </button>
          )}
          <p className="px-1 text-[11px] text-ink/40">
            Replaces your current cards with a fictional showcase set so you can see how a full
            collection looks. Re-catch real pets anytime to rebuild your PetDex.
          </p>
        </div>

        <p className="mb-2 mt-5 text-xs font-extrabold uppercase tracking-widest text-tangerine-deep">Session</p>
        <div className="flex flex-col gap-2.5">
          <button type="button" onClick={handleSignOut} disabled={busy} className={row}>
            🚪 {authUser ? "Log out" : "Exit guest mode"}
          </button>
          {authUser &&
            (confirmDelete ? (
              <button
                type="button"
                onClick={handleDelete}
                disabled={busy}
                className="tappable w-full rounded-2xl bg-tangerine-deep px-4 py-4 font-extrabold text-white shadow-sm"
              >
                ⚠️ Tap again to permanently delete — cards stay anonymized (per Privacy Policy)
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="tappable w-full rounded-2xl bg-cream px-4 py-4 font-extrabold text-tangerine-deep shadow-sm"
              >
                🗑️ Delete my account
              </button>
            ))}
        </div>

        {note && (
          <p className="animate-pop-in mt-4 rounded-2xl bg-sunny/40 px-4 py-3 text-center text-sm font-bold">{note}</p>
        )}
        <p className="mt-6 text-center text-xs text-ink/30">PetCatch by All4Pets · Pasig City, PH</p>
      </div>
    </div>
  );
}
