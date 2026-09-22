import OpenAI from "openai";
import { isCrisis, systemPrompt, type Style } from "@/lib/prompts";

export const runtime = "nodejs";
export const maxDuration = 60;

type Msg = { role: "user" | "assistant"; content: string };
const STYLES: Style[] = ["verse", "arjuna", "direct"];
const MODEL = process.env.OPENAI_MODEL || "gpt-5-mini";
const EFFORT = process.env.OPENAI_REASONING_EFFORT ?? (/^(gpt-5|o\d)/.test(MODEL) ? "low" : "");

export async function POST(req: Request) {
  let body: { messages?: Msg[]; style?: Style };
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

  const crisis = isCrisis(last.content);
  const client = new OpenAI();
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      // First line is a small JSON header the client reads before the text.
      controller.enqueue(encoder.encode(JSON.stringify({ crisis }) + "\n"));
      try {
        const completion = await client.chat.completions.create({
          model: MODEL,
          stream: true,
          messages: [{ role: "system", content: systemPrompt(style, crisis) }, ...messages],
          ...(EFFORT ? { reasoning_effort: EFFORT as "low" } : {}),
        });
        for await (const chunk of completion) {
          const t = chunk.choices[0]?.delta?.content;
          if (t) controller.enqueue(encoder.encode(t));
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Unknown error";
        console.error("OpenAI error:", msg);
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
