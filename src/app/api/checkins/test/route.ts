import OpenAI from "openai";
import { getServerSupabase, getUserId } from "@/lib/supabase/server";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { sendCheckin, type DueCheckin } from "@/lib/sendCheckin";

export const runtime = "nodejs";
export const maxDuration = 60;

/** The signed-in person, and whether they are the app owner (ADMIN_EMAIL, comma-separated for several). */
async function whoIsAsking(): Promise<{ userId: string; isOwner: boolean } | null> {
  const supabase = await getServerSupabase();
  const userId = supabase ? await getUserId(supabase) : null;
  if (!supabase || !userId) return null;
  const { data } = await supabase.auth.getClaims();
  const email = String(data?.claims?.email ?? "").toLowerCase();
  const owners = (process.env.ADMIN_EMAIL || "").toLowerCase().split(",").map((s) => s.trim()).filter(Boolean);
  return { userId, isOwner: Boolean(email && owners.includes(email)) };
}

/** Whether to show the "send me a test" button (only to the app owner). */
export async function GET() {
  const who = await whoIsAsking();
  return Response.json({ allowed: Boolean(who?.isOwner) });
}

/**
 * "Send me a test check-in now": sends the email for the owner's latest check-in straight away,
 * marked [Test], without changing anything, so you can see a real one without waiting for the morning.
 */
export async function POST() {
  const who = await whoIsAsking();
  if (!who) return Response.json({ error: "Please sign in first." }, { status: 401 });
  if (!who.isOwner) return Response.json({ error: "Test emails are only for the app owner." }, { status: 403 });

  const admin = getAdminSupabase();
  if (!admin || !process.env.OPENAI_API_KEY || !process.env.RESEND_API_KEY) {
    return Response.json({ error: "Set SUPABASE_SECRET_KEY and RESEND_API_KEY in Vercel first." }, { status: 500 });
  }
  const { data, error } = await admin.rpc("checkin_for_user", { p_user: who.userId });
  if (error) return Response.json({ error: error.message }, { status: 500 });
  const row = ((data ?? []) as DueCheckin[])[0];
  if (!row) {
    return Response.json(
      { error: 'No check-in yet. Have a conversation where Sarathi gives you a practice, tap "Yes, check in", then try again.' },
      { status: 404 },
    );
  }
  const out = await sendCheckin(admin, new OpenAI(), row, true);
  if (out.result !== "sent") return Response.json({ error: `Not sent (${out.note ?? out.result}).` }, { status: 500 });
  return Response.json({ ok: true, to: row.email });
}
