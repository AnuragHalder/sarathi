"use client";

import { useState } from "react";
import VerseCard from "../VerseCard";
import type { ReflectResult } from "@/lib/exercises";
import { getBrowserSupabase } from "@/lib/supabase/client";

/** Sarathi's reading of an exercise: reflection, verse, one step, and (with permission) what to remember. */
export default function ReflectionView({ result, userId }: { result: ReflectResult; userId: string | null }) {
  const [memState, setMemState] = useState<"ask" | "saved" | "no">("ask");
  const notes = result.remember ?? [];

  async function remember() {
    const sb = getBrowserSupabase();
    if (!sb || !userId) return;
    const { error } = await sb.from("memories").insert(notes.map((n) => ({ user_id: userId, type: n.type, content: n.content, importance: 3 })));
    setMemState(error ? "no" : "saved");
  }

  return (
    <div className="text-left">
      <div className="mb-2 text-xs font-medium text-muted">Sarathi</div>
      <div className="space-y-3 leading-relaxed">
        {result.reflection.split(/\n\s*\n/).map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>
      {result.crisis && (
        <a href="tel:14416" className="mt-4 block rounded-2xl bg-accent px-4 py-3 text-center font-medium text-[#1b120a]">
          Call Tele-MANAS 14416 (free, 24x7)
        </a>
      )}
      {result.verse && <VerseCard id={result.verse} />}
      {result.step && (
        <aside className="my-3 rounded-2xl border border-gold/40 bg-accent-soft px-4 py-3">
          <div className="mb-1 text-[11px] font-semibold tracking-[0.12em] text-gold uppercase">✦ A step for today</div>
          <p>{result.step}</p>
        </aside>
      )}
      {userId && notes.length > 0 && memState !== "no" && (
        <div className="mt-4 rounded-2xl border border-line bg-surface p-4">
          {memState === "saved" ? (
            <p className="text-sm text-muted">I&apos;ll remember. You can see or delete it on the &ldquo;What Sarathi knows&rdquo; page.</p>
          ) : (
            <>
              <p className="font-serif text-lg">May I remember this, to help you later?</p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted">
                {notes.map((n, i) => (
                  <li key={i}>{n.content}</li>
                ))}
              </ul>
              <div className="mt-3 flex gap-2">
                <button onClick={remember} className="rounded-xl bg-accent px-4 py-2 text-sm font-medium text-[#1b120a]">
                  Yes, remember
                </button>
                <button onClick={() => setMemState("no")} className="rounded-xl border border-line px-4 py-2 text-sm text-muted hover:text-ink">
                  No
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
