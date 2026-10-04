"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Reply from "@/components/Reply";
import AmbientAudio from "@/components/AmbientAudio";
import Welcome from "@/components/Welcome";
import Sidebar, { type ConvItem } from "@/components/Sidebar";
import { ConsentDialog, SignInPrompt } from "@/components/Modals";
import CheckinOffer from "@/components/CheckinOffer";
import PracticesMenu, { OpenExercise, type Open } from "@/components/PracticesMenu";
import Tour from "@/components/Tour";
import { BEGIN_EVENT } from "@/components/Welcome";
import { GUEST_TOUR, MEMBER_TOUR, PRACTICES_SEEN_KEY, TOUR_KEYS } from "@/lib/tours";
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

/** One-tap ways into Calm & Reflect from the home screen. */
const SHORTCUTS: { icon: string; label: string; open: NonNullable<Open> }[] = [
  { icon: "🪔", label: "Steady Lamp", open: { type: "calm", id: "steady-lamp" } },
  { icon: "✉️", label: "Unsent letter", open: { type: "reflect", kind: "unsent" } },
  { icon: "🪷", label: "Lay it at Krishna's feet", open: { type: "reflect", kind: "feet" } },
];

/** Gentle starts: tapping one begins the message in the person's own words; they carry on typing. */
const TOPICS: { label: string; starter: string }[] = [
  { label: "Work", starter: "It's about my work: " },
  { label: "Family", starter: "It's about my family: " },
  { label: "A relationship", starter: "It's about a relationship: " },
  { label: "Loss", starter: "I've lost someone or something: " },
  { label: "Self-doubt", starter: "I've been doubting myself: " },
  { label: "A decision", starter: "I have to make a decision: " },
  { label: "Something else", starter: "" },
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
  const [calmOpen, setCalmOpen] = useState(false);
  const [exercise, setExercise] = useState<Open>(null);
  const [tour, setTour] = useState<"guest" | "member" | null>(null);
  const [practicesSeen, setPracticesSeen] = useState(true);
  const [guestUsed, setGuestUsed] = useState(0);
  const [authError, setAuthError] = useState(false);
  const currentIdRef = useRef<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  /** Put a topic's opening words in the box and place the cursor after them, ready to keep typing. */
  function startWith(starter: string) {
    setInput(starter);
    requestAnimationFrame(() => {
      const ta = taRef.current;
      if (!ta) return;
      ta.focus();
      ta.setSelectionRange(starter.length, starter.length);
    });
  }
  const openedFromUrl = useRef(false);
  /** A one-tap answer from a check-in email ("It helped"…), sent once that conversation is open. */
  const pendingAnswer = useRef<{ conv: string; checkin: string; answer: string; text: string } | null>(null);
  const [signInReason, setSignInReason] = useState<"limit" | "checkin">("limit");

  const selectConv = (id: string | null) => {
    currentIdRef.current = id;
    setCurrentId(id);
    setUrlChat(id);
  };

  // ---- discoverability: the "new" dot on Calm & Reflect, and the first-visit walkthrough
  const seen = (k: string) => {
    try {
      return localStorage.getItem(k) === "1";
    } catch {
      return true;
    }
  };
  const markSeen = (k: string) => {
    try {
      localStorage.setItem(k, "1");
    } catch {}
  };
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- read the saved flag after hydration
    setPracticesSeen(seen(PRACTICES_SEEN_KEY));
  }, []);
  function openPractices() {
    markSeen(PRACTICES_SEEN_KEY);
    setPracticesSeen(true);
    setCalmOpen(true);
  }
  function openExercise(o: NonNullable<Open>) {
    markSeen(PRACTICES_SEEN_KEY);
    setPracticesSeen(true);
    setExercise(o);
  }
  function startTour() {
    setSidebarOpen(false);
    window.scrollTo({ top: 0 });
    setTour(signedIn ? "member" : "guest");
  }
  function endTour() {
    if (tour) markSeen(TOUR_KEYS[tour]);
    setTour(null);
  }
  // Show the tour once: guests after the welcome screen, members after their first sign-in (privacy consent).
  useEffect(() => {
    if (!auth.ready || tour) return;
    const kind = profile?.consented_at ? "member" : profile ? null : "guest";
    if (!kind || seen(TOUR_KEYS[kind]) || new URL(window.location.href).searchParams.get("c")) return;
    if (kind === "guest" && !seen("sarathi-welcomed")) {
      const onBegin = () => window.setTimeout(() => setTour("guest"), 900);
      window.addEventListener(BEGIN_EVENT, onBegin, { once: true });
      return () => window.removeEventListener(BEGIN_EVENT, onBegin);
    }
    const t = window.setTimeout(() => setTour(kind), 900);
    return () => window.clearTimeout(t);
  }, [auth.ready, profile, tour]);

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
  // Keep the newest reply in view, including when verse cards finish loading and grow, but not if the
  // person has scrolled up to read something earlier.
  const stickToBottom = useRef(true);
  const autoScrollAt = useRef(0);
  useEffect(() => {
    const onScroll = () => {
      if (Date.now() - autoScrollAt.current < 800) return; // our own smooth scroll, not the reader
      stickToBottom.current = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 160;
    };
    const ro = new ResizeObserver(() => {
      if (!stickToBottom.current) return;
      autoScrollAt.current = Date.now();
      window.scrollTo({ top: document.documentElement.scrollHeight });
    });
    ro.observe(document.body);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      ro.disconnect();
      window.removeEventListener("scroll", onScroll);
    };
  }, []);
  useEffect(() => {
    if (!stickToBottom.current) return;
    autoScrollAt.current = Date.now();
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, busy]); // busy: also after the reply finishes, so the check-in offer below it comes into view

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
        const params = new URL(window.location.href).searchParams;
        const id = params.get("c");
        const checkin = params.get("checkin");
        const answer = params.get("a");
        if (id && checkin && answer && ["helped", "hard", "not_yet"].includes(answer)) {
          if (!profile) {
            // Opened from the email on a device where they aren't signed in yet.
            setSignInReason("checkin");
            setAskSignIn(true);
            return;
          }
          const fallback = { helped: "It helped.", hard: "It's still hard.", not_yet: "I haven't tried it yet." }[answer as "helped"];
          const text = (params.get("t") || "").slice(0, 60).trim() || fallback;
          pendingAnswer.current = { conv: id, checkin, answer, text };
        }
        if (id) openConversation(id);
      }
    })();
  }, [auth.ready, profile?.id, profile?.consented_at]); // eslint-disable-line react-hooks/exhaustive-deps

  // Send the email's one-tap answer as soon as its conversation is showing.
  useEffect(() => {
    const p = pendingAnswer.current;
    if (!p || busy || currentId !== p.conv || !messages.length || !profile?.consented_at) return;
    pendingAnswer.current = null;
    const url = new URL(window.location.href);
    ["checkin", "a", "t"].forEach((k) => url.searchParams.delete(k));
    window.history.replaceState(null, "", url);
    getBrowserSupabase()
      ?.from("checkins")
      .update({ answer: p.answer, answered_at: new Date().toISOString() })
      .eq("id", p.checkin)
      .then(() => {});
    send(p.text);
  }, [currentId, messages.length, busy, profile?.consented_at]); // eslint-disable-line react-hooks/exhaustive-deps

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

  /** The check-in offer goes under the newest reply, only when it has a practice and wasn't a crisis. */
  function showCheckinOffer(m: ChatMsg, i: number) {
    if (!signedIn || !profile?.consented_at || busy || i !== messages.length - 1) return false;
    if (!m.fresh || m.crisis || !/\[\[\s*practice\s*\]\]/i.test(m.content)) return false;
    if (messages.some((x) => x.crisis)) return false;
    if (profile.checkins_enabled) return true;
    // After "No thanks", don't offer again for two weeks.
    const declined = profile.checkins_declined_at ? Date.parse(profile.checkins_declined_at) : 0;
    return Date.now() - declined > 14 * 24 * 3600_000;
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
    stickToBottom.current = true;
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
        if (res.status === 429 && err.guest && auth.enabled) setAskSignIn(true);
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
          copy[copy.length - 1] = { role: "assistant", content: snapshot, style, crisis, fresh: true };
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
      taRef.current?.focus({ preventScroll: true }); // keep the smooth scroll to the new reply going
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
        onSignIn={() => auth.signIn(window.location.pathname + window.location.search)}
        onSignOut={async () => {
          await auth.signOut();
          newChat();
        }}
        onOpenPractices={() => {
          setSidebarOpen(false);
          openPractices();
        }}
        onTour={startTour}
      />

      <div className="mx-auto flex min-h-dvh w-full min-w-0 max-w-2xl flex-col">
        <header className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b border-line bg-bg/55 px-4 py-3 backdrop-blur-md">
          <div className="flex min-w-0 items-center gap-2">
            <button
              onClick={() => setSidebarOpen(true)}
              className="-ml-1 rounded-full p-2 text-muted hover:text-ink lg:hidden"
              aria-label="Open your conversations"
              data-tour="conversations"
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
              <button onClick={newChat} className="rounded-full border border-line px-2.5 py-1 text-sm text-muted hover:text-ink" aria-label="New chat">
                <span aria-hidden="true" className="sm:hidden">＋</span>
                <span className="hidden sm:inline">New chat</span>
              </button>
            )}
            <button
              onClick={openPractices}
              data-tour="practices"
              className={`glow-gold relative flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-sm text-ink hover:text-gold ${practicesSeen ? "" : "breathe-gold"}`}
              aria-label="Calm and Reflect: breathing practices, letters and rituals"
            >
              <span aria-hidden="true">🪔</span>
              <span className="hidden sm:inline">Calm &amp; Reflect</span>
              {!practicesSeen && <span className="new-dot" aria-label="New" />}
            </button>
            <span data-tour="music" className="rounded-full">
              <AmbientAudio />
            </span>
            {auth.enabled && auth.ready && !signedIn && (
              <button
                onClick={() => auth.signIn(window.location.pathname + window.location.search)}
                data-tour="signin"
                className="shrink-0 rounded-full bg-accent px-3 py-1 text-sm font-medium text-[#1b120a] shadow-[0_0_14px_rgba(251,146,60,0.35)]"
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

              <h2 className="mt-8 mb-2 text-sm font-medium text-muted">What is it about?</h2>
              <div className="flex flex-wrap gap-2" data-tour="topics">
                {TOPICS.map((t) => (
                  <button
                    key={t.label}
                    onClick={() => startWith(t.starter)}
                    className="rounded-full border border-line bg-surface px-4 py-2 text-sm hover:border-gold"
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              <h2 className="mt-5 mb-2 text-sm font-medium text-muted">Or try</h2>
              <div className="flex flex-wrap gap-2" data-tour="shortcuts">
                {SHORTCUTS.map((sc) => (
                  <button
                    key={sc.label}
                    onClick={() => openExercise(sc.open)}
                    className="glow-gold flex items-center gap-1.5 rounded-full border bg-surface px-3.5 py-2 text-sm hover:text-gold"
                  >
                    <span aria-hidden="true">{sc.icon}</span>
                    {sc.label}
                  </button>
                ))}
              </div>
              <h2 className="mt-8 mb-2 text-sm font-medium text-muted">Choose how you&apos;d like guidance</h2>
              <div className="grid gap-2 sm:grid-cols-3" data-tour="styles">
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

            </section>
          ) : (
            <section className="space-y-5 pt-5" aria-live="polite">
              {messages.map((m, i) =>
                m.role === "user" ? (
                  <div key={i} className="flex justify-end">
                    <p className="max-w-[85%] rounded-2xl rounded-br-md bg-accent px-4 py-2.5 whitespace-pre-wrap text-[#1b120a]">
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
                    {showCheckinOffer(m, i) && currentId && (
                      <CheckinOffer conversationId={currentId} enabled={Boolean(profile?.checkins_enabled)} onEnabled={auth.reload} />
                    )}
                  </div>
                ),
              )}
              <div ref={endRef} />
            </section>
          )}
        </main>

        <footer className="sticky bottom-0 border-t border-line bg-bg/85 px-4 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-md">
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
              className="h-11 rounded-2xl bg-accent px-4 font-medium text-[#1b120a] disabled:opacity-40"
            >
              Ask
            </button>
          </form>
          <p className="mt-2 text-center text-[11px] leading-snug text-muted">
            Sarathi offers reflections, not professional advice. In crisis? Call Tele-MANAS{" "}
            <a href="tel:14416" className="underline">
              14416
            </a>{" "}
            (24x7, free). ·{" "}
            <a href="/privacy" className="underline">
              Privacy
            </a>{" "}
            ·{" "}
            <a href="/terms" className="underline">
              Terms
            </a>{" "}
            ·{" "}
            <a href="/refunds" className="underline">
              Refunds
            </a>{" "}
            ·{" "}
            <a href="/contact" className="underline">
              Contact
            </a>{" "}
            ·{" "}
            <button onClick={startTour} className="underline">
              How Sarathi works
            </button>{" "}
            <span className="opacity-60">· v3.11</span>
          </p>
        </footer>
      </div>

      {exercise && <OpenExercise open={exercise} onClose={() => setExercise(null)} />}
      {tour && <Tour steps={tour === "member" ? MEMBER_TOUR : GUEST_TOUR} onDone={endTour} />}
      {calmOpen && <PracticesMenu signedIn={Boolean(profile?.consented_at)} onClose={() => setCalmOpen(false)} />}
      {askSignIn && (
        <SignInPrompt
          reason={signInReason}
          onSignIn={() => auth.signIn(window.location.pathname + window.location.search)}
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
