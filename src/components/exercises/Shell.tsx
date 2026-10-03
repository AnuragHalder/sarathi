"use client";

import { useEffect, type ReactNode } from "react";

/** Full-screen, calm overlay used by every exercise (closes with Escape or the ×). */
export default function ExerciseShell({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div role="dialog" aria-modal="true" aria-label={title} className="fixed inset-0 z-50 overflow-y-auto bg-[rgba(8,6,17,0.86)] backdrop-blur-sm">
      <div className="mx-auto flex min-h-full max-w-xl flex-col px-5 pt-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold tracking-[0.18em] text-gold uppercase">{title}</p>
          <button onClick={onClose} className="rounded-full p-2 text-muted hover:text-ink" aria-label="Close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Reading({ what }: { what: string }) {
  return (
    <div className="my-auto flex flex-col items-center py-16 text-center">
      <span aria-hidden="true" className="text-4xl motion-safe:animate-pulse">🪔</span>
      <p className="mt-4 font-serif text-xl">Sarathi is reading {what}…</p>
      <p className="mt-1 text-sm text-muted">Take a slow breath while you wait.</p>
    </div>
  );
}
