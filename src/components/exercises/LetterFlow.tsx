"use client";

import { useCallback, useRef, useState } from "react";
import ExerciseShell, { Reading } from "./Shell";
import FireRelease from "./FireRelease";
import ReflectionView from "./ReflectionView";
import { EXERCISES, type LetterKind, type ReflectResult } from "@/lib/exercises";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { useAuth } from "@/lib/useAuth";

type Stage = "write" | "end" | "reading" | "reflection" | "fire" | "released" | "sealed" | "kept";

/**
 * One flow for every letter: write it, then choose: let Sarathi read it, keep it sealed (never read by the AI),
 * or release it into the fire (nothing saved). After a reading, it can still be released or kept.
 */
export default function LetterFlow({ kind, onClose }: { kind: LetterKind; onClose: () => void }) {
  const ex = EXERCISES[kind];
  const auth = useAuth();
  const signedIn = Boolean(auth.profile?.consented_at);
  const [to, setTo] = useState(ex.fixedTo ?? "");
  const [body, setBody] = useState("");
  const [stage, setStage] = useState<Stage>("write");
  const [result, setResult] = useState<ReflectResult | null>(null);
  const [error, setError] = useState("");
  const [releasedAfterReading, setReleasedAfterReading] = useState(false);
  const ta = useRef<HTMLTextAreaElement>(null);

  function addStarter(s: string) {
    setBody((b) => (b.trim() ? `${b.replace(/\s*$/, "")}\n\n${s} ` : `${s} `));
    requestAnimationFrame(() => {
      const el = ta.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(el.value.length, el.value.length);
    });
  }

  async function submit(mode: "read" | "seal") {
    setError("");
    setStage(mode === "read" ? "reading" : "sealed");
    const res = await fetch("/api/reflect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind, mode, to, body }),
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(j.error || "Something went wrong. Please try again.");
      setStage("end");
      return;
    }
    setResult(j as ReflectResult);
    if (mode === "read" || j.crisis) setStage("reflection");
  }

  /** After a reading: delete the words, keep only Sarathi's reflection (the lesson). */
  async function releaseAfterReading() {
    setReleasedAfterReading(true);
    setStage("fire");
    const sb = getBrowserSupabase();
    if (sb && result?.id) await sb.from("reflections").update({ body: null, released: true }).eq("id", result.id);
  }

  const onFireDone = useCallback(() => setStage("released"), []);

  return (
    <ExerciseShell title={ex.name} onClose={onClose}>
      {stage === "write" && (
        <div className="py-4">
          <p className="text-muted">{ex.tagline}</p>
          <div className="mt-4 rounded-2xl bg-[#f6ecd6] px-5 py-4 text-[#3a2a18] shadow-[0_0_40px_rgba(224,179,90,0.12)]">
            <label className="flex items-baseline gap-2 border-b border-[#d9c8a6] pb-2 font-serif text-lg">
              {ex.greeting ? (
                <span>{ex.greeting}</span>
              ) : (
                <>
                <span>Dear</span>
                <input
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  placeholder={ex.toHint}
                  maxLength={80}
                  className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-[#a8977b]"
                  aria-label="Who is this letter to?"
                />
                </>
              )}
            </label>
            <textarea
              ref={ta}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={10}
              maxLength={6000}
              placeholder="Write freely. No one else will read this."
              className="mt-3 w-full resize-none bg-transparent font-serif text-[16px] leading-relaxed outline-none placeholder:text-[#a8977b]"
              style={{ fieldSizing: "content", minHeight: "14rem" } as React.CSSProperties}
            />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {ex.starters.map((s) => (
              <button key={s} onClick={() => addStarter(s)} className="rounded-full border border-line px-3 py-1.5 text-sm text-muted hover:border-gold hover:text-ink">
                {s}
              </button>
            ))}
          </div>
          <button
            disabled={body.trim().length < 3}
            onClick={() => setStage("end")}
            className="mt-6 w-full rounded-2xl bg-accent px-6 py-3.5 font-medium text-[#1b120a] disabled:opacity-40"
          >
            I&apos;ve finished writing
          </button>
          <p className="mt-3 text-center text-xs text-muted">
            {signedIn ? "Only you can see your letters." : "As a guest, nothing you write here is saved."}
          </p>
        </div>
      )}

      {stage === "end" && (
        <div className="my-auto py-6">
          <h2 className="font-serif text-2xl font-semibold">What would you like to do with it?</h2>
          {error && <p className="mt-3 rounded-xl bg-danger-bg px-4 py-2 text-sm text-danger-ink">{error}</p>}
          <div className="mt-5 grid gap-3">
            <Choice title="Let Sarathi read it" text="Sarathi reflects on what you wrote, with a verse and one small step." onClick={() => submit("read")} primary />
            <Choice
              title="Keep it sealed"
              text={signedIn ? "Saved privately in Your letters. Sarathi will never read it." : "Sign in to keep sealed letters."}
              onClick={() => submit("seal")}
              disabled={!signedIn}
            />
            <Choice title="Release it into the fire" text="Let the words go. Nothing is read and nothing is saved." onClick={() => setStage("fire")} />
          </div>
          <button onClick={() => setStage("write")} className="mt-4 text-sm text-muted underline-offset-4 hover:underline">
            ← Back to the letter
          </button>
        </div>
      )}

      {stage === "reading" && <Reading what="your letter" />}

      {stage === "reflection" && result && (
        <div className="py-4">
          <ReflectionView result={result} userId={signedIn ? auth.profile!.id : null} />
          <div className="mt-6 grid gap-2">
            {!result.crisis && (
              <button onClick={releaseAfterReading} className="w-full rounded-2xl border border-line px-6 py-3 text-ink hover:border-gold">
                🔥 Release the letter into the fire
              </button>
            )}
            <button onClick={() => (signedIn ? setStage("kept") : onClose())} className="w-full rounded-2xl bg-accent px-6 py-3 font-medium text-[#1b120a]">
              {signedIn ? "Keep the letter" : "Done"}
            </button>
            {!signedIn && auth.enabled && (
              <button onClick={() => auth.signIn()} className="text-sm text-muted underline-offset-4 hover:underline">
                Sign in to keep your letters and let Sarathi remember
              </button>
            )}
          </div>
        </div>
      )}

      {stage === "fire" && <FireRelease text={body} onDone={onFireDone} />}

      {(stage === "released" || stage === "sealed" || stage === "kept") && (
        <div className="my-auto py-10 text-center">
          <p className="font-serif text-2xl leading-snug">
            {stage === "released"
              ? releasedAfterReading
                ? "The words are gone. What you learned stays."
                : "Some words only need to leave you."
              : stage === "sealed"
                ? "Sealed. It's kept privately in Your letters, and Sarathi will never read it."
                : "Kept safely in Your letters, only for you."}
          </p>
          {error && <p className="mt-3 text-sm text-danger-ink">{error}</p>}
          <button onClick={onClose} className="mt-8 w-full rounded-2xl bg-accent px-6 py-3 font-medium text-[#1b120a]">
            Return to Sarathi
          </button>
        </div>
      )}
    </ExerciseShell>
  );
}

function Choice({ title, text, onClick, primary, disabled }: { title: string; text: string; onClick: () => void; primary?: boolean; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`rounded-2xl border p-4 text-left transition disabled:opacity-50 ${primary ? "border-accent bg-accent-soft" : "border-line bg-surface hover:border-gold"}`}
    >
      <div className="font-serif text-lg font-semibold">{title}</div>
      <div className="mt-0.5 text-sm text-muted">{text}</div>
    </button>
  );
}
