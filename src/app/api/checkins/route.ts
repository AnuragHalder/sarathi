import { getServerSupabase, getUserId } from "@/lib/supabase/server";
import { extractPractice, scheduleCheckin } from "@/lib/checkins";

export const runtime = "nodejs";

/**
 * The check-in offer under a reply:
 *  - "enable":  "Yes, check in" → turns check-ins on and schedules one for this conversation
 *  - "cancel":  "Not this time" → no email about this conversation
 *  - "decline": "No thanks"     → don't offer again for a while
 */
export async function POST(req: Request) {
  const supabase = await getServerSupabase();
  const userId = supabase ? await getUserId(supabase) : null;
  if (!supabase || !userId) return Response.json({ error: "Please sign in." }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as { action?: string; conversationId?: string };
  const convId = typeof body.conversationId === "string" ? body.conversationId : "";

  if (body.action === "decline") {
    await supabase.from("profiles").update({ checkins_declined_at: new Date().toISOString() }).eq("id", userId);
    return Response.json({ ok: true });
  }
  if (!/^[0-9a-f-]{36}$/i.test(convId)) return Response.json({ error: "Missing conversation." }, { status: 400 });

  if (body.action === "cancel") {
    const { data: existing } = await supabase.from("checkins").select("id").eq("conversation_id", convId).maybeSingle();
    if (existing) await supabase.from("checkins").update({ status: "cancelled", note: "not this time" }).eq("id", existing.id).eq("status", "scheduled");
    else {
      // Remember the choice even if nothing was scheduled yet, so a later reply doesn't schedule one.
      const { data: msgs } = await supabase.from("messages").select("content").eq("conversation_id", convId).eq("role", "assistant").order("id", { ascending: false }).limit(5);
      const practice = (msgs ?? []).map((m) => extractPractice(m.content)).find(Boolean);
      if (practice) await supabase.from("checkins").insert({ user_id: userId, conversation_id: convId, practice, due_on: new Date().toISOString().slice(0, 10), status: "cancelled", note: "not this time" });
    }
    return Response.json({ ok: true });
  }

  if (body.action === "enable") {
    await supabase.from("profiles").update({ checkins_enabled: true }).eq("id", userId);
    const { data: msgs } = await supabase
      .from("messages")
      .select("role, content, crisis")
      .eq("conversation_id", convId)
      .order("id", { ascending: false })
      .limit(40);
    if ((msgs ?? []).some((m) => m.crisis)) return Response.json({ ok: true, scheduled: false });
    const latest = (msgs ?? []).find((m) => m.role === "assistant" && extractPractice(m.content));
    const scheduled = latest ? await scheduleCheckin(supabase, userId, convId, latest.content) : false;
    return Response.json({ ok: true, scheduled });
  }
  return Response.json({ error: "Unknown action." }, { status: 400 });
}
