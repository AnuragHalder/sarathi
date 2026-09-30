import "server-only";
import type OpenAI from "openai";
import { createWithFallback, READER_MODEL } from "./counsel";

export type CheckinWords = {
  subject: string;
  preview: string;
  greeting: string;
  recall: string;
  question: string;
  practiceLabel: string;
  helped: string;
  hard: string;
  notYet: string;
  cont: string;
  signoff: string;
};

const PROMPT = `You write the personal parts of a short morning check-in email from Sarathi, a warm Gita-based companion,
to someone who talked with Sarathi yesterday. You get their first name, yesterday's conversation, and the practice
Sarathi gave them. Return JSON only, with exactly these keys:
{"subject": "", "preview": "", "greeting": "", "recall": "", "question": "", "practiceLabel": "",
 "helped": "", "hard": "", "notYet": "", "cont": "", "signoff": ""}

Rules:
- Write EVERYTHING in the language and script the person used (English, Hindi in Devanagari, or Hinglish in Roman letters).
- subject: warm and PRIVATE. Only their first name and a gentle question about yesterday, e.g. "Anurag, how did yesterday go?".
  Never mention the problem, a person, health, money or feelings in the subject (it shows on lock screens).
- preview: one short line shown under the subject in the inbox, equally private, e.g. "I've been thinking about what you shared…".
- greeting: e.g. "Dear Anurag,".
- recall: at most two sentences, under 60 words, in Sarathi's voice ("Yesterday you told me…"). Recall the specific situation
  AND name the feeling underneath it, the way Sarathi understood it. No advice, no verse, no questions, nothing clinical.
- question: one short, gentle question about the practice, e.g. "Did you try it? How did it feel?".
- practiceLabel: the heading above the practice, e.g. "Your practice".
- helped / hard / notYet: three very short button labels meaning "It helped", "Still hard", "Not yet".
- cont: a short button label meaning "Continue our conversation".
- signoff: e.g. "With you on the chariot,".`;

const ENGLISH: CheckinWords = {
  subject: "",
  preview: "I've been thinking about what you shared…",
  greeting: "",
  recall: "Yesterday you shared something that was weighing on you, and I've been thinking about it.",
  question: "Did you try it? How did it feel?",
  practiceLabel: "Your practice",
  helped: "It helped",
  hard: "Still hard",
  notYet: "Not yet",
  cont: "Continue our conversation",
  signoff: "With you on the chariot,",
};

const clip = (s: unknown, max: number) => (typeof s === "string" ? s.replace(/\s+/g, " ").trim().slice(0, max) : "");

/** Writes the personal lines of the email. Falls back to plain English wording if the AI call fails. */
export async function writeCheckin(
  client: OpenAI,
  firstName: string,
  transcript: { role: string; content: string }[],
  practice: string,
): Promise<CheckinWords> {
  const name = firstName || "friend";
  const fallback = { ...ENGLISH, subject: `${name}, how did yesterday go?`, greeting: `Dear ${name},` };
  try {
    const convo = transcript
      .slice(-10)
      .map((m) => `${m.role === "user" ? "PERSON" : "SARATHI"}: ${m.content.replace(/\[\[\/?practice\]\]/gi, "").slice(0, 1200)}`)
      .join("\n\n");
    const res = (await createWithFallback(client, {
      model: READER_MODEL,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: PROMPT },
        { role: "user", content: `FIRST NAME: ${name}\n\nPRACTICE SARATHI GAVE:\n${practice}\n\nYESTERDAY'S CONVERSATION:\n${convo}` },
      ],
    })) as OpenAI.ChatCompletion;
    const j = JSON.parse(res.choices[0]?.message?.content || "{}");
    const out: CheckinWords = {
      subject: clip(j.subject, 90) || fallback.subject,
      preview: clip(j.preview, 110) || fallback.preview,
      greeting: clip(j.greeting, 60) || fallback.greeting,
      recall: clip(j.recall, 420) || fallback.recall,
      question: clip(j.question, 90) || fallback.question,
      practiceLabel: clip(j.practiceLabel, 40) || fallback.practiceLabel,
      helped: clip(j.helped, 24) || fallback.helped,
      hard: clip(j.hard, 24) || fallback.hard,
      notYet: clip(j.notYet, 24) || fallback.notYet,
      cont: clip(j.cont, 40) || fallback.cont,
      signoff: clip(j.signoff, 50) || fallback.signoff,
    };
    return out;
  } catch (e) {
    console.error("Check-in writer failed:", e instanceof Error ? e.message : e);
    return fallback;
  }
}
