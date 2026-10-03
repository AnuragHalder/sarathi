"use client";

import { useState } from "react";
import CalmPlayer from "./CalmPlayer";
import { PRACTICE_LIST, PRACTICES, type PracticeId } from "@/lib/practices";

/** The Calm button's sheet: pick a practice; it opens over the chat so the background music keeps playing. */
export default function CalmMenu({ onClose }: { onClose: () => void }) {
  const [open, setOpen] = useState<PracticeId | null>(null);
  if (open) return <CalmPlayer practice={PRACTICES[open]} onClose={onClose} />;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center" role="dialog" aria-modal="true" aria-label="Calm">
      <button className="absolute inset-0" aria-label="Close" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-3xl border border-line bg-surface p-6 shadow-xl backdrop-blur-md">
        <h2 className="font-serif text-2xl font-semibold">Calm</h2>
        <p className="mt-1 text-sm text-muted">A few minutes to steady the mind, the way the Gita describes it.</p>
        <div className="mt-4 grid gap-2">
          {PRACTICE_LIST.map((p) => (
            <button key={p.id} onClick={() => setOpen(p.id)} className="rounded-2xl border border-line bg-surface-2 p-4 text-left transition hover:border-gold">
              <div className="flex items-baseline justify-between gap-3">
                <span className="font-serif text-lg font-semibold">{p.name}</span>
                <span className="shrink-0 text-xs text-muted">{p.minutes.join(" or ")} min · {p.verseId}</span>
              </div>
              <p className="mt-0.5 text-sm text-muted">{p.tagline}</p>
            </button>
          ))}
        </div>
        <button onClick={onClose} className="mt-4 w-full text-sm text-muted hover:text-ink">Not now</button>
      </div>
    </div>
  );
}
