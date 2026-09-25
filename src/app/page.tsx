"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Reply from "@/components/Reply";
import AmbientAudio from "@/components/AmbientAudio";
import Welcome from "@/components/Welcome";
import Sidebar, { type ConvItem } from "@/components/Sidebar";
import { ConsentDialog, SignInPrompt } from "@/components/Modals";
import { STYLES, type Style } from "@/lib/styles";
import { useAuth } from "@/lib/useAuth";
import { getBrowserSupabase } from "@/lib/supabase/client";
import {
  clearGuestChats,
  deleteGuestChat,
  GUEST_CHAT_LIMIT,
  listGuestChats,
  saveGuestChat,
  titleFrom,
  type ChatMsg,
} from "@/lib/guest";

const SUGGESTIONS = [
  "I'm anxious about my career and can't stop overthinking results.",
  "I lost someone close to me and I can't move on.",
  "I get angry quickly and later regret it.",
  "I don't know what my purpose in life is.",
  "Mujhe exam ka bahut darr lag raha hai.",
];

function setUrlChat(id: string | null) {
  const url = new URL(window.location.href);
  if (id) url.searchParams.set("c", id);
  else url.searchParams.delete("c");
  url.searchParams.delete("auth_error");
  window.history.replaceState(null, "", url);
}

export default function Home() {
  const auth = useAuth();
  const profile = auth.profile;
  const signedIn = Boolean(profile);

  const [style, setStyle] = useState<Style>("verse");
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [convs, setConvs] = useState<ConvItem[]>([]);
  const [convsLoading, setConvsLoading] = useState(false);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [askSignIn, setAskSignIn] = useState(false);
  const [guestUsed, setGuestUsed] = useState(0);
  const [authError, setAuthError] = useState(false);
  const currentIdRef = useRef<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const openedFromUrl = useRef(false);

  const selectConv = (id: string | null) => {
    currentIdRef.current = id;
    setCurrentId(id);
    setUrlChat(id);
  };

  // ---- preferences
  useEffect(() => {
    try {
      const s = localStorage.getItem("sarathi-style") as Style | null;
      // eslint-disable-next-line react-hooks/set-state-in-effect -- restore saved preference after hydration
      if (s && s in STYLES) setStyle(s);
      if (new URL(window.location.href).searchParams.get("auth_error")) setAuthError(true);
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

  // ---- conversation list
  const refreshList = useCallback(async () => {
    const sb = getBrowserSupabase();
    if (profile && sb) {
      setConvsLoading(true);
      const { data } = await sb
        .from("conversations")
        .select("id, title, style, updated_at")
        .order("updated_at", { ascending: false })
        .limit(100);
      setConvs((data ?? []) as ConvItem[]);
      setConvsLoading(false);
    } else {
      const g = listGuestChats();
      setGuestUsed(g.length);
      setConvs(g.map((c) => ({ id: c.id, title: c.title, style: c.style, updated_at: c.updatedAt })));
    }
  }, [profile]);

  const openConversation = useCallback(
    async (id: string) => {
      setSidebarOpen(false);
      const sb = getBrowserSupabase();
      if (profile && sb) {
        const [{ data: conv }, { data: msgs }] = await Promise.all([
          sb.from("conversations").select("id, style").eq("id", id).maybeSingle(),
          sb.from("messages").select("role, content, style, crisis").eq("conversation_id", id).order("id"),
        ]);
        if (!conv) return;
        selectConv(id);
        setStyle(conv.style as Style);
        setMessages((msgs ?? []) as ChatMsg[]);
      } else {
        const g = listGuestChats().find((c) => c.id === id);
        if (!g) return;
        selectConv(id);
        setStyle(g.style);
        setMessages(g.messages);
      }
    },
    [profile],
  );

  // Load the list whenever sign-in state changes; move guest chats into a new account.
  useEffect(() => {
    if (!auth.ready) return;
    (async () => {
      if (profile?.consented_at) {
        const guest = listGuestChats();
        if (guest.length) {
          const res = await fetch("/api/import-guest", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ chats: guest }),
          });
          if (res.ok) {
            clearGuestChats();
            // The open guest chat now lives in the account under a new id; start fresh.
            if (currentIdRef.current && guest.some((g) => g.id === currentIdRef.current)) {
              selectConv(null);
              setMessages([]);
            }
          }
        }
      }
      await refreshList();
      if (!openedFromUrl.current) {
        openedFromUrl.current = true;
        const id = new URL(window.location.href).searchParams.get("c");
        if (id) openConversation(id);
      }
    })();
  }, [auth.ready, profile?.id, profile?.consented_at]); // eslint-disable-line react-hooks/exhaustive-deps

  function newChat() {
    if (busy) return;
    selectConv(null);
    setMessages([]);
    setSidebarOpen(false);
    taRef.current?.focus();
  }

  async function deleteConversation(id: string) {
    const sb = getBrowserSupabase();
    if (profile && sb) {
      // Also forget memory notes that came only from this conversation.
      await sb.from("memories").delete().eq("source_conversation_id", id);
      await sb.from("conversations").delete().eq("id", id);
    } else {
      deleteGuestChat(id);
    }
    if (id === currentIdRef.current) newChat();
    refreshList();
  }

  // ---- sending
  async function send(text: string) {
    const content = text.trim();
    if (!content || busy) return;
    if (signedIn && !profile?.consented_at) return;
    // Guests get a few free conversations, then we ask them to sign in.
    if (auth.enabled && !signedIn && !currentIdRef.current && listGuestChats().length >= GUEST_CHAT_LIMIT) {
      setAskSignIn(true);
      return;
    }
    const history: ChatMsg[] = [...messages, { role: "user", content }];
    setMessages([...history, { role: "assistant", content: "", style }]);
    setInput("");
    setBusy(true);
    let finalText = "";
    let crisis = false;
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          style,
          conversationId: signedIn ? currentIdRef.current : null,
          messages: history.map(({ role, content }) => ({ role, content })),
        }),
      });
      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Request failed (${res.status})`);
      }
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      let headerDone = false;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        if (!headerDone) {
          const nl = buf.indexOf("\n");
          if (nl === -1) continue;
          try {
            const h = JSON.parse(buf.slice(0, nl));
            crisis = !!h.crisis;
            if (signedIn && h.conversationId && !currentIdRef.current) selectConv(h.conversationId);
          } catch {}
          buf = buf.slice(nl + 1);
          headerDone = true;
        }
        const snapshot = buf;
        finalText = snapshot;
        setMessages((m) => {
          const copy = [...m];
          copy[copy.length - 1] = { role: "assistant", content: snapshot, style, crisis };
          return copy;
        });
      }
      // Guests: keep the conversation in this browser.
      if (!signedIn && finalText.trim()) {
        const id = currentIdRef.current ?? (crypto.randomUUID?.() ?? String(Date.now()));
        if (!currentIdRef.current) selectConv(id);
        saveGuestChat({
          id,
          title: titleFrom(history.find((m) => m.role === "user")?.content ?? content),
          style,
          updatedAt: new Date().toISOString(),
          messages: [...history, { role: "assistant", content: finalText, style, crisis }],
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
      refreshList();
      taRef.current?.focus();
    }
  }

  const empty = messages.length === 0;
  const guestLeft = Math.max(0, GUEST_CHAT_LIMIT - guestUsed);

  return (
    <div className="flex min-h-dvh">
      <Welcome />
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        items={convs}
        loading={convsLoading}
        currentId={currentId}
        onSelect={openConversation}
        onNew={newChat}
        onDelete={deleteConversation}
        profile={profile}
        authEnabled={auth.enabled}
        guestLeft={guestLeft}
        onSignIn={() => auth.signIn()}
        onSignOut={async () => {
          await auth.signOut();
          newChat();
        }}
      />

      <div className="mx-auto flex min-h-dvh w-full min-w-0 max-w-2xl flex-col">
        <header className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b border-line bg-bg/90 px-4 py-3 backdrop-blur">
          <div className="flex min-w-0 items-center gap-2">
            <button
              onClick={() => setSidebarOpen(true)}
              className="-ml-1 rounded-full p-2 text-muted hover:text-ink lg:hidden"
              aria-label="Open your conversations"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <path d="M4 7h16M4 12h16M4 17h10" />
              </svg>
            </button>
            <button onClick={newChat} className="flex min-w-0 items-center gap-2" aria-label="New conversation">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/icon-192.png" alt="" className="h-8 w-8 rounded-full" />
              <div className="min-w-0 text-left">
                <div className="font-serif text-lg leading-none font-semibold">Sarathi</div>
                <div className="truncate text-xs text-muted">Guidance from the Bhagavad Gita</div>
              </div>
            </button>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {!empty && (
              <button onClick={newChat} className="rounded-full border border-line px-3 py-1 text-sm text-muted hover:text-ink">
                New chat
              </button>
            )}
            <AmbientAudio />
            {auth.enabled && auth.ready && !signedIn && (
              <button
                onClick={() => auth.signIn()}
                className="hidden rounded-full border border-line px-3 py-1 text-sm text-muted hover:text-ink sm:block"
              >
                Sign in
              </button>
            )}
          </div>
        </header>

        <main className="flex-1 px-4 pb-4">
          {authError && (
            <p className="mt-4 rounded-xl bg-danger-bg px-4 py-3 text-sm text-danger-ink">
              Sign-in didn&apos;t complete. Please try again.
            </p>
          )}
          {empty ? (
            <section className="pt-8">
              <p className="font-deva text-center text-gold" lang="sa">
                कर्मण्येवाधिकारस्ते मा फलेषु कदाचन
              </p>
              <h1 className="mt-3 text-center font-serif text-3xl font-semibold">
                {profile?.name ? `What is weighing on you, ${profile.name.split(" ")[0]}?` : "What is weighing on you?"}
              </h1>
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
                    <div className="mb-1 text-xs font-medium text-muted">Sarathi · {m.style ? STYLES[m.style].label : ""}</div>
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
            (24x7, free). <span className="opacity-60">· v3.0</span>
          </p>
        </footer>
      </div>

      {askSignIn && (
        <SignInPrompt
          onSignIn={() => auth.signIn()}
          onClose={() => setAskSignIn(false)}
        />
      )}
      {profile && !profile.consented_at && (
        <ConsentDialog
          name={profile.name}
          onAccept={async (memory) => {
            await auth.updateProfile({ consented_at: new Date().toISOString(), memory_enabled: memory });
          }}
          onDecline={() => auth.signOut()}
        />
      )}
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
