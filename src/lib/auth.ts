import { useAppStore, type AuthUser } from "@/lib/store";

/**
 * Supabase Auth (per All4Pets T&C §2: Google Sign-In, Apple Sign-In, or email).
 * Google/Apple require enabling the providers in the Supabase dashboard;
 * email magic links work out of the box.
 */

function hasSupabaseEnv(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

function toAuthUser(u: { id: string; email?: string; user_metadata?: Record<string, unknown> } | null): AuthUser | null {
  if (!u) return null;
  return {
    id: u.id,
    email: u.email ?? null,
    name:
      (u.user_metadata?.full_name as string) ??
      (u.user_metadata?.name as string) ??
      (u.user_metadata?.username as string) ??
      null,
  };
}

/** Restore session + subscribe to auth changes. Call once from AppShell. */
export async function initAuth(): Promise<void> {
  if (!hasSupabaseEnv()) return;
  const { getSupabase } = await import("@/lib/supabase");
  const supabase = getSupabase();
  const { data } = await supabase.auth.getSession();
  useAppStore.getState().setAuthUser(toAuthUser(data.session?.user ?? null));
  supabase.auth.onAuthStateChange((_event, session) => {
    useAppStore.getState().setAuthUser(toAuthUser(session?.user ?? null));
  });
}

/** True when running as an installed PWA (standalone window). */
function isStandalone(): boolean {
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

export async function signInWithGoogle(): Promise<{ error?: string; popup?: boolean }> {
  if (!hasSupabaseEnv()) return { error: "Supabase is not configured" };
  const { getSupabase } = await import("@/lib/supabase");
  const supabase = getSupabase();

  // Installed app: run OAuth in a popup/custom-tab that closes itself, so the
  // user never gets stranded in the browser — the session syncs back into
  // this window via supabase-js cross-tab auth events.
  if (isStandalone()) {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/?authpopup=1`,
        skipBrowserRedirect: true,
      },
    });
    if (error) return { error: error.message };
    const popup = window.open(data.url, "petcatch-auth", "width=480,height=680");
    if (popup) return { popup: true };
    // popup blocked — fall back to the normal full redirect
    window.location.href = data.url;
    return {};
  }

  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: window.location.origin },
  });
  return error ? { error: error.message } : {};
}

/**
 * If this window IS the OAuth popup (?authpopup=1), close it once the
 * session has been stored. Returns true when the caller should stop
 * rendering (the window is about to close).
 */
export async function handleAuthPopupReturn(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (!new URLSearchParams(window.location.search).has("authpopup")) return false;
  if (!hasSupabaseEnv()) return false;
  const { getSupabase } = await import("@/lib/supabase");
  const supabase = getSupabase();
  // give detectSessionInUrl a moment to exchange + persist the session
  for (let i = 0; i < 20; i++) {
    const { data } = await supabase.auth.getSession();
    if (data.session) break;
    await new Promise((r) => setTimeout(r, 250));
  }
  window.close();
  // if the browser refuses to close us, continue into the app cleanly
  window.history.replaceState(null, "", "/");
  return false;
}

export async function signInWithEmail(email: string): Promise<{ error?: string }> {
  if (!hasSupabaseEnv()) return { error: "Supabase is not configured" };
  try {
    const { getSupabase } = await import("@/lib/supabase");
    const { error } = await getSupabase().auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    });
    return error ? { error: error.message } : {};
  } catch (err) {
    console.error("[petdexter] signInWithEmail failed:", err);
    return { error: err instanceof Error ? err.message : "Couldn't reach the server — check your connection and try again." };
  }
}

export async function signOut(): Promise<void> {
  if (!hasSupabaseEnv()) return;
  const { getSupabase } = await import("@/lib/supabase");
  await getSupabase().auth.signOut();
  useAppStore.getState().setAuthUser(null);
}

/**
 * Account deletion (T&C §7 / Privacy §7): purges identity via the
 * delete_account RPC; anonymized cards persist de-linked for game integrity.
 */
export async function deleteAccount(): Promise<{ error?: string }> {
  if (!hasSupabaseEnv()) return { error: "Supabase is not configured" };
  const { getSupabase } = await import("@/lib/supabase");
  const supabase = getSupabase();
  const { error } = await supabase.rpc("delete_account");
  if (error) return { error: error.message };
  await supabase.auth.signOut();
  useAppStore.getState().setAuthUser(null);
  return {};
}
