import "server-only";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "./config";

/**
 * Server-only Supabase client with the project's SECRET key. It bypasses row-level security, so it is used
 * ONLY by the morning check-in job and the unsubscribe link, never with anything a visitor sends us.
 * Set SUPABASE_SECRET_KEY in Vercel as a Secret (never with a NEXT_PUBLIC_ prefix).
 */
export function getAdminSupabase() {
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !key) return null;
  return createClient(SUPABASE_URL, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
