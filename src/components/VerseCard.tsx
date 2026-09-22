"use client";

import { useEffect, useState } from "react";
import { SPEAKER_EN } from "@/lib/speakers";

type Verse = {
  id: string; chapter: number; verse: number; speaker: string; sanskrit: string;
  transliteration: string; translation: string; translationBy: string; hindi: string;
};

type Comm = { key: string; author: string; type: string; label: string; text: string };

export default function VerseCard({ id }: { id: string }) {
  const [v, setV] = useState<Verse | null | "missing">(null);
  const [tab, setTab] = useState<"en" | "hi">("en");
  const [open, setOpen] = useState(false);
  const [comms, setComms] = useState<Comm[] | null>(null);
  const [pick, setPick] = useState(0);
  const [err, setErr] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch(`/verse/${id}.json`)
      .then((r) => (r.ok ? r.json() : "missing"))
      .then((d) => alive && setV(d))
      .catch(() => alive && setV("missing"));
    return () => {
      alive = false;
    };
  }, [id]);

  if (v === "missing") return null; // model cited a non-existent verse: silently drop it
  if (!v)
    return <div className="my-3 h-40 animate-pulse rounded-2xl border border-line bg-surface-2" aria-label="Loading verse" />;

  async function toggleCommentary() {
    const next = !open;
    setOpen(next);
    if (next && !comms) {
      try {
        const r = await fetch(`/commentary/${id}.json`);
        const data: Comm[] = await r.json();
        // English first, then Hindi, then Sanskrit
        const order: Record<string, number> = { ec: 0, et: 1, hc: 2, ht: 3, sc: 4 };
        data.sort((a, b) => (order[a.type] ?? 9) - (order[b.type] ?? 9));
        setComms(data);
      } catch {
        setErr(true);
      }
    }
  }

  const c = comms?.[pick];

  return (
    <figure className="my-3 overflow-hidden rounded-2xl border border-line bg-surface shadow-sm">
      <div className="flex items-center justify-between border-b border-line bg-surface-2 px-4 py-2">
        <span className="font-serif text-sm font-semibold text-accent">Bhagavad Gita {v.id}</span>
        <span className="text-xs text-muted">{SPEAKER_EN[v.speaker] ?? v.speaker}</span>
      </div>
      <div className="px-4 pt-3 pb-4">
        <p className="font-deva text-[1.08rem] leading-relaxed whitespace-pre-line text-ink" lang="sa">
          {v.sanskrit}
        </p>
        <p className="mt-2 text-sm italic leading-relaxed whitespace-pre-line text-muted">{v.transliteration}</p>

        <div className="mt-3 flex gap-1 text-xs" role="tablist">
          {(["en", "hi"] as const).map((t) => (
            <button
              key={t}
              role="tab"
              aria-selected={tab === t}
              onClick={() => setTab(t)}
              className={`rounded-full px-2.5 py-1 ${tab === t ? "bg-accent-soft text-accent font-medium" : "text-muted hover:text-ink"}`}
            >
              {t === "en" ? "English" : "हिन्दी"}
            </button>
          ))}
        </div>
        <blockquote className="mt-2 border-l-2 border-gold pl-3 leading-relaxed">
          {tab === "en" ? v.translation : v.hindi || v.translation}
          <footer className="mt-1 text-xs text-muted">
            {tab === "hi" && v.hindi ? "Swami Tejomayananda" : `Tr. ${v.translationBy}`}
          </footer>
        </blockquote>

        <button onClick={toggleCommentary} className="mt-3 text-sm font-medium text-accent hover:underline">
          {open ? "Hide commentaries ▲" : "Read commentaries ▼"}
        </button>
        {open && (
          <div className="mt-2 rounded-xl bg-surface-2 p-3">
            {err && <p className="text-sm text-muted">Couldn&apos;t load commentaries.</p>}
            {!comms && !err && <p className="text-sm text-muted">Loading…</p>}
            {comms && comms.length > 0 && (
              <>
                <select
                  value={pick}
                  onChange={(e) => setPick(Number(e.target.value))}
                  className="w-full rounded-lg border border-line bg-surface px-2 py-1.5 text-sm"
                  aria-label="Choose commentary"
                >
                  {comms.map((x, i) => (
                    <option key={i} value={i}>
                      {x.author} · {x.label}
                    </option>
                  ))}
                </select>
                {c && (
                  <p
                    className={`mt-3 max-h-72 overflow-y-auto text-sm leading-relaxed whitespace-pre-line ${c.type === "sc" || c.type.startsWith("h") ? "font-deva" : ""}`}
                  >
                    {c.text}
                  </p>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </figure>
  );
}
