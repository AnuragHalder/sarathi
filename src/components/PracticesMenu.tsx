"use client";

import Link from "next/link";
import { useState } from "react";
import CalmPlayer from "./CalmPlayer";
import LetterFlow from "./exercises/LetterFlow";
import FeetFlow from "./exercises/FeetFlow";
import { PRACTICE_LIST, PRACTICES, type PracticeId } from "@/lib/practices";
import { EXERCISE_LIST, type ExerciseKind } from "@/lib/exercises";

export type Open = { type: "calm"; id: PracticeId } | { type: "reflect"; kind: ExerciseKind } | null;

/** Opens the chosen practice or exercise. Used by the 🪔 sheet and by cards Sarathi suggests in chat. */
export function OpenExercise({ open, onClose }: { open: NonNullable<Open>; onClose: () => void }) {
  if (open.type === "calm") return <CalmPlayer practice={PRACTICES[open.id]} onClose={onClose} />;
  if (open.kind === "feet") return <FeetFlow onClose={onClose} />;
  return <LetterFlow kind={open.kind} onClose={onClose} />;
}

/** The 🪔 sheet: Calm (breathing) and Reflect (letters and rituals). Opens over the chat so the music keeps playing. */
export default function PracticesMenu({ onClose, signedIn }: { onClose: () => void; signedIn: boolean }) {
  const [open, setOpen] = useState<Open>(null);
  if (open) return <OpenExercise open={open} onClose={onClose} />;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center" role="dialog" aria-modal="true" aria-label="Practices">
      <button className="absolute inset-0" aria-label="Close" onClick={onClose} />
      <div className="relative max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-3xl border border-line bg-surface p-6 shadow-xl backdrop-blur-md">
        <h2 className="font-serif text-2xl font-semibold">Calm</h2>
        <p className="mt-1 text-sm text-muted">A few minutes to steady the mind, the way the Gita describes it.</p>
        <div className="mt-3 grid gap-2">
          {PRACTICE_LIST.map((p) => (
            <Item key={p.id} title={p.name} meta={`${p.minutes.join(" or ")} min`} text={p.tagline} onClick={() => setOpen({ type: "calm", id: p.id })} />
          ))}
        </div>
        <h2 className="mt-6 font-serif text-2xl font-semibold">Reflect</h2>
        <p className="mt-1 text-sm text-muted">Put down what you&apos;re carrying, in writing.</p>
        <div className="mt-3 grid gap-2">
          {EXERCISE_LIST.map((e) => (
            <Item key={e.kind} title={e.name} text={e.tagline} onClick={() => setOpen({ type: "reflect", kind: e.kind })} />
          ))}
        </div>
        {signedIn && (
          <Link href="/letters" className="mt-4 block text-center text-sm text-accent hover:underline">
            Your saved letters →
          </Link>
        )}
        <button onClick={onClose} className="mt-3 w-full text-sm text-muted hover:text-ink">
          Not now
        </button>
      </div>
    </div>
  );
}

function Item({ title, meta, text, onClick }: { title: string; meta?: string; text: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="rounded-2xl border border-line bg-surface-2 p-4 text-left transition hover:border-gold">
      <div className="flex items-baseline justify-between gap-3">
        <span className="font-serif text-lg font-semibold">{title}</span>
        {meta && <span className="shrink-0 text-xs text-muted">{meta}</span>}
      </div>
      <p className="mt-0.5 text-sm text-muted">{text}</p>
    </button>
  );
}
