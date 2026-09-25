"use client";

import Link from "next/link";
import { useState } from "react";
import { STYLES, type Style } from "@/lib/styles";
import type { Profile } from "@/lib/useAuth";

export type ConvItem = { id: string; title: string; style: Style; updated_at: string };

function when(iso: string) {
  const d = new Date(iso);
  const days = Math.floor((Date.now() - d.getTime()) / 86400000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

type Props = {
  open: boolean;
  onClose: () => void;
  items: ConvItem[];
  loading: boolean;
  currentId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  profile: Profile | null;
  authEnabled: boolean;
  guestLeft: number;
  onSignIn: () => void;
  onSignOut: () => void;
};

/** Chat history: a fixed column on desktop, a slide-out drawer on phones. */
export default function Sidebar(p: Props) {
  const [confirming, setConfirming] = useState<string | null>(null);

  const body = (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <span className="font-serif text-lg font-semibold">Your conversations</span>
        <button onClick={p.onClose} className="rounded-full p-1.5 text-muted hover:text-ink lg:hidden" aria-label="Close panel">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </button>
      </div>
      <div className="px-3">
        <button
          onClick={p.onNew}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-3 py-2.5 text-sm font-medium text-white dark:text-[#1b120a]"
        >
          <span aria-hidden="true">＋</span> New conversation
        </button>
      </div>

      <nav className="mt-3 flex-1 overflow-y-auto px-2 pb-3" aria-label="Past conversations">
        {p.loading && <p className="px-3 py-2 text-sm text-muted">Loading…</p>}
        {!p.loading && p.items.length === 0 && (
          <p className="px-3 py-2 text-sm text-muted">Your conversations will appear here.</p>
        )}
        <ul className="space-y-1">
          {p.items.map((c) => (
            <li key={c.id}>
              {confirming === c.id ? (
                <div className="rounded-xl border border-line bg-surface p-3 text-sm">
                  <p>Delete this conversation{p.profile ? " and anything Sarathi learned only from it" : ""}?</p>
                  <div className="mt-2 flex gap-2">
                    <button
                      onClick={() => {
                        p.onDelete(c.id);
                        setConfirming(null);
                      }}
                      className="rounded-lg bg-danger-bg px-3 py-1.5 font-medium text-danger-ink"
                    >
                      Delete
                    </button>
                    <button onClick={() => setConfirming(null)} className="rounded-lg border border-line px-3 py-1.5 text-muted">
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  className={`group flex items-center rounded-xl ${c.id === p.currentId ? "bg-accent-soft" : "hover:bg-surface-2"}`}
                >
                  <button onClick={() => p.onSelect(c.id)} className="min-w-0 flex-1 px-3 py-2.5 text-left">
                    <span className="block truncate text-sm font-medium">{c.title}</span>
                    <span className="block text-xs text-muted">
                      {STYLES[c.style]?.label ?? "Conversation"} · {when(c.updated_at)}
                    </span>
                  </button>
                  <button
                    onClick={() => setConfirming(c.id)}
                    className="mr-1 rounded-lg p-2 text-muted opacity-70 hover:text-danger-ink hover:opacity-100 lg:opacity-0 lg:group-hover:opacity-100 lg:focus:opacity-100"
                    aria-label={`Delete "${c.title}"`}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
                    </svg>
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      </nav>

      <div className="border-t border-line p-3">
        {p.profile ? (
          <div className="flex items-center gap-3">
            {p.profile.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={p.profile.avatar_url} alt="" className="h-9 w-9 rounded-full" referrerPolicy="no-referrer" />
            ) : (
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent-soft font-medium text-accent">
                {(p.profile.name ?? "?")[0]}
              </span>
            )}
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">{p.profile.name ?? p.profile.email}</div>
              <Link href="/memory" className="text-xs text-accent hover:underline">
                What Sarathi knows about me
              </Link>
            </div>
            <button onClick={p.onSignOut} className="text-xs text-muted hover:text-ink">
              Sign out
            </button>
          </div>
        ) : p.authEnabled ? (
          <div className="rounded-xl bg-surface-2 p-3">
            <p className="text-sm">
              {p.guestLeft > 0
                ? `Sign in to save your conversations and let Sarathi remember you. ${p.guestLeft} free ${p.guestLeft === 1 ? "chat" : "chats"} left as a guest.`
                : "Sign in to keep talking. Your conversations so far will be saved to your account."}
            </p>
            <GoogleButton onClick={p.onSignIn} className="mt-3 w-full" />
          </div>
        ) : (
          <p className="px-1 text-xs text-muted">Conversations are saved in this browser only.</p>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop column */}
      <aside className="hidden w-72 shrink-0 border-r border-line bg-bg lg:block">
        <div className="sticky top-0 h-dvh">{body}</div>
      </aside>
      {/* Mobile drawer */}
      {p.open && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Your conversations">
          <button className="absolute inset-0 bg-black/40" onClick={p.onClose} aria-label="Close panel" />
          <aside className="absolute inset-y-0 left-0 w-[85%] max-w-80 bg-bg shadow-xl">{body}</aside>
        </div>
      )}
    </>
  );
}

export function GoogleButton({ onClick, className = "" }: { onClick: () => void; className?: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center justify-center gap-2 rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-medium text-[#1f1f1f] hover:bg-[#f7f7f7] ${className}`}
    >
      <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
        <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
        <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
        <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
        <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
      </svg>
      Continue with Google
    </button>
  );
}
