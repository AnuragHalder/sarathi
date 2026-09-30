import "server-only";
import crypto from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

/** Sarathi writes its one practice as [[practice]] … [[/practice]] (see prompts.ts). */
const PRACTICE = /\[\[\s*practice\s*\]\]([\s\S]*?)\[\[\s*\/\s*practice\s*\]\]/i;
const VERSE_TAG = /\[\[\s*(?:BG\s*)?(\d{1,2})\.(\d{1,2})\s*\]\]/i;

export function extractPractice(reply: string) {
  const m = reply.match(PRACTICE);
  const text = m?.[1]?.replace(/\s+/g, " ").trim();
  return text && text.length >= 10 ? text.slice(0, 600) : null;
}

export function extractVerse(reply: string) {
  const m = reply.match(VERSE_TAG);
  return m ? `${Number(m[1])}.${Number(m[2])}` : null;
}

/** Today's date in India (YYYY-MM-DD). */
export function todayIST(now = new Date()) {
  return new Date(now.getTime() + 5.5 * 3600_000).toISOString().slice(0, 10);
}

/** The morning after, in India. */
export function tomorrowIST(now = new Date()) {
  return todayIST(new Date(now.getTime() + 24 * 3600_000));
}

/**
 * Schedule (or refresh) the check-in for a conversation from Sarathi's latest reply.
 * Uses the signed-in person's own Supabase client, so row-level security applies.
 * Returns true when a check-in is scheduled.
 */
export async function scheduleCheckin(supabase: SupabaseClient, userId: string, conversationId: string, reply: string) {
  const practice = extractPractice(reply);
  if (!practice) return false;
  const { data: existing } = await supabase.from("checkins").select("status").eq("conversation_id", conversationId).maybeSingle();
  // Respect "not this time", and never email twice about the same conversation.
  if (existing && existing.status !== "scheduled") return false;
  const { error } = await supabase.from("checkins").upsert(
    { user_id: userId, conversation_id: conversationId, practice, verse: extractVerse(reply), due_on: tomorrowIST(), status: "scheduled" },
    { onConflict: "conversation_id" },
  );
  if (error) console.error("Schedule check-in failed:", error.message);
  return !error;
}

// ---- Links in the email ---------------------------------------------------------------

export const APP_URL = (process.env.APP_URL || "https://asksarathi.in").replace(/\/$/, "");

function secret() {
  return process.env.CRON_SECRET || process.env.OPENAI_API_KEY || "sarathi-dev-secret";
}

/** A signature so the "stop check-in emails" link only works for the person it was sent to. */
export function signUser(userId: string) {
  return crypto.createHmac("sha256", secret()).update(`stop:${userId}`).digest("hex").slice(0, 32);
}

export function verifyUser(userId: string, sig: string) {
  const good = signUser(userId);
  return sig.length === good.length && crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(good));
}

export function stopUrl(userId: string) {
  return `${APP_URL}/api/checkins/stop?u=${userId}&s=${signUser(userId)}`;
}

export type Answer = "helped" | "hard" | "not_yet";

export function answerUrl(conversationId: string, checkinId: string, answer: Answer, label: string) {
  const q = new URLSearchParams({ c: conversationId, checkin: checkinId, a: answer, t: label });
  return `${APP_URL}/?${q}`;
}
