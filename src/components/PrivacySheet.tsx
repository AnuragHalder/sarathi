"use client";

import Link from "next/link";
import { useEffect } from "react";
import { MEMORY_PROMISE, PRIVACY_PROMISES } from "@/lib/privacyPromises";

/** "Your privacy, in plain words": opened from the 🔒 line above the message box and the header. */
export default function PrivacySheet({ onClose, signedIn }: { onClose: () => void; signedIn: boolean }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center" role="dialog" aria-modal="true" aria-labelledby="privacy-title">
      <button className="absolute inset-0" aria-label="Close" onClick={onClose} />
      <div className="relative max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-3xl border border-line bg-surface p-6 shadow-xl backdrop-blur-md">
        <p className="text-2xl" aria-hidden="true">🔒</p>
        <h2 id="privacy-title" className="mt-1 font-serif text-2xl font-semibold">Your privacy, in plain words</h2>
        <p className="mt-1 text-sm text-muted">Talk freely. No appointment, no consultation fee, and no one judging you.</p>
        <ul className="mt-4 space-y-3">
          {PRIVACY_PROMISES.map((p) => (
            <li key={p.title} className="flex gap-3">
              <span aria-hidden="true" className="mt-0.5 text-gold">✦</span>
              <span>
                <span className="block font-medium">{p.title}</span>
                <span className="block text-sm text-muted">{p.text}</span>
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-5 rounded-2xl bg-accent-soft px-4 py-3 text-sm">{MEMORY_PROMISE}</p>
        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-sm">
          {signedIn && (
            <Link href="/memory" className="text-accent hover:underline">
              See what Sarathi knows →
            </Link>
          )}
          <Link href="/privacy" className="text-accent hover:underline">
            Full privacy policy →
          </Link>
        </div>
        <button onClick={onClose} className="mt-5 w-full rounded-xl bg-accent px-4 py-2.5 font-medium text-[#1b120a]">
          Got it
        </button>
      </div>
    </div>
  );
}
