"use client";

import { useState } from "react";
import ExerciseShell, { Reading } from "./Shell";
import ReflectionView from "./ReflectionView";
import type { ReflectResult } from "@/lib/exercises";
import { useAuth } from "@/lib/useAuth";

type Stage = "list" | "sort" | "offer" | "choose" | "reading" | "reflection";

/**
 * Lay it at Krishna's feet (2.47, 18.66): list worries, sort them into "in my hands" and "not in my hands",
 * offer the second pile at a golden lotus, choose one thing to do today, and hear from Sarathi.
 */
export default function FeetFlow({ onClose }: { onClose: () => void }) {
  const auth = useAuth();
  const signedIn = Boolean(auth.profile?.consented_at);
  const [stage, setStage] = useState<Stage>("list");
  const [draft, setDraft] = useState("");
  const [worries, setWorries] = useState<string[]>([]);
  const [sorted, setSorted] = useState<Record<number, "in" | "out">>({});
  const [offering, setOffering] = useState(false);
  const [chosen, setChosen] = useState("");
  const [result, setResult] = useState<ReflectResult | null>(null);
  const [error, setError] = useState("");

  const inHands = worries.filter((_, i) => sorted[i] === "in");
  const notInHands = worries.filter((_, i) => sorted[i] === "out");
  const nextUnsorted = worries.findIndex((_, i) => !sorted[i]);

  function add() {
    const w = draft.trim();
    if (!w || worries.length >= 12) return;
    setWorries((x) => [...x, w.slice(0, 200)]);
    setDraft("");
  }

  async function ask() {
    setError("");
    setStage("reading");
    const res = await fetch("/api/reflect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "feet", mode: "read", items: { inHands, notInHands, chosen } }),
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(j.error || "Something went wrong. Please try again.");
      setStage("choose");
      return;
    }
    setResult(j as ReflectResult);
    setStage("reflection");
  }

  function offer() {
    setOffering(true);
    window.setTimeout(() => {
      setOffering(false);
      if (inHands.length) setStage("choose");
      else ask();
    }, 3600);
  }

  return (
    <ExerciseShell title="Lay it at Krishna's feet" onClose={onClose}>
      {stage === "list" && (
        <div className="py-4">
          <h2 className="font-serif text-2xl font-semibold">What is weighing on you?</h2>
          <p className="mt-1 text-muted">Write each worry as a short line. Big or small, it all counts.</p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              add();
            }}
            className="mt-4 flex gap-2"
          >
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="e.g. Whether I'll get the job"
              maxLength={200}
              className="min-w-0 flex-1 rounded-2xl border border-line bg-surface px-4 py-2.5 outline-none focus:border-accent"
              aria-label="A worry"
            />
            <button type="submit" disabled={!draft.trim()} className="rounded-2xl border border-line px-4 text-muted hover:text-ink disabled:opacity-40">
              Add
            </button>
          </form>
          <ul className="mt-4 grid gap-2">
            {worries.map((w, i) => (
              <li key={i} className="flex items-center justify-between gap-3 rounded-xl border border-line bg-surface px-4 py-2.5">
                <span>{w}</span>
                <button onClick={() => setWorries((x) => x.filter((_, j) => j !== i))} className="text-muted hover:text-ink" aria-label={`Remove ${w}`}>
                  ×
                </button>
              </li>
            ))}
          </ul>
          <button
            disabled={!worries.length}
            onClick={() => setStage("sort")}
            className="mt-6 w-full rounded-2xl bg-accent px-6 py-3.5 font-medium text-[#1b120a] disabled:opacity-40"
          >
            That&apos;s everything for now
          </button>
          {!signedIn && <p className="mt-3 text-center text-xs text-muted">As a guest, nothing you write here is saved.</p>}
        </div>
      )}

      {stage === "sort" && (
        <div className="my-auto py-6 text-center">
          <p className="text-sm text-muted">
            {Math.min(nextUnsorted === -1 ? worries.length : nextUnsorted + 1, worries.length)} of {worries.length}
          </p>
          {nextUnsorted !== -1 ? (
            <>
              <p className="mt-6 font-serif text-2xl leading-snug">&ldquo;{worries[nextUnsorted]}&rdquo;</p>
              <p className="mt-3 text-muted">Is this in your hands?</p>
              <div className="mt-6 grid grid-cols-2 gap-3">
                <button onClick={() => setSorted((s) => ({ ...s, [nextUnsorted]: "in" }))} className="rounded-2xl border border-accent bg-accent-soft p-4 font-medium">
                  In my hands
                </button>
                <button onClick={() => setSorted((s) => ({ ...s, [nextUnsorted]: "out" }))} className="rounded-2xl border border-line bg-surface p-4 font-medium hover:border-gold">
                  Not in my hands
                </button>
              </div>
              <p className="mt-6 text-sm text-muted italic">&ldquo;Your right is to the work alone, never to its fruits.&rdquo; (2.47)</p>
            </>
          ) : (
            <>
              <p className="mt-4 font-serif text-2xl">All sorted.</p>
              <button
                onClick={() => (notInHands.length ? setStage("offer") : setStage("choose"))}
                className="mt-6 w-full rounded-2xl bg-accent px-6 py-3.5 font-medium text-[#1b120a]"
              >
                Continue
              </button>
            </>
          )}
        </div>
      )}

      {stage === "offer" && (
        <div className="my-auto flex flex-col items-center py-6 text-center">
          <Lotus glow={offering} />
          <p className="mt-2 max-w-sm text-muted">
            {offering ? "Offered. You don't have to carry these alone." : "These are not yours to control. Offer them, and let them rest at the lotus."}
          </p>
          <ul className="mt-6 flex flex-wrap justify-center gap-2">
            {notInHands.map((w, i) => (
              <li key={i} className={`rounded-full border border-gold/50 bg-surface px-4 py-2 text-sm ${offering ? "petal-rise" : ""}`} style={{ animationDelay: `${i * 0.25}s` }}>
                {w}
              </li>
            ))}
          </ul>
          {!offering && (
            <button onClick={offer} className="mt-8 w-full max-w-sm rounded-2xl bg-accent px-6 py-3.5 font-medium text-[#1b120a]">
              Offer them
            </button>
          )}
          <p className="mt-6 text-sm text-muted italic">&ldquo;Surrender to Me; I will free you. Do not grieve.&rdquo; (18.66)</p>
        </div>
      )}

      {stage === "choose" && (
        <div className="py-6">
          <h2 className="font-serif text-2xl font-semibold">What is in your hands</h2>
          <p className="mt-1 text-muted">Choose one thing to do something about today. Just one.</p>
          {error && <p className="mt-3 rounded-xl bg-danger-bg px-4 py-2 text-sm text-danger-ink">{error}</p>}
          <div className="mt-4 grid gap-2" role="radiogroup">
            {inHands.map((w) => (
              <button
                key={w}
                role="radio"
                aria-checked={chosen === w}
                onClick={() => setChosen(w)}
                className={`rounded-2xl border p-4 text-left ${chosen === w ? "border-accent bg-accent-soft" : "border-line bg-surface hover:border-gold"}`}
              >
                {w}
              </button>
            ))}
          </div>
          <button
            disabled={!chosen && inHands.length > 0}
            onClick={ask}
            className="mt-6 w-full rounded-2xl bg-accent px-6 py-3.5 font-medium text-[#1b120a] disabled:opacity-40"
          >
            Ask Sarathi
          </button>
        </div>
      )}

      {stage === "reading" && <Reading what="what you laid down" />}

      {stage === "reflection" && result && (
        <div className="py-4">
          <ReflectionView result={result} userId={signedIn ? auth.profile!.id : null} />
          <button onClick={onClose} className="mt-6 w-full rounded-2xl bg-accent px-6 py-3 font-medium text-[#1b120a]">
            Return to Sarathi
          </button>
        </div>
      )}
    </ExerciseShell>
  );
}

/** A glowing golden lotus where the offered worries come to rest. */
function Lotus({ glow }: { glow: boolean }) {
  const petal = "M0 0 C -16 -22 -12 -52 0 -70 C 12 -52 16 -22 0 0 Z";
  return (
    <svg width="220" height="170" viewBox="-110 -130 220 170" aria-hidden="true" style={{ overflow: "visible" }}>
      <defs>
        <radialGradient id="lotus-glow">
          <stop offset="0" stopColor="#ffe3a1" stopOpacity="0.7" />
          <stop offset="1" stopColor="#e0b35a" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="lotus-petal" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#b7791f" />
          <stop offset="1" stopColor="#f6dc93" />
        </linearGradient>
      </defs>
      <circle cx="0" cy="-30" r="110" fill="url(#lotus-glow)" className={glow ? "lotus-glow" : ""} opacity={glow ? 1 : 0.55} />
      <g fill="url(#lotus-petal)" stroke="#fff1c9" strokeWidth="1" strokeOpacity="0.6">
        {[-75, -50, 50, 75].map((a) => (
          <path key={a} d={petal} transform={`translate(0 0) rotate(${a}) scale(0.85)`} opacity="0.8" />
        ))}
        {[-25, 25].map((a) => (
          <path key={a} d={petal} transform={`rotate(${a})`} opacity="0.92" />
        ))}
        <path d={petal} transform="scale(1.1)" />
      </g>
      <ellipse cx="0" cy="6" rx="70" ry="8" fill="#e0b35a" opacity="0.25" />
    </svg>
  );
}
