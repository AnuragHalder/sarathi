import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { AUTH_ENABLED, SUPABASE_KEY, SUPABASE_URL } from "./config";

let client: SupabaseClient | null = null;

/** Browser Supabase client (null when Supabase isn't configured yet). */
export function getBrowserSupabase(): SupabaseClient | null {
  if (!AUTH_ENABLED) return null;
  client ??= createBrowserClient(SUPABASE_URL, SUPABASE_KEY);
  return client;
}
