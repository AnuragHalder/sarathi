import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { AUTH_ENABLED, SUPABASE_KEY, SUPABASE_URL } from "./config";

/** Server Supabase client bound to the signed-in user's cookies (null when not configured). */
export async function getServerSupabase() {
  if (!AUTH_ENABLED) return null;
  const cookieStore = await cookies();
  return createServerClient(SUPABASE_URL, SUPABASE_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Called from a place that can't set cookies; the proxy refreshes the session instead.
        }
      },
    },
  });
}

/** The verified signed-in user id, or null. */
export async function getUserId(supabase: NonNullable<Awaited<ReturnType<typeof getServerSupabase>>>) {
  const { data } = await supabase.auth.getClaims();
  return (data?.claims?.sub as string | undefined) ?? null;
}
