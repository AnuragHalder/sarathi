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
