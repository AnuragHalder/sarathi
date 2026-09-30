import "server-only";
import type OpenAI from "openai";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getVerse } from "./counsel";
import { writeCheckin } from "./checkinWriter";
import { renderCheckinEmail, sendEmail } from "./email";
import { answerUrl, APP_URL, stopUrl } from "./checkins";

export type DueCheckin = {
  id: string;
  user_id: string;
  conversation_id: string;
  practice: string;
  verse: string | null;
  due_on: string;
  email: string;
  name: string | null;
};

type Outcome = { id: string; result: "sent" | "skipped" | "failed"; note?: string };

/**
 * Writes and sends one check-in email. With test = true it sends without changing the check-in's status
 * (the "send me a test now" button).
 */
export async function sendCheckin(admin: SupabaseClient, client: OpenAI, row: DueCheckin, test = false): Promise<Outcome> {
  const mark = async (status: "sent" | "skipped", note?: string) => {
    if (test) return;
    await admin
      .from("checkins")
      .update({ status, note: note ?? null, ...(status === "sent" ? { sent_at: new Date().toISOString() } : {}) })
      .eq("id", row.id);
  };

  const { data: msgs, error } = await admin
    .from("messages")
    .select("role, content, crisis")
    .eq("conversation_id", row.conversation_id)
    .order("id", { ascending: true })
    .limit(200);
  if (error) return { id: row.id, result: "failed", note: error.message };
  if (!msgs?.length) {
    await mark("skipped", "conversation is empty or was deleted");
    return { id: row.id, result: "skipped", note: "empty" };
  }
  // Never follow up by email on a conversation where someone was in crisis.
  if (msgs.some((m) => m.crisis)) {
    await mark("skipped", "crisis conversation");
    return { id: row.id, result: "skipped", note: "crisis" };
  }

  const firstName = (row.name || row.email.split("@")[0] || "").split(" ")[0];
  const words = await writeCheckin(client, firstName, msgs as { role: string; content: string }[], row.practice);
  const verse = row.verse ? getVerse(row.verse) : null;
  const links = {
    helped: answerUrl(row.conversation_id, row.id, "helped", words.helped),
    hard: answerUrl(row.conversation_id, row.id, "hard", words.hard),
    notYet: answerUrl(row.conversation_id, row.id, "not_yet", words.notYet),
    cont: `${APP_URL}/?c=${row.conversation_id}`,
    stop: stopUrl(row.user_id),
    privacy: `${APP_URL}/privacy`,
  };
  const { html, text } = renderCheckinEmail({ words, practice: row.practice, verse, links });
  try {
    await sendEmail({ to: row.email, subject: test ? `[Test] ${words.subject}` : words.subject, html, text, unsubscribe: links.stop });
    await mark("sent");
    return { id: row.id, result: "sent" };
  } catch (e) {
    const note = e instanceof Error ? e.message : String(e);
    // Leave it scheduled so tomorrow's run can try again (it is skipped after 2 days, see the cron route).
    if (!test) await admin.from("checkins").update({ note }).eq("id", row.id);
    return { id: row.id, result: "failed", note };
  }
}
