import "server-only";
import OpenAI from "openai";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createWithFallback, READER_MODEL } from "./counsel";

export const MEMORY_TYPES = ["context", "situation", "pattern", "goal", "helped", "preference"] as const;
type MemType = (typeof MEMORY_TYPES)[number];
type Memory = { id: string; type: MemType; content: string; importance: number; status: string; sensitive: boolean; updated_at: string };

/** First checkpoint after the 2nd user message, then every 4 more. */
export const isCheckpointTurn = (userTurns: number, lastCheckpoint: number) =>
  userTurns >= 2 && (lastCheckpoint === 0 || userTurns - lastCheckpoint >= 4);

// ---------------------------------------------------------------------------
// Reading memory into the counsellor's context

export async function loadMemoryContext(supabase: SupabaseClient, userId: string, currentConversationId: string | null) {
  const [{ data: mems }, { data: convs }, { data: profile }] = await Promise.all([
    supabase
      .from("memories")
      .select("type, content, importance, status, updated_at")
      .eq("user_id", userId)
      .eq("status", "active")
      .order("importance", { ascending: false })
      .order("updated_at", { ascending: false })
      .limit(40),
    supabase
      .from("conversations")
      .select("id, summary, updated_at")
      .eq("user_id", userId)
      .not("summary", "is", null)
      .order("updated_at", { ascending: false })
      .limit(4),
    supabase.from("profiles").select("name").eq("id", userId).maybeSingle(),
  ]);
  const lines: string[] = [];
  const first = (profile?.name as string | undefined)?.split(" ")[0];
  if (first) lines.push(`Their first name: ${first} (use it sparingly, at most once).`);
  const LABEL: Record<string, string> = {
    context: "Life context",
    situation: "Ongoing situation",
    pattern: "Recurring pattern",
    goal: "Goal/value",
    helped: "What helped before",
    preference: "Preference",
  };
  for (const m of mems ?? []) lines.push(`- [${LABEL[m.type] ?? m.type}] ${m.content}`);
  const recent = (convs ?? []).filter((c) => c.id !== currentConversationId).slice(0, 3);
  if (recent.length) {
    lines.push("Recent conversations:");
    for (const c of recent) lines.push(`- ${new Date(c.updated_at).toISOString().slice(0, 10)}: ${c.summary}`);
  }
  return lines.length ? `ABOUT THIS PERSON (from earlier conversations):\n${lines.join("\n")}` : "";
}

// ---------------------------------------------------------------------------
// Writing memory: the checkpoint extractor

const EXTRACTOR_PROMPT = `You maintain a small, private memory of notes about a person who talks to "Sarathi",
a Bhagavad Gita-based counsellor. Read the recent conversation and the EXISTING NOTES, then decide what to change.

Return JSON only:
{"title": "<3-7 word title for this conversation>",
 "summary": "<one sentence, max 25 words, what this conversation was about and where it landed>",
 "ops": [
   {"op": "add", "type": "<type>", "content": "<note>", "importance": 1-5, "sensitive": true|false},
   {"op": "update", "id": "<existing id>", "content": "<new text>", "importance": 1-5},
   {"op": "resolve", "id": "<existing id>"},
   {"op": "delete", "id": "<existing id>"}
 ]}

Types: context (stable life facts: work, family, city, age range), situation (something ongoing with a time
frame: an exam, a conflict, an illness), pattern (a recurring tendency), goal (what they want, what they value),
helped (a verse, idea or practice that clearly resonated, e.g. "2.47 and the 'my domain' practice helped with exam anxiety"),
preference (how they like guidance: language, length, style).

Rules:
- Keep only things that will make FUTURE guidance more personal. Skip small talk and one-off details.
- Each note: third person, under 20 words, specific ("Final-year engineering student; placements in October").
- Prefer "update" over adding a near-duplicate. "resolve" a situation that has ended (e.g. the exam is over).
- At most 5 ops. An empty ops list is fine and common.
- NEVER record details of suicide, self-harm or crisis. At most add nothing, or a gentle pattern like "has had very hard days".
- Health, religion, caste, sexuality: only if the person raised it and it matters for guidance; set "sensitive": true.
- Other people: first name or relation only ("sister Riya"), nothing identifying beyond that.
- Do not infer things they did not say. Do not store the counsellor's advice unless the person said it helped.`;

export async function runCheckpoint(
  supabase: SupabaseClient,
  client: OpenAI,
  userId: string,
  conversationId: string,
  userTurns: number,
  firstCheckpoint: boolean,
) {
  const [{ data: msgs }, { data: existing }] = await Promise.all([
    supabase
      .from("messages")
      .select("role, content, crisis")
      .eq("conversation_id", conversationId)
      .order("id", { ascending: false })
      .limit(12),
    supabase
      .from("memories")
      .select("id, type, content, importance, status, sensitive, updated_at")
      .eq("user_id", userId)
      .eq("status", "active")
      .order("updated_at", { ascending: false })
      .limit(60),
  ]);
  const convo = (msgs ?? [])
    .reverse()
    .filter((m) => !m.crisis)
    .map((m) => `${m.role === "user" ? "PERSON" : "SARATHI"}: ${String(m.content).slice(0, 1500)}`)
    .join("\n\n");
  if (!convo) return;
  const notes = ((existing ?? []) as Memory[]).map((m) => `${m.id} | ${m.type} | ${m.content}`).join("\n") || "(none yet)";

  const res = (await createWithFallback(client, {
    model: READER_MODEL,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: EXTRACTOR_PROMPT },
      { role: "user", content: `EXISTING NOTES (id | type | note):\n${notes}\n\nRECENT CONVERSATION:\n${convo}` },
    ],
  })) as OpenAI.ChatCompletion;
  const raw = res.choices[0]?.message?.content ?? "";
  let j: { title?: string; summary?: string; ops?: Record<string, unknown>[] };
  try {
    j = JSON.parse(raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1));
  } catch {
    return;
  }
  const ids = new Set(((existing ?? []) as Memory[]).map((m) => m.id));
  const clampImp = (v: unknown) => Math.min(5, Math.max(1, Math.round(Number(v) || 3)));
  const text = (v: unknown) => (typeof v === "string" ? v.trim().slice(0, 200) : "");

  for (const op of (j.ops ?? []).slice(0, 5)) {
    const kind = op.op;
    const id = typeof op.id === "string" ? op.id : "";
    if (kind === "add") {
      const type = op.type as MemType;
      const content = text(op.content);
      if (!MEMORY_TYPES.includes(type) || !content) continue;
      await supabase.from("memories").insert({
        user_id: userId,
        type,
        content,
        importance: clampImp(op.importance),
        sensitive: op.sensitive === true,
        source_conversation_id: conversationId,
      });
    } else if (kind === "update" && ids.has(id)) {
      const content = text(op.content);
      if (!content) continue;
      await supabase.from("memories").update({ content, importance: clampImp(op.importance) }).eq("id", id);
    } else if (kind === "resolve" && ids.has(id)) {
      await supabase.from("memories").update({ status: "resolved" }).eq("id", id);
    } else if (kind === "delete" && ids.has(id)) {
      await supabase.from("memories").delete().eq("id", id);
    }
  }

  const patch: Record<string, unknown> = { last_checkpoint_turn: userTurns };
  const summary = text(j.summary);
  if (summary) patch.summary = summary;
  const title = text(j.title).slice(0, 80);
  if (firstCheckpoint && title) patch.title = title;
  await supabase.from("conversations").update(patch).eq("id", conversationId);
}
