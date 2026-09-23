import OpenAI from "openai";
import { COUNSELLOR_STATIC, CRISIS_NOTE, isCrisis, type Style } from "@/lib/prompts";
import { buildContext, createWithFallback, MODEL, readSituation, type Msg, type Situation } from "@/lib/counsel";

export const runtime = "nodejs";
export const maxDuration = 60;

const STYLES: Style[] = ["verse", "arjuna", "direct"];

export async function POST(req: Request) {
  let body: { messages?: Msg[]; style?: Style; model?: string };
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

  const stream = new ReadableStream({
    async start(controller) {
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

        // Step 2: shortlist + context.
        const ctx = buildContext(style, sit, history, crisis);

        // First line is a small JSON header the client reads before the text.
        controller.enqueue(
          encoder.encode(JSON.stringify({ crisis, themes: sit.themes, moment: sit.arjuna_moment, clarify: sit.needs_clarification, shortlist: ctx.shortlist, reader: sit.source, model }) + "\n"),
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
          if (t) controller.enqueue(encoder.encode(t));
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Unknown error";
        console.error("Chat error:", msg);
        controller.enqueue(encoder.encode(`\n\n_Sorry, something went wrong reaching the AI service. Please try again._`));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
  });
}
