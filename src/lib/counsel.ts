import "server-only";
import OpenAI from "openai";
import verses from "@/data/verses.json";
import excerpts from "@/data/excerpts.json";
import { READER_PROMPT } from "./prompts";
import { buildShortlist, citedIn, getMoment, getTheme, guessThemes } from "./themes";
import type { Style } from "./styles";

export type Msg = { role: "user" | "assistant"; content: string };
export type Situation = {
  themes: string[];
  arjuna_moment: string | null;
  intensity: "low" | "medium" | "high";
  needs_clarification: boolean;
  missing: string;
  source: "reader" | "fallback";
};

export const MODEL = process.env.OPENAI_MODEL || "gpt-6-luna";
export const READER_MODEL = process.env.OPENAI_READER_MODEL || "gpt-6-luna";
const EFFORT = process.env.OPENAI_REASONING_EFFORT ?? "low";

const VERSE = new Map(verses.map((v) => [v.id, v]));
const EXCERPTS = excerpts as Record<string, { by: string; text: string }[]>;
const SPEAKER: Record<string, string> = { "श्रीभगवान्": "Krishna", "अर्जुन": "Arjuna", "सञ्जय": "Sanjaya", "धृतराष्ट्र": "Dhritarashtra" };

/** Chat completion that retries without optional params some models reject (reasoning_effort, response_format). */
export async function createWithFallback<T extends OpenAI.ChatCompletionCreateParams>(client: OpenAI, params: T) {
  const attempt = async (p: OpenAI.ChatCompletionCreateParams) => client.chat.completions.create(p);
  try {
    return await attempt({ ...params, ...(EFFORT ? { reasoning_effort: EFFORT as "low" } : {}) });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (/reasoning_effort|response_format|unsupported|not supported/i.test(msg)) {
      const rest = { ...params } as Record<string, unknown>;
      if (/response_format/i.test(msg)) delete rest.response_format;
      return attempt(rest as unknown as OpenAI.ChatCompletionCreateParams);
    }
    throw e;
  }
}

export async function readSituation(client: OpenAI, history: Msg[], latest: string): Promise<Situation> {
  const fallback: Situation = {
    themes: guessThemes(latest),
    arjuna_moment: null,
    intensity: "medium",
    needs_clarification: false,
    missing: "",
    source: "fallback",
  };
  try {
    const recent = history
      .slice(-6)
      .map((m) => `${m.role === "user" ? "PERSON" : "COUNSELLOR"}: ${m.content.slice(0, 1200)}`)
      .join("\n\n");
    const res = (await Promise.race([
      createWithFallback(client, {
        model: READER_MODEL,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: READER_PROMPT },
          { role: "user", content: `CONVERSATION:\n${recent}\n\nLATEST MESSAGE:\n${latest}` },
        ],
      }),
      new Promise((_, rej) => setTimeout(() => rej(new Error("reader timeout")), 12000)),
    ])) as OpenAI.ChatCompletion;
    const raw = res.choices[0]?.message?.content ?? "";
    const j = JSON.parse(raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1));
    const themes = (Array.isArray(j.themes) ? j.themes : []).filter((k: string) => getTheme(k)).slice(0, 3);
    return {
      themes: themes.length ? themes : fallback.themes,
      arjuna_moment: getMoment(j.arjuna_moment) ? j.arjuna_moment : null,
      intensity: ["low", "medium", "high"].includes(j.intensity) ? j.intensity : "medium",
      needs_clarification: j.needs_clarification === true && j.intensity !== "high",
      missing: typeof j.missing === "string" ? j.missing.slice(0, 300) : "",
      source: "reader",
    };
  } catch (e) {
    console.warn("Situation reader failed, using keyword fallback:", e instanceof Error ? e.message : e);
    return fallback;
  }
}

/** Per-message context block (not cached): situation, Arjuna moment, verse shortlist with commentary. */
export function buildContext(style: Style, sit: Situation, history: Msg[], crisis: boolean, memory = "") {
  const cited = citedIn(history.filter((m) => m.role === "assistant").map((m) => m.content));
  const moment = getMoment(sit.arjuna_moment);
  // Only the Arjuna style pulls in the moment's answer verses; with no clear moment we never force chapter 1.
  const momentKey = style === "arjuna" ? (sit.arjuna_moment ?? null) : null;
  const shortlist = crisis ? [] : buildShortlist(sit.themes, momentKey, cited, 15);

  const lines: string[] = [];
  lines.push(`STYLE: ${style}`);
  lines.push(
    `SITUATION: themes=${sit.themes.join(", ")}; intensity=${sit.intensity}; needs_clarification=${sit.needs_clarification}` +
      (sit.missing ? `; missing=${sit.missing}` : ""),
  );
  if (style === "arjuna") {
    if (sit.arjuna_moment && moment) {
      lines.push(
        `ARJUNA MOMENT: ${moment.key}. Arjuna's words: ${moment.arjuna.join(", ")} (${moment.felt}). ` +
          `Modern parallel: ${moment.parallel}. Krishna's answer to cite: ${moment.answer.join(", ")}.`,
      );
    } else {
      lines.push(
        "ARJUNA MOMENT: none matched clearly. Choose the fitting moment yourself from anywhere in the Gita where Arjuna questions " +
          "or struggles (3.1-2, 3.36, 5.1, 6.33-34, 6.37-39, 11.45, 12.1, 14.21, 18.1...). Do not default to chapter 1.",
      );
    }
  }
  lines.push(`ALREADY_CITED: ${[...cited].join(", ") || "none"}`);
  if (shortlist.length) {
    lines.push("SHORTLIST (verse | speaker | translation; COMMENTARY EXCERPTS for the first eight):");
    shortlist.forEach((id, i) => {
      const v = VERSE.get(id);
      if (!v) return;
      lines.push(`${id} | ${SPEAKER[v.speaker] ?? v.speaker} | ${v.translation}`);
      if (i < 8) {
        for (const ex of (EXCERPTS[id] ?? []).slice(0, 3)) lines.push(`   - ${ex.by}: ${ex.text}`);
      }
    });
  }
  if (memory && !crisis) lines.push(memory);
  if (crisis) lines.push(`CRISIS: true`);
  return { text: lines.join("\n"), shortlist, cited: [...cited] };
}
