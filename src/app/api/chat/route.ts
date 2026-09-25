import OpenAI from "openai";
import { after } from "next/server";
import { COUNSELLOR_STATIC, CRISIS_NOTE, isCrisis, type Style } from "@/lib/prompts";
import { buildContext, createWithFallback, MODEL, readSituation, type Msg, type Situation } from "@/lib/counsel";
import { getServerSupabase, getUserId } from "@/lib/supabase/server";
import { isCheckpointTurn, loadMemoryContext, runCheckpoint } from "@/lib/memory";
import { titleFrom } from "@/lib/guest";
import { allowRequest, GUEST_DAILY, USER_DAILY } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const maxDuration = 60;

const STYLES: Style[] = ["verse", "arjuna", "direct"];

export async function POST(req: Request) {
  let body: { messages?: Msg[]; style?: Style; model?: string; conversationId?: string | null };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const style: Style = STYLES.includes(body.style as Style) ? (body.style as Style) : "verse";
  const messages = (body.messages ?? [])
    .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .slice(-12)
    .map((m) => ({ role: m.role, content: m.content.slice(0, 4000) }));
  const last = messages.at(-1);
  if (!last || last.role !== "user" || !last.content.trim()) {
    return Response.json({ error: "Send a message first" }, { status: 400 });
  }
  if (!process.env.OPENAI_API_KEY) {
    return Response.json({ error: "OPENAI_API_KEY is not set on the server." }, { status: 500 });
  }
  // Model override is for the eval script only (never enable in production).
  const model = process.env.ALLOW_MODEL_OVERRIDE === "1" && body.model ? body.model : MODEL;

  const crisis = isCrisis(last.content);
  const client = new OpenAI();
  const history = messages.slice(0, -1);
  const encoder = new TextEncoder();

  // ---- Signed-in users: find or create the conversation and save the user's message.
  const supabase = await getServerSupabase();
  const userId = supabase ? await getUserId(supabase) : null;
  // Daily usage limit (server-side, so it can't be bypassed by clearing the browser).
  if (!(await allowRequest(req, supabase, userId))) {
    return Response.json(
      {
        error: userId
          ? `You've reached today's limit of ${USER_DAILY} messages. Sarathi will be ready for you again tomorrow.`
          : `You've reached today's guest limit of ${GUEST_DAILY} messages. Sign in (free) to keep talking.`,
        limit: true,
        guest: !userId,
      },
      { status: 429 },
    );
  }
  let conversationId: string | null = null;
  let userTurns = 0;
  let lastCheckpoint = 0;
  let memoryOn = false;
  if (supabase && userId) {
    const { data: profile } = await supabase.from("profiles").select("memory_enabled, consented_at").eq("id", userId).maybeSingle();
    memoryOn = profile?.memory_enabled !== false && Boolean(profile?.consented_at);
    if (body.conversationId) {
      const { data: conv } = await supabase
        .from("conversations")
        .select("id, user_turns, last_checkpoint_turn")
        .eq("id", body.conversationId)
        .maybeSingle();
      if (conv) {
        conversationId = conv.id;
        userTurns = conv.user_turns;
        lastCheckpoint = conv.last_checkpoint_turn;
      }
    }
    if (!conversationId) {
      const firstUser = messages.find((m) => m.role === "user")?.content ?? last.content;
      const { data: conv, error } = await supabase
        .from("conversations")
        .insert({ user_id: userId, title: titleFrom(firstUser), style })
        .select("id")
        .single();
      if (error) console.error("Create conversation failed:", error.message);
      conversationId = conv?.id ?? null;
    }
    if (conversationId) {
      userTurns += 1;
      await supabase.from("messages").insert({ conversation_id: conversationId, user_id: userId, role: "user", content: last.content, style, crisis });
    }
  }

  const stream = new ReadableStream({
    async start(controller) {
      let reply = "";
      try {
        // Step 1: read the situation (skipped in a crisis: no delay, no clarifying questions).
        let sit: Situation;
        if (crisis) {
          sit = { themes: ["despair"], arjuna_moment: null, intensity: "high", needs_clarification: false, missing: "", source: "fallback" };
        } else {
          sit = await readSituation(client, history, last.content);
        }
        // Ask clarifying questions at most once per chat: only on the first message.
        if (history.some((m) => m.role === "assistant")) sit.needs_clarification = false;

        // Memory from earlier chats (signed-in users who have memory switched on).
        const memory = supabase && userId && memoryOn && !crisis ? await loadMemoryContext(supabase, userId, conversationId) : "";

        // Step 2: shortlist + context.
        const ctx = buildContext(style, sit, history, crisis, memory);

        // First line is a small JSON header the client reads before the text.
        controller.enqueue(
          encoder.encode(
            JSON.stringify({ crisis, conversationId, themes: sit.themes, moment: sit.arjuna_moment, clarify: sit.needs_clarification, shortlist: ctx.shortlist, reader: sit.source, model, memory: Boolean(memory) }) + "\n",
          ),
        );

        // Step 3: counsellor reply. Static prompt first (cached), then the per-message context.
        const system: OpenAI.ChatCompletionMessageParam[] = [
          { role: "system", content: COUNSELLOR_STATIC },
          { role: "system", content: `CONTEXT FOR THIS REPLY:\n${ctx.text}` + (crisis ? `\n\n${CRISIS_NOTE}` : "") },
        ];
        const completion = (await createWithFallback(client, {
          model,
          stream: true,
          messages: [...system, ...messages],
        })) as AsyncIterable<OpenAI.ChatCompletionChunk>;
        for await (const chunk of completion) {
          const t = chunk.choices[0]?.delta?.content;
          if (t) {
            reply += t;
            controller.enqueue(encoder.encode(t));
          }
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Unknown error";
        console.error("Chat error:", msg);
        controller.enqueue(encoder.encode(`\n\n_Sorry, something went wrong reaching the AI service. Please try again._`));
      } finally {
        // Save the reply before closing so the chat history is complete.
        if (supabase && userId && conversationId && reply.trim()) {
          await supabase.from("messages").insert({ conversation_id: conversationId, user_id: userId, role: "assistant", content: reply, style });
          await supabase.from("conversations").update({ user_turns: userTurns, style, updated_at: new Date().toISOString() }).eq("id", conversationId);
        }
        controller.close();
      }
    },
  });

  // Memory checkpoint runs after the response has finished, so the user never waits for it.
  if (supabase && userId && conversationId && memoryOn && !crisis && isCheckpointTurn(userTurns, lastCheckpoint)) {
    const convId = conversationId;
    after(async () => {
      try {
        await runCheckpoint(supabase, client, userId, convId, userTurns, lastCheckpoint === 0);
      } catch (e) {
        console.error("Memory checkpoint failed:", e instanceof Error ? e.message : e);
      }
    });
  }

  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
  });
}
