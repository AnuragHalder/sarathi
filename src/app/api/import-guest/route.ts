import { getServerSupabase, getUserId } from "@/lib/supabase/server";
import { titleFrom, type GuestChat } from "@/lib/guest";

/** Moves chats made as a guest (stored in the browser) into the newly signed-in account. */
export async function POST(req: Request) {
  const supabase = await getServerSupabase();
  const userId = supabase ? await getUserId(supabase) : null;
  if (!supabase || !userId) return Response.json({ error: "Not signed in" }, { status: 401 });

  let chats: GuestChat[] = [];
  try {
    chats = ((await req.json()).chats ?? []).slice(0, 10);
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  let imported = 0;
  for (const c of chats) {
    const msgs = (c.messages ?? []).filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.trim()).slice(0, 60);
    if (!msgs.length) continue;
    const style = ["verse", "arjuna", "direct"].includes(c.style) ? c.style : "verse";
    const { data: conv, error } = await supabase
      .from("conversations")
      .insert({
        user_id: userId,
        title: titleFrom(c.title || msgs[0].content),
        style,
        user_turns: msgs.filter((m) => m.role === "user").length,
        updated_at: c.updatedAt || new Date().toISOString(),
      })
      .select("id")
      .single();
    if (error || !conv) continue;
    await supabase.from("messages").insert(
      msgs.map((m) => ({ conversation_id: conv.id, user_id: userId, role: m.role, content: m.content.slice(0, 8000), style: m.style ?? style, crisis: !!m.crisis })),
    );
    imported++;
  }
  return Response.json({ imported });
}
