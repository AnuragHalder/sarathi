"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import VerseCard from "./VerseCard";
import CalmPlayer from "./CalmPlayer";
import { isPracticeId, PRACTICES, type PracticeId } from "@/lib/practices";

const TAG = /\[\[\s*(?:BG\s*)?(\d{1,2})\.(\d{1,2})\s*\]\]/gi;
// The one practice, written by Sarathi as [[practice]] … [[/practice]]. While streaming it may still be open.
const PRACTICE = /\[\[\s*practice\s*\]\]([\s\S]*?)(?:\[\[\s*\/\s*practice\s*\]\]|$)/i;

// A calm practice Sarathi suggests: [[calm:steady-lamp]] or [[calm:bring-back]].
const CALM = /\[\[\s*calm\s*:\s*([a-z-]+)\s*\]\]/gi;

/** A tappable card that opens a calm practice right here, without leaving the conversation. */
function CalmCard({ id }: { id: PracticeId }) {
  const [open, setOpen] = useState(false);
  const p = PRACTICES[id];
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="my-3 flex w-full items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3 text-left transition hover:border-gold"
      >
        <span aria-hidden="true" className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-accent-soft text-xl">🪔</span>
        <span className="min-w-0">
          <span className="block font-serif text-lg font-semibold">Try {p.name} · {p.minutes[0]} min</span>
          <span className="block text-sm text-muted">{p.tagline}</span>
        </span>
      </button>
      {open && <CalmPlayer practice={p} onClose={() => setOpen(false)} />}
    </>
  );
}

/** A highlighted card for today's practice. */
function PracticeCard({ text }: { text: string }) {
  return (
    <aside className="my-3 rounded-2xl border border-gold/40 bg-accent-soft px-4 py-3">
      <div className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.12em] text-gold uppercase">
        <span aria-hidden="true">✦</span> Today&apos;s practice
      </div>
      <ReactMarkdown>{text}</ReactMarkdown>
    </aside>
  );
}

/** Splits the model's reply into markdown text and [[ch.v]] verse cards. */
export default function Reply({ text, streaming }: { text: string; streaming?: boolean }) {
  // while streaming, hide a half-written tag like "[[2." or "[[prac" at the end
  let clean = streaming ? text.replace(/\[\[[^\]]*$/, "") : text;
  // suggested calm practice (at most one card), wherever the tag was written
  const calmId = [...clean.matchAll(CALM)].map((m) => m[1].toLowerCase()).find(isPracticeId);
  clean = clean.replace(CALM, "");
  // pull out the practice (shown as its own card after the text that precedes it)
  let practice: { before: string; text: string; after: string } | null = null;
  const pm = clean.match(PRACTICE);
  if (pm && pm.index !== undefined) {
    practice = { before: clean.slice(0, pm.index), text: pm[1].trim(), after: clean.slice(pm.index + pm[0].length) };
    clean = practice.before;
  }
  const parts: { kind: "md" | "verse"; value: string }[] = [];
  const seen = new Set<string>();
  let last = 0;
  for (const m of clean.matchAll(TAG)) {
    const id = `${Number(m[1])}.${Number(m[2])}`;
    parts.push({ kind: "md", value: clean.slice(last, m.index) });
    if (!seen.has(id)) parts.push({ kind: "verse", value: id });
    seen.add(id);
    last = (m.index ?? 0) + m[0].length;
  }
  parts.push({ kind: "md", value: clean.slice(last) });

  // If the model put a tag mid-sentence ("…unchangeable [[2.11]]. And…"), the punctuation after the
  // card would start a new line on its own. Move it back to the end of the text before the card.
  for (let i = 1; i < parts.length - 1; i++) {
    if (parts[i].kind !== "verse") continue;
    const next = parts[i + 1];
    const prev = parts[i - 1];
    if (next?.kind !== "md" || prev?.kind !== "md") continue;
    // punctuation right after the card, possibly on its own line (never a "- " list marker)
    const m = next.value.match(/^\s*([.,;:!?)]+)[ \t]*(?=\s|$)/);
    if (!m) continue;
    next.value = next.value.slice(m[0].length);
    if (!/[.,;:!?]\s*$/.test(prev.value)) prev.value = prev.value.replace(/\s*$/, m[1]);
  }

  return (
    <div className="prose-reply">
      {parts.map((p, i) =>
        p.kind === "verse" ? (
          <VerseCard key={i} id={p.value} />
        ) : p.value.trim() ? (
          <ReactMarkdown key={i}>{p.value}</ReactMarkdown>
        ) : null,
      )}
      {practice && practice.text && <PracticeCard text={practice.text} />}
      {practice && practice.after.trim() && <Reply text={practice.after} streaming={streaming} />}
      {calmId && !streaming && <CalmCard id={calmId} />}
    </div>
  );
}
