"use client";

import { useState } from "react";
import Link from "next/link";
import { useAppStore } from "@/lib/store";
import { signInWithGoogle, signInWithEmail } from "@/lib/auth";

/**
 * Entry gate (CatchCat-inspired, All4Pets palette): consent + sign-in.
 * Google/email via Supabase Auth per T&C §2; guest mode keeps the
 * on-device demo fully playable without an account.
 */
export default function Welcome() {
  const consentAccepted = useAppStore((s) => s.consentAccepted);
  const setConsentAccepted = useAppStore((s) => s.setConsentAccepted);
  const setGuestMode = useAppStore((s) => s.setGuestMode);

  const [checked, setChecked] = useState(consentAccepted);
  const [email, setEmail] = useState("");
  const [emailMode, setEmailMode] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const requireConsent = () => {
    if (!checked) {
      setMessage("Please accept the Terms & Privacy Policy first 🐾");
      return false;
    }
    setConsentAccepted(true);
    return true;
  };

  async function handleGoogle() {
    if (!requireConsent()) return;
    setBusy(true);
    const { error, popup } = await signInWithGoogle();
    if (error) {
      setMessage(
        error.includes("not enabled") || error.includes("provider")
          ? "Google Sign-In isn't enabled on the server yet — use email or guest mode."
          : error
      );
      setBusy(false);
      return;
    }
    if (popup) {
      // installed-app flow: sign-in completes in the popup and syncs back
      // here automatically; this screen unmounts the moment it lands
      setMessage("Finish signing in with Google in the window that opened… 🔐");
      setBusy(false);
    }
    // otherwise the browser is redirecting to Google
  }

  async function handleEmail() {
    if (!requireConsent()) return;
    if (!/.+@.+\..+/.test(email)) {
      setMessage("That email looks incomplete 🤔");
      return;
    }
    setBusy(true);
    try {
      const { error } = await signInWithEmail(email);
      setMessage(error ?? `Magic link sent to ${email} — check your inbox! ✉️`);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Something went wrong — try again.");
    } finally {
      setBusy(false);
    }
  }

  function handleGuest() {
    if (!requireConsent()) return;
    setGuestMode(true);
  }

  return (
    <div className="fixed inset-0 z-[80] overflow-y-auto bg-cream">
      <div className="mx-auto flex min-h-dvh max-w-lg flex-col items-center justify-center gap-5 p-6">
        <div className="flex flex-col items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/petdexter-logo.png" alt="PetDexter" className="w-56 max-w-[70%] drop-shadow-lg" />
          <p className="font-script text-2xl text-ink/60">Meet pets. Remember them. Collect their stories.</p>
        </div>

        {emailMode ? (
          <div className="flex w-full flex-col gap-2">
            <input
              type="email"
              inputMode="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-full border-2 border-sunny bg-white px-5 py-4 font-semibold outline-none focus:border-tangerine"
            />
            <button
              type="button"
              onClick={handleEmail}
              disabled={busy}
              className="tappable w-full rounded-full bg-tangerine px-6 py-4 text-lg font-extrabold text-white shadow-md disabled:opacity-60"
            >
              ✉️ Send magic link
            </button>
            <button type="button" onClick={() => setEmailMode(false)} className="text-sm font-bold text-ink/50">
              ← Other options
            </button>
          </div>
        ) : (
          <div className="flex w-full flex-col gap-3">
            <button
              type="button"
              onClick={handleGoogle}
              disabled={busy}
              className="tappable w-full rounded-full bg-tangerine px-6 py-4 text-lg font-extrabold text-white shadow-md disabled:opacity-60"
            >
              Continue with Google
            </button>
            <button
              type="button"
              onClick={() => setEmailMode(true)}
              className="tappable w-full rounded-full bg-white px-6 py-4 text-lg font-extrabold text-ink shadow-md"
            >
              ✉️ Continue with Email
            </button>
            <button
              type="button"
              onClick={handleGuest}
              className="tappable w-full rounded-full px-6 py-2 font-bold text-ink/50"
            >
              Play as guest (device only)
            </button>
          </div>
        )}

        <label className="flex w-full cursor-pointer items-start gap-3 rounded-2xl bg-white p-4 shadow-sm">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => {
              setChecked(e.target.checked);
              setMessage(null);
            }}
            className="mt-0.5 h-5 w-5 accent-tangerine"
          />
          <span className="text-xs font-semibold leading-snug text-ink/70">
            By checking this box, I agree to the{" "}
            <Link href="/legal/terms" className="font-extrabold text-tangerine-deep underline">
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link href="/legal/privacy" className="font-extrabold text-tangerine-deep underline">
              Privacy Policy
            </Link>{" "}
            of All4Pets, and allow anonymous crash reports and analytics as described therein.
          </span>
        </label>

        {message && (
          <p className="animate-pop-in rounded-2xl bg-sunny/40 px-4 py-3 text-center text-sm font-bold">
            {message}
          </p>
        )}

        <div className="flex w-full justify-around rounded-card bg-white p-4 shadow-md">
          {[
            { emoji: "🔍", title: "Discover", sub: "Real pets" },
            { emoji: "🧠", title: "Remember", sub: "Names & places" },
            { emoji: "🤝", title: "Connect", sub: "Pet parents" },
          ].map((f) => (
            <span key={f.title} className="flex flex-col items-center gap-0.5">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cream text-2xl">
                {f.emoji}
              </span>
              <span className="text-sm font-extrabold">{f.title}</span>
              <span className="text-xs text-ink/50">{f.sub}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
