import OpenAI from "openai";
import { getServerSupabase, getUserId } from "@/lib/supabase/server";
import { allowRequest, GUEST_DAILY, USER_DAILY } from "@/lib/rateLimit";
import { isCrisis } from "@/lib/prompts";
import { EXERCISES, isExerciseKind, type ReflectResult } from "@/lib/exercises";
import { CRISIS_REFLECTION, reflectOn } from "@/lib/reflect";

export const runtime = "nodejs";
export const maxDuration = 60;

type Body = {
  kind?: string;
  mode?: "read" | "seal";
  to?: string;
  body?: string;
  items?: { inHands?: string[]; notInHands?: string[]; chosen?: string };
};

const clean = (s: unknown, max: number) => (typeof s === "string" ? s.trim().slice(0, max) : "");
const list = (a: unknown) => (Array.isArray(a) ? a.map((x) => clean(x, 200)).filter(Boolean).slice(0, 20) : []);

/**
 * A finished exercise. mode "read": Sarathi reflects on it. mode "seal": saved privately, never read by the AI.
 * Signed-in people's exercises are saved (unless they later release them); guests' are never stored.
 */
export async function POST(req: Request) {
  const b = (await req.json().catch(() => ({}))) as Body;
  if (!isExerciseKind(b.kind)) return Response.json({ error: "Unknown exercise." }, { status: 400 });
  const kind = b.kind;
  const ex = EXERCISES[kind];
  const to = clean(ex.fixedTo ?? b.to, 80);
  const body = clean(b.body, 6000);
  const items = kind === "feet" ? { inHands: list(b.items?.inHands), notInHands: list(b.items?.notInHands), chosen: clean(b.items?.chosen, 200) } : null;
  if (kind === "feet" ? !items!.inHands.length && !items!.notInHands.length : body.length < 3) {
    return Response.json({ error: "Write a little first." }, { status: 400 });
  }

  const supabase = await getServerSupabase();
  const userId = supabase ? await getUserId(supabase) : null;
  const allText = kind === "feet" ? [...items!.inHands, ...items!.notInHands].join("\n") : body;
  const crisis = isCrisis(allText);
  const sealed = b.mode === "seal" && kind !== "feet";

  let result: ReflectResult;
  if (crisis) {
    result = { crisis: true, reflection: CRISIS_REFLECTION, verse: null, step: null, remember: [] };
  } else if (sealed) {
    if (!supabase || !userId) return Response.json({ error: "Sign in to keep sealed letters." }, { status: 401 });
    result = { reflection: "", verse: null, step: null, remember: [] };
  } else {
    if (!process.env.OPENAI_API_KEY) return Response.json({ error: "OPENAI_API_KEY is not set on the server." }, { status: 500 });
    if (!(await allowRequest(req, supabase, userId))) {
      return Response.json(
        { error: userId ? `You've reached today's limit of ${USER_DAILY} messages.` : `You've reached today's guest limit of ${GUEST_DAILY} messages.`, limit: true },
        { status: 429 },
      );
    }
    const input =
      kind === "feet"
        ? `IN MY HANDS:\n- ${items!.inHands.join("\n- ") || "(none)"}\n\nNOT IN MY HANDS (offered):\n- ${items!.notInHands.join("\n- ") || "(none)"}\n\nWHAT I'LL DO TODAY: ${items!.chosen || "(not chosen)"}`
        : `TO: ${to || "(no name)"}\n\n${body}`;
    try {
      result = await reflectOn(new OpenAI(), kind, input);
    } catch (e) {
      console.error("Reflect failed:", e instanceof Error ? e.message : e);
      return Response.json({ error: "Sarathi couldn't read this just now. Please try again." }, { status: 502 });
    }
  }

  // Save for signed-in people (never for guests, never memory notes in a crisis).
  let id: string | null = null;
  if (supabase && userId) {
    const { data: profile } = await supabase.from("profiles").select("memory_enabled, consented_at").eq("id", userId).maybeSingle();
    if (!profile?.consented_at) return Response.json({ ...result, id: null, remember: [] });
    const { data, error } = await supabase
      .from("reflections")
      .insert({
        user_id: userId,
        kind,
        to_name: kind === "feet" ? null : to || null,
        body: kind === "feet" ? null : body,
        items,
        sealed,
        response: sealed ? null : { reflection: result.reflection, verse: result.verse, step: result.step, crisis: Boolean(result.crisis) },
      })
      .select("id")
      .single();
    if (error) console.error("Save reflection failed:", error.message);
    id = data?.id ?? null;
    if (profile.memory_enabled === false) result.remember = [];
  } else {
    result.remember = [];
  }
  return Response.json({ ...result, id });
}
