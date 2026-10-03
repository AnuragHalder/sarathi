"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

export type TourStep = {
  /** Matches an element's data-tour="…"; omit for a centred card with no spotlight. */
  target?: string;
  title: string;
  text: string;
};

type Rect = { top: number; left: number; width: number; height: number };

/** The first visible element with this data-tour name (some features exist twice, e.g. phone vs desktop). */
function findTarget(name: string): HTMLElement | null {
  const all = Array.from(document.querySelectorAll<HTMLElement>(`[data-tour="${name}"]`));
  return all.find((el) => {
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  }) ?? null;
}

/**
 * A gentle spotlight walkthrough: dims the page, lights up one feature at a time with a short caption,
 * and always offers Skip (Escape skips too). Steps whose feature isn't on screen are skipped automatically.
 */
export default function Tour({ steps, onDone }: { steps: TourStep[]; onDone: () => void }) {
  // Keep only steps that can be shown right now.
  const [visible] = useState(() => steps.filter((s) => !s.target || findTarget(s.target)));
  const [i, setI] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const [vw, setVw] = useState(0);
  const [vh, setVh] = useState(0);
  const nextRef = useRef<HTMLButtonElement>(null);
  const step = visible[i];

  const measure = useCallback(() => {
    setVw(window.innerWidth);
    setVh(window.innerHeight);
    if (!step?.target) return setRect(null);
    const el = findTarget(step.target);
    if (!el) return setRect(null);
    const r = el.getBoundingClientRect();
    const pad = 6;
    setRect({ top: r.top - pad, left: r.left - pad, width: r.width + pad * 2, height: r.height + pad * 2 });
  }, [step]);

  useLayoutEffect(() => {
    if (!step) return;
    const el = step.target ? findTarget(step.target) : null;
    const r = el?.getBoundingClientRect();
    // Bring the feature into view if it's off screen, then measure.
    if (el && r && (r.top < 70 || r.bottom > window.innerHeight - 160)) el.scrollIntoView({ block: "center" });
    measure(); // eslint-disable-line react-hooks/set-state-in-effect -- measuring the DOM is the point here
    nextRef.current?.focus({ preventScroll: true });
  }, [step, measure]);

  useEffect(() => {
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, { passive: true });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onDone();
      if (e.key === "ArrowRight") setI((x) => Math.min(x + 1, visible.length - 1));
      if (e.key === "ArrowLeft") setI((x) => Math.max(x - 1, 0));
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure);
      window.removeEventListener("keydown", onKey);
    };
  }, [measure, onDone, visible.length]);

  useEffect(() => {
    if (!visible.length) onDone();
  }, [visible.length, onDone]);
  if (!step) return null;

  const last = i === visible.length - 1;
  // Caption below the feature if there's room, otherwise above; centred when there's no feature.
  const width = Math.min(320, vw - 32);
  let style: React.CSSProperties;
  if (rect) {
    const below = rect.top + rect.height + 12;
    const left = Math.max(16, Math.min(rect.left + rect.width / 2 - width / 2, vw - width - 16));
    const right = rect.left + rect.width + 12;
    const sideTop = Math.max(16, Math.min(rect.top + 24, vh - 230));
    if (vh - below >= 190) style = { top: below, left, width }; // below the feature
    else if (rect.top - 12 >= 190) style = { bottom: vh - rect.top + 12, left, width }; // above it
    else if (vw - right >= width + 16) style = { top: sideTop, left: right, width }; // beside a tall feature
    else if (rect.left - 12 >= width + 16) style = { top: sideTop, left: rect.left - 12 - width, width };
    else style = { top: "50%", left: "50%", width, transform: "translate(-50%, -50%)" };
  } else {
    style = { top: "50%", left: "50%", width, transform: "translate(-50%, -50%)" };
  }

  return (
    <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-label="How Sarathi works">
      {rect ? (
        <div
          aria-hidden="true"
          className="tour-spot pointer-events-none fixed rounded-2xl"
          style={{ top: rect.top, left: rect.left, width: rect.width, height: rect.height }}
        />
      ) : (
        <div aria-hidden="true" className="fixed inset-0 bg-[rgba(4,3,9,0.68)]" />
      )}
      <div className="tour-card fixed rounded-2xl border border-gold/50 bg-surface p-4 shadow-xl backdrop-blur-md" style={style}>
        <div className="flex items-center justify-between text-xs text-muted">
          <span>
            {i + 1} of {visible.length}
          </span>
          <button onClick={onDone} className="rounded-full px-2 py-0.5 hover:text-ink">
            Skip
          </button>
        </div>
        <p className="mt-1 font-serif text-lg font-semibold">{step.title}</p>
        <p className="mt-1 text-sm leading-relaxed text-muted">{step.text}</p>
        <div className="mt-3 flex justify-end gap-2">
          {i > 0 && (
            <button onClick={() => setI(i - 1)} className="rounded-xl border border-line px-3 py-1.5 text-sm text-muted hover:text-ink">
              Back
            </button>
          )}
          <button
            ref={nextRef}
            onClick={() => (last ? onDone() : setI(i + 1))}
            className="rounded-xl bg-accent px-4 py-1.5 text-sm font-medium text-[#1b120a]"
          >
            {last ? "Got it" : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
}
