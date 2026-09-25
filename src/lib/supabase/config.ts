export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
/** Until Supabase is set up the app keeps working in guest-only mode. */
export const AUTH_ENABLED = Boolean(SUPABASE_URL && SUPABASE_KEY);
