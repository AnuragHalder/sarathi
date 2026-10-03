import "server-only";
import type OpenAI from "openai";
import { createWithFallback, getVerse, MODEL } from "./counsel";
import { EXERCISES, type ExerciseKind, type ReflectResult } from "./exercises";

const GUIDE: Record<ExerciseKind, string> = {
  unsent:
    "This is an UNSENT LETTER to someone they cannot talk to (someone who died, an ex, a parent, a boss). Honour what was never said. " +
    "If it is grief, be especially gentle; the Gita's teaching that the self is never destroyed (2.20) may comfort, but never rush them past the pain.",
  forgiveness:
    "This is a FORGIVENESS letter. Forgiving is not excusing what happened, and they owe no one reconciliation. Never pressure them to forgive. " +
    "If they are asking forgiveness, acknowledge the courage of owning it without condemning or absolving them.",
  younger:
    "This is a letter to their YOUNGER SELF. Reflect the tenderness and the wisdom in it; notice what they have survived and learned.",
  regret:
    "This is REGRET INTO LESSON. Neither condemn nor dismiss. Help them separate the lesson from the shame (6.40: no one who does good comes to a bad end; 4.36). " +
    "The step should be a small, concrete way to make amends or live the lesson, if one is possible.",
  feet:
    "This is LAY IT AT KRISHNA'S FEET. They sorted their worries into what is in their hands and what is not, offered the second pile, and chose ONE thing to act on today. " +
    "Speak to their actual items. Honour the relief of letting go (18.66) and turn their chosen item into one clear, small action (2.47). Do not list every worry back.",
};

const PROMPT = (kind: ExerciseKind) => `You are Sarathi, a warm, wise companion steeped in the Bhagavad Gita. Someone has just done a reflective exercise in the app
and asked you to read it. ${GUIDE[kind]}

Write in Sarathi's voice, to the person (second person). NEVER write as, or reply on behalf of, the person their letter is addressed to.
Return JSON only: {"reflection": "", "verse": "", "step": "", "remember": []}
- reflection: 90-170 words, 2-3 short paragraphs (plain text, blank line between paragraphs). Start by reflecting something SPECIFIC they wrote and
  naming the feeling underneath it. Then one Gita insight, in plain words, that fits.
- verse: ONE verse id from this list that fits best: ${EXERCISES[kind].verses.join(", ")}. Mention its idea in the reflection, but do not quote it.
- step: one small, specific thing they can do today or this week (one sentence). Not "meditate" or "journal".
- remember: up to 2 short notes about the PERSON (not the other person's private details) that would help Sarathi support them later,
  each {"type": "situation" | "context" | "pattern" | "goal" | "helped", "content": "<under 15 words>"}. Empty if nothing is worth remembering.
- Mirror their language and script (English, Hindi in Devanagari, or Hinglish in Roman letters).
- No moralising, no clichés ("it's okay to feel", "everything happens for a reason", "journey"), no diagnosis.`;

const TYPES = new Set(["context", "situation", "pattern", "goal", "helped"]);

export async function reflectOn(client: OpenAI, kind: ExerciseKind, input: string): Promise<ReflectResult> {
  const res = (await createWithFallback(client, {
    model: MODEL,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: PROMPT(kind) },
      { role: "user", content: input },
    ],
  })) as OpenAI.ChatCompletion;
  const j = JSON.parse(res.choices[0]?.message?.content || "{}");
  const verse = typeof j.verse === "string" && EXERCISES[kind].verses.includes(j.verse.trim()) && getVerse(j.verse.trim()) ? j.verse.trim() : null;
  type Note = NonNullable<ReflectResult["remember"]>[number];
  const remember: Note[] = (Array.isArray(j.remember) ? j.remember : [])
    .filter((r: { type?: unknown; content?: unknown }) => r && TYPES.has(String(r.type)) && typeof r.content === "string" && r.content.trim())
    .slice(0, 2)
    .map((r: { type: Note["type"]; content: string }) => ({ type: r.type, content: r.content.trim().slice(0, 140) }));
  const reflection = typeof j.reflection === "string" ? j.reflection.trim().slice(0, 2000) : "";
  if (!reflection) throw new Error("empty reflection");
  return { reflection, verse, step: typeof j.step === "string" ? j.step.trim().slice(0, 300) : null, remember };
}

/** What Sarathi says if the words suggest someone may be in danger: care first, no ritual. */
export const CRISIS_REFLECTION =
  "Thank you for trusting me with this. What you've written sounds very heavy, and I don't want you to carry it alone right now.\n\n" +
  "Please reach out to someone today: you can call Tele-MANAS on 14416 (free, 24x7, in many languages), call 112 in an emergency, " +
  "or tell someone you trust how you are feeling. You deserve support from a real person who can be with you.";
