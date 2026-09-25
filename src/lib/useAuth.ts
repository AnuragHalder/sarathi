"use client";

import { useCallback, useEffect, useState } from "react";
import { getBrowserSupabase } from "./supabase/client";
import { AUTH_ENABLED } from "./supabase/config";

export type Profile = {
  id: string;
  name: string | null;
  email: string | null;
  avatar_url: string | null;
  memory_enabled: boolean;
  consented_at: string | null;
};

/** Signed-in user + profile row, kept in sync with Supabase auth state. */
export function useAuth() {
  const [ready, setReady] = useState(!AUTH_ENABLED);
  const [profile, setProfile] = useState<Profile | null>(null);

  const load = useCallback(async () => {
    const sb = getBrowserSupabase();
    if (!sb) return;
    const { data } = await sb.auth.getUser();
    const u = data.user;
    if (!u) {
      setProfile(null);
      setReady(true);
      return;
    }
    const { data: p } = await sb.from("profiles").select("id, name, avatar_url, memory_enabled, consented_at").eq("id", u.id).maybeSingle();
    setProfile({
      id: u.id,
      email: u.email ?? null,
      name: p?.name ?? (u.user_metadata?.full_name as string | undefined) ?? null,
      avatar_url: p?.avatar_url ?? (u.user_metadata?.avatar_url as string | undefined) ?? null,
      memory_enabled: p?.memory_enabled ?? true,
      consented_at: p?.consented_at ?? null,
    });
    setReady(true);
  }, []);

  useEffect(() => {
    const sb = getBrowserSupabase();
    if (!sb) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync with the external auth session
    load();
    const { data: sub } = sb.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") load();
    });
    return () => sub.subscription.unsubscribe();
  }, [load]);

  const signIn = useCallback(async (next = "/") => {
    const sb = getBrowserSupabase();
    if (!sb) return;
    await sb.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
    });
  }, []);

  const signOut = useCallback(async () => {
    const sb = getBrowserSupabase();
    if (!sb) return;
    await sb.auth.signOut();
    setProfile(null);
  }, []);

  const updateProfile = useCallback(
    async (patch: Partial<Pick<Profile, "memory_enabled" | "consented_at">>) => {
      const sb = getBrowserSupabase();
      if (!sb || !profile) return;
      const { error } = await sb.from("profiles").upsert({ id: profile.id, ...patch });
      if (!error) setProfile({ ...profile, ...patch });
      return error;
    },
    [profile],
  );

  return { enabled: AUTH_ENABLED, ready, profile, signIn, signOut, updateProfile, reload: load };
}
