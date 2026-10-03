"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import CalmPlayer from "@/components/CalmPlayer";
import { isPracticeId, PRACTICE_LIST, PRACTICES, type PracticeId } from "@/lib/practices";

/** The Calm space: short guided practices, each anchored in a Gita verse. Free for everyone. */
export default function CalmPage() {
  const [open, setOpen] = useState<PracticeId | null>(null);

  // /calm?p=steady-lamp opens a practice straight away (used by the cards Sarathi suggests in chat).
  useEffect(() => {
    const p = new URL(window.location.href).searchParams.get("p");
    // eslint-disable-next-line react-hooks/set-state-in-effect -- read the link after hydration
    if (isPracticeId(p)) setOpen(p);
  }, []);

  return (
    <main className="mx-auto min-h-dvh max-w-2xl px-4 py-6">
      <Link href="/" className="text-sm text-accent hover:underline">
        ← Back to Sarathi
      </Link>
      <h1 className="mt-4 font-serif text-3xl font-semibold">Calm</h1>
      <p className="mt-2 text-muted">
        A few minutes to steady the mind, the way the Gita describes it. Find a quiet spot, and use headphones if
        you like.
      </p>
      <div className="mt-6 grid gap-3">
        {PRACTICE_LIST.map((p) => (
          <button
            key={p.id}
            onClick={() => setOpen(p.id)}
            className="rounded-2xl border border-line bg-surface p-5 text-left transition hover:border-gold"
          >
            <div className="flex items-baseline justify-between gap-3">
              <span className="font-serif text-xl font-semibold">{p.name}</span>
              <span className="shrink-0 text-xs text-muted">{p.minutes.join(" or ")} min · {p.verseId}</span>
            </div>
            <p className="mt-1 text-muted">{p.tagline}</p>
          </button>
        ))}
      </div>
      <p className="mt-8 text-center text-xs text-muted">
        These are gentle reflective practices, not medical treatment. In crisis, call Tele-MANAS{" "}
        <a href="tel:14416" className="underline">14416</a> (free, 24x7).
      </p>
      {open && (
        <CalmPlayer
          practice={PRACTICES[open]}
          onClose={() => {
            setOpen(null);
            window.history.replaceState(null, "", "/calm");
          }}
        />
      )}
    </main>
  );
}
