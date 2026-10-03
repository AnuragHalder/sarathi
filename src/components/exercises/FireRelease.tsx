"use client";

import { useEffect, useMemo, useState } from "react";

/**
 * Ahuti: the letter burns from the bottom up into a soft fire, embers rise, and it is gone.
 * Calls onDone when the flames have finished (about 4 seconds; 1 second with reduced motion).
 */
export default function FireRelease({ text, onDone }: { text: string; onDone: () => void }) {
  const [still, setStill] = useState(false);
  const embers = useMemo(
    () =>
      Array.from({ length: 22 }, (_, i) => ({
        left: 8 + ((i * 37) % 84),
        delay: (i % 7) * 0.35,
        size: 3 + (i % 3) * 2,
        drift: ((i * 13) % 40) - 20,
      })),
    [],
  );

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- read the device setting after mount
    setStill(reduce);
    const t = window.setTimeout(onDone, reduce ? 1200 : 4300);
    return () => window.clearTimeout(t);
  }, [onDone]);

  return (
    <div className="my-auto py-8">
      <div className="relative mx-auto max-w-md">
        <div className={still ? "ahuti-fade" : "ahuti-burn"}>
          <div className="max-h-80 overflow-hidden rounded-xl bg-[#f6ecd6] px-5 py-4 font-serif text-[15px] leading-relaxed whitespace-pre-wrap text-[#3a2a18] shadow-[0_0_40px_rgba(251,146,60,0.25)]">
            {text}
          </div>
        </div>
        {!still && <div className="ahuti-edge" aria-hidden="true" />}
        {!still &&
          embers.map((e, i) => (
            <span
              key={i}
              aria-hidden="true"
              className="ahuti-ember"
              style={{ left: `${e.left}%`, width: e.size, height: e.size, animationDelay: `${0.6 + e.delay}s`, ["--drift" as string]: `${e.drift}px` }}
            />
          ))}
      </div>
      <p className="mt-8 text-center font-serif text-xl text-gold">स्वाहा</p>
      <p className="mt-1 text-center text-sm text-muted">Offered into the fire.</p>
    </div>
  );
}
