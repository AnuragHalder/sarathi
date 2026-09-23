"use client";

import { useEffect, useRef, useState } from "react";
import Reply from "@/components/Reply";
import AmbientAudio from "@/components/AmbientAudio";
import { STYLES, type Style } from "@/lib/styles";

type Msg = { role: "user" | "assistant"; content: string; style?: Style; crisis?: boolean };

const SUGGESTIONS = [
  "I'm anxious about my career and can't stop overthinking results.",
  "I lost someone close to me and I can't move on.",
  "I get angry quickly and later regret it.",
  "I don't know what my purpose in life is.",
  "Mujhe exam ka bahut darr lag raha hai.",
];

export default function Home() {
  const [style, setStyle] = useState<Style>("verse");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    try {
      const s = localStorage.getItem("sarathi-style") as Style | null;
      // eslint-disable-next-line react-hooks/set-state-in-effect -- restore saved preference after hydration
      if (s && s in STYLES) setStyle(s);
    } catch {}
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem("sarathi-style", style);
    } catch {}
  }, [style]);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  async function send(text: string) {
    const content = text.trim();
    if (!content || busy) return;
    const history: Msg[] = [...messages, { role: "user", content }];
    setMessages([...history, { role: "assistant", content: "", style }]);
    setInput("");
    setBusy(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ style, messages: history.map(({ role, content }) => ({ role, content })) }),
      });
      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Request failed (${res.status})`);
      }
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      let headerDone = false;
      let crisis = false;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        if (!headerDone) {
          const nl = buf.indexOf("\n");
          if (nl === -1) continue;
          try {
            crisis = !!JSON.parse(buf.slice(0, nl)).crisis;
          } catch {}
          buf = buf.slice(nl + 1);
          headerDone = true;
        }
        const snapshot = buf;
        setMessages((m) => {
          const copy = [...m];
          copy[copy.length - 1] = { role: "assistant", content: snapshot, style, crisis };
          return copy;
        });
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Something went wrong";
      setMessages((m) => {
        const copy = [...m];
        copy[copy.length - 1] = { role: "assistant", content: `_${msg}_`, style };
        return copy;
      });
    } finally {
      setBusy(false);
      taRef.current?.focus();
    }
  }

  const empty = messages.length === 0;

  return (
    <div className="mx-auto flex min-h-dvh max-w-2xl flex-col">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-bg/90 px-4 py-3 backdrop-blur">
        <button onClick={() => setMessages([])} className="flex items-center gap-2" aria-label="New conversation">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icon-192.png" alt="" className="h-8 w-8 rounded-full" />
          <div className="text-left">
            <div className="font-serif text-lg leading-none font-semibold">Sarathi</div>
            <div className="text-xs text-muted">Guidance from the Bhagavad Gita</div>
          </div>
        </button>
        <div className="flex items-center gap-2">
          {!empty && (
            <button
              onClick={() => setMessages([])}
              className="rounded-full border border-line px-3 py-1 text-sm text-muted hover:text-ink"
            >
              New chat
            </button>
          )}
          <AmbientAudio />
        </div>
      </header>

      <main className="flex-1 px-4 pb-4">
        {empty ? (
          <section className="pt-8">
            <p className="font-deva text-center text-gold" lang="sa">
              कर्मण्येवाधिकारस्ते मा फलेषु कदाचन
            </p>
            <h1 className="mt-3 text-center font-serif text-3xl font-semibold">What is weighing on you?</h1>
            <p className="mt-2 text-center text-muted">
              Share what you&apos;re facing. Sarathi responds with the wisdom of the Gita.
            </p>

            <h2 className="mt-8 mb-2 text-sm font-medium text-muted">Choose how you&apos;d like guidance</h2>
            <div className="grid gap-2 sm:grid-cols-3">
              {(Object.keys(STYLES) as Style[]).map((k) => (
                <button
                  key={k}
                  onClick={() => setStyle(k)}
                  aria-pressed={style === k}
                  className={`rounded-2xl border p-3 text-left transition ${
                    style === k ? "border-accent bg-accent-soft" : "border-line bg-surface hover:border-gold"
                  }`}
                >
                  <div className="font-serif font-semibold">{STYLES[k].label}</div>
                  <div className="mt-1 text-sm leading-snug text-muted">{STYLES[k].blurb}</div>
                </button>
              ))}
            </div>

            <h2 className="mt-8 mb-2 text-sm font-medium text-muted">Or start with</h2>
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="rounded-full border border-line bg-surface px-3 py-1.5 text-left text-sm hover:border-gold"
                >
                  {s}
                </button>
              ))}
            </div>
          </section>
        ) : (
          <section className="space-y-5 pt-5" aria-live="polite">
            {messages.map((m, i) =>
              m.role === "user" ? (
                <div key={i} className="flex justify-end">
                  <p className="max-w-[85%] rounded-2xl rounded-br-md bg-accent px-4 py-2.5 whitespace-pre-wrap text-white dark:text-[#1b120a]">
                    {m.content}
                  </p>
                </div>
              ) : (
                <div key={i}>
                  {m.crisis && <CrisisBanner />}
                  <div className="mb-1 text-xs font-medium text-muted">
                    Sarathi · {m.style ? STYLES[m.style].label : ""}
                  </div>
                  {m.content ? (
                    <Reply text={m.content} streaming={busy && i === messages.length - 1} />
                  ) : (
                    <p className="animate-pulse text-muted">Reflecting…</p>
                  )}
                </div>
              ),
            )}
            <div ref={endRef} />
          </section>
        )}
      </main>

      <footer className="sticky bottom-0 border-t border-line bg-bg/95 px-4 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur">
        <div className="mb-2 flex gap-1 overflow-x-auto text-xs" role="radiogroup" aria-label="Guidance style">
          {(Object.keys(STYLES) as Style[]).map((k) => (
            <button
              key={k}
              role="radio"
              aria-checked={style === k}
              onClick={() => setStyle(k)}
              className={`shrink-0 rounded-full border px-3 py-1 ${
                style === k ? "border-accent bg-accent-soft font-medium text-accent" : "border-line text-muted"
              }`}
            >
              {STYLES[k].label}
            </button>
          ))}
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="flex items-end gap-2"
        >
          <textarea
            ref={taRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(input);
              }
            }}
            rows={1}
            placeholder="Describe your situation…"
            className="max-h-40 min-h-11 flex-1 resize-none rounded-2xl border border-line bg-surface px-4 py-2.5 outline-none focus:border-accent"
            style={{ fieldSizing: "content" } as React.CSSProperties}
          />
          <button
            type="submit"
            disabled={busy || !input.trim()}
            className="h-11 rounded-2xl bg-accent px-4 font-medium text-white disabled:opacity-40 dark:text-[#1b120a]"
          >
            Ask
          </button>
        </form>
        <p className="mt-2 text-center text-[11px] leading-snug text-muted">
          Sarathi offers reflections, not professional advice. In crisis? Call Tele-MANAS{" "}
          <a href="tel:14416" className="underline">
            14416
          </a>{" "}
          (24x7, free). <span className="opacity-60">· v2.2</span>
        </p>
      </footer>
    </div>
  );
}

function CrisisBanner() {
  return (
    <div role="alert" className="mb-3 rounded-2xl bg-danger-bg p-4 text-danger-ink">
      <p className="font-semibold">You don&apos;t have to face this alone.</p>
      <p className="mt-1 text-sm">
        Please talk to someone now. Tele-MANAS:{" "}
        <a href="tel:14416" className="font-semibold underline">
          14416
        </a>{" "}
        or{" "}
        <a href="tel:18008914416" className="font-semibold underline">
          1-800-891-4416
        </a>{" "}
        (free, 24x7, many Indian languages). In an emergency, call{" "}
        <a href="tel:112" className="font-semibold underline">
          112
        </a>
        .
      </p>
    </div>
  );
}
