import OpenAI from "openai";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { todayIST } from "@/lib/checkins";
import { sendCheckin, type DueCheckin } from "@/lib/sendCheckin";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * The morning job. Vercel calls this once a day (see vercel.json: 02:30 UTC, i.e. 8-9 am in India) with
 * "Authorization: Bearer <CRON_SECRET>". It sends every check-in due today, up to 100 (Resend's free daily limit).
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  const admin = getAdminSupabase();
  if (!admin || !process.env.OPENAI_API_KEY || !process.env.RESEND_API_KEY) {
    return Response.json({ error: "Check-ins need SUPABASE_SECRET_KEY, OPENAI_API_KEY and RESEND_API_KEY." }, { status: 500 });
  }

  const today = todayIST();
  // Anything more than 2 days late (e.g. repeated send failures) is dropped rather than sent stale.
  const stale = todayIST(new Date(Date.now() - 2 * 24 * 3600_000));
  await admin.from("checkins").update({ status: "skipped", note: "too late to send" }).eq("status", "scheduled").lt("due_on", stale);

  const { data, error } = await admin.rpc("due_checkins", { p_today: today, p_limit: Number(process.env.CHECKIN_DAILY_MAX || 100) });
  if (error) return Response.json({ error: error.message }, { status: 500 });
  const rows = (data ?? []) as DueCheckin[];

  const client = new OpenAI();
  const results: Awaited<ReturnType<typeof sendCheckin>>[] = [];
  // A few at a time: fast enough for 100 emails within the time limit, gentle on the APIs.
  for (let i = 0; i < rows.length; i += 6) {
    results.push(...(await Promise.all(rows.slice(i, i + 6).map((r) => sendCheckin(admin, client, r)))));
  }
  const count = (k: string) => results.filter((r) => r.result === k).length;
  const summary = { today, due: rows.length, sent: count("sent"), skipped: count("skipped"), failed: count("failed") };
  console.log("Check-ins:", JSON.stringify(summary), results.filter((r) => r.result === "failed").map((r) => r.note));
  return Response.json(summary);
}
