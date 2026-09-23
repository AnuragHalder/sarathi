"use client";

import { useEffect, useState } from "react";

const SEEN_KEY = "sarathi-welcomed";

/** Tells AmbientAudio what the visitor chose. Dispatched inside the click, so it counts as a user gesture. */
export const BEGIN_EVENT = "sarathi:begin";

/**
 * First-visit welcome screen. Its "Begin" tap is the user gesture browsers require before playing sound,
 * so the music starts the moment the visitor enters. Returning visitors skip it.
 */
export default function Welcome() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    let seen = false;
    try {
      seen = localStorage.getItem(SEEN_KEY) === "1";
    } catch {}
    // eslint-disable-next-line react-hooks/set-state-in-effect -- decided after hydration from saved state
    if (!seen) setShow(true);
  }, []);

  function enter(music: boolean) {
    try {
      localStorage.setItem(SEEN_KEY, "1");
    } catch {}
    window.dispatchEvent(new CustomEvent(BEGIN_EVENT, { detail: { music } }));
    setShow(false);
  }

  if (!show) return null;

  return (
    <div
      data-music-control
      role="dialog"
      aria-modal="true"
      aria-labelledby="welcome-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-bg px-6"
    >
      <div className="w-full max-w-sm text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icon-192.png" alt="" className="mx-auto h-16 w-16 rounded-full" />
        <h1 id="welcome-title" className="mt-5 font-serif text-3xl font-semibold">
          Sarathi
        </h1>
        <p className="mt-1 text-muted">Guidance from the Bhagavad Gita</p>
        <p className="mt-8 font-deva text-lg leading-relaxed text-gold" lang="sa">
          कर्मण्येवाधिकारस्ते मा फलेषु कदाचन
        </p>
        <p className="mt-2 text-sm italic text-muted">&ldquo;Your right is to the work, never to its fruits.&rdquo; (2.47)</p>
        <button
          onClick={() => enter(true)}
          autoFocus
          className="mt-10 w-full rounded-2xl bg-accent px-6 py-3.5 text-lg font-medium text-white outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 dark:text-[#1b120a]"
        >
          Begin
        </button>
        <button onClick={() => enter(false)} className="mt-4 text-sm text-muted underline-offset-4 hover:underline">
          Continue without sound
        </button>
      </div>
    </div>
  );
}
