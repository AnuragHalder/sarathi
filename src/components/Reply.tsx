"use client";

import ReactMarkdown from "react-markdown";
import VerseCard from "./VerseCard";

const TAG = /\[\[\s*(?:BG\s*)?(\d{1,2})\.(\d{1,2})\s*\]\]/gi;

/** Splits the model's reply into markdown text and [[ch.v]] verse cards. */
export default function Reply({ text, streaming }: { text: string; streaming?: boolean }) {
  // while streaming, hide a half-written tag like "[[2." at the end
  const clean = streaming ? text.replace(/\[\[[^\]]*$/, "") : text;
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
    </div>
  );
}
