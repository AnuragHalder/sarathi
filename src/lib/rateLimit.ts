import "server-only";
import crypto from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

const DAY = 86400;
export const GUEST_DAILY = Number(process.env.RATE_LIMIT_GUEST || 15);
export const USER_DAILY = Number(process.env.RATE_LIMIT_USER || 60);

// Fallback when Supabase isn't configured: best-effort, per server instance.
const mem = new Map<string, number[]>();

function clientIp(req: Request) {
  const fwd = req.headers.get("x-forwarded-for");
  return (fwd?.split(",")[0] || req.headers.get("x-real-ip") || "unknown").trim();
}

/** Hash the IP with a server-only secret so keys can't be guessed or reversed. */
function ipKey(req: Request) {
  const salt = process.env.RATE_LIMIT_SALT || process.env.OPENAI_API_KEY || "sarathi";
  return "ip:" + crypto.createHash("sha256").update(clientIp(req) + salt).digest("hex").slice(0, 32);
}

/** Returns true if this request is allowed (and counts it). */
export async function allowRequest(req: Request, supabase: SupabaseClient | null, userId: string | null) {
  const limit = userId ? USER_DAILY : GUEST_DAILY;
  if (limit <= 0) return true;
  const key = userId ? `u:${userId}` : ipKey(req);
  if (supabase) {
    const { data, error } = await supabase.rpc("check_rate_limit", { p_key: key, p_limit: limit, p_window_seconds: DAY });
    if (!error) return data === true;
    // Function not installed yet (002_rate_limit.sql not run) → fall through to the in-memory limiter.
    console.warn("Rate limit check unavailable:", error.message);
  }
  const now = Date.now();
  const hits = (mem.get(key) ?? []).filter((t) => now - t < DAY * 1000);
  if (hits.length >= limit) return false;
  hits.push(now);
  mem.set(key, hits);
  return true;
}
