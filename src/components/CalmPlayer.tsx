"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Practice } from "@/lib/practices";

const CHIME_KEY = "sarathi-chime";

/** A soft singing-bowl tone made with Web Audio (no sound file needed). */
function bowl(ctx: AudioContext, base: number, volume: number, at = 0) {
  const t0 = ctx.currentTime + at;
  [1, 2.76, 5.4].forEach((mult, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = base * mult;
    const peak = volume / (i * 2 + 1);
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(peak, t0 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + (i === 0 ? 4.5 : 2.5));
    osc.connect(gain).connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + 5);
  });
}

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.max(0, Math.floor(s % 60))).padStart(2, "0")}`;

/** Full-screen guided practice: intro (verse + how), the breathing itself, and a closing word. */
export default function CalmPlayer({ practice, onClose }: { practice: Practice; onClose: () => void }) {
  const [stage, setStage] = useState<"intro" | "run" | "done">("intro");
  const [minutes, setMinutes] = useState(practice.minutes[0]);
  const [elapsed, setElapsed] = useState(0);
  const [paused, setPaused] = useState(false);
  const [chime, setChime] = useState(true);
  const [wanderedAt, setWanderedAt] = useState(0); // breath count when the mind last wandered
  const [wanderNote, setWanderNote] = useState(false);
  const [calm, setCalm] = useState(false); // reduced-motion preference

  const audio = useRef<AudioContext | null>(null);
  const startRef = useRef(0);
  const pausedTotal = useRef(0);
  const pausedAt = useRef(0);
  const lastPhase = useRef("");
  const wakeLock = useRef<{ release: () => Promise<void> } | null>(null);

  const cycle = practice.inhale + practice.exhale;
  const total = Math.ceil((minutes * 60) / cycle) * cycle; // always finish on a full out-breath

  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- saved preference after hydration
      setChime(localStorage.getItem(CHIME_KEY) !== "off");
    } catch {}
    setCalm(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  const finish = useCallback(() => {
    setStage("done");
    if (chime && audio.current) [0, 1.6, 3.2].forEach((at) => bowl(audio.current!, 262, 0.07, at));
    wakeLock.current?.release().catch(() => {});
    wakeLock.current = null;
  }, [chime]);

  // The clock: a quarter-second tick is plenty for a slow breath.
  useEffect(() => {
    if (stage !== "run" || paused) return;
    const id = window.setInterval(() => {
      const e = (performance.now() - startRef.current - pausedTotal.current) / 1000;
      setElapsed(e);
      if (e >= total) finish();
    }, 250);
    return () => window.clearInterval(id);
  }, [stage, paused, total, finish]);

  const t = elapsed % cycle;
  const phase: "in" | "out" = t < practice.inhale ? "in" : "out";
  const phaseLeft = Math.ceil(phase === "in" ? practice.inhale - t : cycle - t);
  const breaths = Math.floor(elapsed / cycle); // completed breaths

  // A chime and a light buzz (on phones that support it) as each breath begins.
  useEffect(() => {
    if (stage !== "run" || paused) return;
    const key = `${breaths}-${phase}`;
    if (lastPhase.current === key) return;
    lastPhase.current = key;
    if (phase === "in") {
      if (chime && audio.current) bowl(audio.current, 392, 0.035);
      navigator.vibrate?.(25);
    } else {
      navigator.vibrate?.(12);
    }
  }, [stage, paused, breaths, phase, chime]);

  async function begin() {
    try {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      audio.current = audio.current ?? new AC();
      await audio.current.resume();
    } catch {}
    try {
      const nav = navigator as Navigator & { wakeLock?: { request: (t: "screen") => Promise<{ release: () => Promise<void> }> } };
      wakeLock.current = (await nav.wakeLock?.request("screen")) ?? null; // keep the screen on
    } catch {}
    startRef.current = performance.now();
    pausedTotal.current = 0;
    lastPhase.current = "";
    setElapsed(0);
    setWanderedAt(0);
    setPaused(false);
    setStage("run");
  }

  function togglePause() {
    if (paused) {
      pausedTotal.current += performance.now() - pausedAt.current;
      setPaused(false);
    } else {
      pausedAt.current = performance.now();
      setPaused(true);
    }
  }

  function toggleChime() {
    setChime((c) => {
      try {
        localStorage.setItem(CHIME_KEY, c ? "off" : "on");
      } catch {}
      return !c;
    });
  }

  function close() {
    wakeLock.current?.release().catch(() => {});
    audio.current?.close().catch(() => {});
    onClose();
  }

  // Close with Escape.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const up = phase === "in" && !paused;
  const dur = `${phase === "in" ? practice.inhale : practice.exhale}s`;
  const count = practice.id === "bring-back" ? ((breaths - wanderedAt) % 10) : 0;

  return (
    <div role="dialog" aria-modal="true" aria-label={practice.name} className="fixed inset-0 z-50 overflow-y-auto bg-[rgba(8,6,17,0.82)] backdrop-blur-sm">
      <div className="mx-auto flex min-h-full max-w-md flex-col px-6 pt-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] text-center">
        <div className="flex items-center justify-between text-sm text-muted">
          <button onClick={toggleChime} className="rounded-full border border-line px-3 py-1 hover:text-ink" aria-pressed={chime}>
            {chime ? "Chime on" : "Chime off"}
          </button>
          <button onClick={close} className="rounded-full p-2 hover:text-ink" aria-label="Close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>

        {stage === "intro" && (
          <div className="my-auto py-8">
            <p className="text-xs font-semibold tracking-[0.18em] text-gold uppercase">Calm · {practice.verseId}</p>
            <h2 className="mt-2 font-serif text-3xl font-semibold">{practice.name}</h2>
            <p className="mt-6 font-deva text-lg leading-relaxed whitespace-pre-line text-gold" lang="sa">
              {practice.sanskrit}
            </p>
            <p className="mt-3 italic text-muted">&ldquo;{practice.meaning}&rdquo;</p>
            <p className="mt-6 text-left leading-relaxed">{practice.intro}</p>
            <div className="mt-6 flex justify-center gap-2" role="radiogroup" aria-label="Length">
              {practice.minutes.map((m) => (
                <button
                  key={m}
                  role="radio"
                  aria-checked={minutes === m}
                  onClick={() => setMinutes(m)}
                  className={`rounded-full border px-4 py-1.5 text-sm ${minutes === m ? "border-accent bg-accent-soft text-accent" : "border-line text-muted"}`}
                >
                  {m} min
                </button>
              ))}
            </div>
            <button onClick={begin} className="mt-6 w-full rounded-2xl bg-accent px-6 py-3.5 text-lg font-medium text-[#1b120a]">
              Begin
            </button>
            <p className="mt-4 text-xs text-muted">Breathe gently, never forcing. If you feel dizzy, return to your normal breathing.</p>
          </div>
        )}

        {stage === "run" && (
          <div className="my-auto flex flex-col items-center py-6">
            {practice.id === "steady-lamp" ? (
              <Diya up={up} dur={dur} calm={calm} />
            ) : (
              <Beads count={count} up={up} dur={dur} calm={calm} />
            )}
            <p className="mt-6 font-serif text-3xl" aria-live="polite">
              {paused ? "Paused" : phase === "in" ? "Breathe in" : "Breathe out"}
            </p>
            <p className="mt-1 h-6 text-muted">{paused ? "" : phaseLeft}</p>
            {practice.id === "bring-back" && (
              <>
                <button
                  onClick={() => {
                    setWanderedAt(breaths);
                    setWanderNote(true);
                    window.setTimeout(() => setWanderNote(false), 4000);
                  }}
                  className="mt-5 rounded-full border border-line px-4 py-2 text-sm text-muted hover:text-ink"
                >
                  My mind wandered
                </button>
                <p className="mt-2 h-5 text-sm text-gold">{wanderNote ? "Noticing is the practice. Back to one." : ""}</p>
              </>
            )}
            <div className="mt-8 flex items-center gap-3 text-sm text-muted">
              <span>{fmt(total - elapsed)} left</span>
              <button onClick={togglePause} className="rounded-full border border-line px-4 py-1.5 hover:text-ink">
                {paused ? "Resume" : "Pause"}
              </button>
              <button onClick={finish} className="rounded-full border border-line px-4 py-1.5 hover:text-ink">
                End
              </button>
            </div>
          </div>
        )}

        {stage === "done" && (
          <div className="my-auto py-8">
            <p className="text-xs font-semibold tracking-[0.18em] text-gold uppercase">{practice.name}</p>
            <p className="mt-5 font-deva text-lg leading-relaxed whitespace-pre-line text-gold" lang="sa">
              {practice.sanskrit}
            </p>
            <p className="mt-6 font-serif text-xl leading-relaxed">{practice.closing}</p>
            <div className="mt-8 grid gap-2">
              <button onClick={close} className="w-full rounded-2xl bg-accent px-6 py-3 font-medium text-[#1b120a]">
                Return to Sarathi
              </button>
              <button onClick={() => setStage("intro")} className="w-full rounded-2xl border border-line px-6 py-3 text-muted hover:text-ink">
                Practise again
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/** A clay diya whose flame rises with the in-breath and settles with the out-breath. */
function Diya({ up, dur, calm }: { up: boolean; dur: string; calm: boolean }) {
  const scale = calm ? 1 : up ? 1.28 : 0.86;
  return (
    <svg width="220" height="240" viewBox="0 0 220 240" aria-hidden="true" style={{ overflow: "visible" }}>
      <defs>
        <radialGradient id="diya-glow">
          <stop offset="0" stopColor="#ffd98a" stopOpacity="0.55" />
          <stop offset="0.5" stopColor="#fb923c" stopOpacity="0.18" />
          <stop offset="1" stopColor="#fb923c" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="diya-flame" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#fb923c" />
          <stop offset="0.45" stopColor="#ffd27a" />
          <stop offset="1" stopColor="#fff6d8" />
        </linearGradient>
        <linearGradient id="diya-clay" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#c2410c" />
          <stop offset="1" stopColor="#7c2d12" />
        </linearGradient>
      </defs>
      <circle
        cx="110"
        cy="120"
        r="100"
        fill="url(#diya-glow)"
        style={{ transformOrigin: "110px 150px", transform: `scale(${scale})`, opacity: up ? 1 : 0.55, transition: `transform ${dur} ease-in-out, opacity ${dur} ease-in-out` }}
      />
      <g style={{ transformOrigin: "110px 158px", transform: `scale(${scale})`, opacity: calm ? (up ? 1 : 0.7) : 1, transition: `transform ${dur} ease-in-out, opacity ${dur} ease-in-out` }}>
        <path d="M110 70 C 96 98 94 124 110 158 C 126 124 124 98 110 70 Z" fill="url(#diya-flame)" />
        <path d="M110 112 C 104 126 104 142 110 156 C 116 142 116 126 110 112 Z" fill="#fff8e6" opacity="0.85" />
      </g>
      <path d="M40 162 Q 110 150 180 162 Q 172 206 110 210 Q 48 206 40 162 Z" fill="url(#diya-clay)" />
      <path d="M40 162 Q 110 176 180 162" fill="none" stroke="#f0b27a" strokeWidth="2" opacity="0.6" />
      <path d="M58 182 Q 110 196 162 182" fill="none" stroke="#e9a560" strokeWidth="1.2" opacity="0.45" strokeDasharray="3 5" />
    </svg>
  );
}

/** Ten beads in a circle (like a mala): one lights up with each out-breath. */
function Beads({ count, up, dur, calm }: { count: number; up: boolean; dur: string; calm: boolean }) {
  const scale = calm ? 1 : up ? 1.12 : 0.92;
  return (
    <svg width="240" height="240" viewBox="0 0 240 240" aria-label={`Breath ${count} of 10`}>
      <circle
        cx="120"
        cy="120"
        r="62"
        fill="rgba(251,146,60,0.12)"
        stroke="rgba(224,179,90,0.5)"
        style={{ transformOrigin: "120px 120px", transform: `scale(${scale})`, transition: `transform ${dur} ease-in-out` }}
      />
      {Array.from({ length: 10 }, (_, i) => {
        const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
        const lit = i < count;
        return (
          <circle
            key={i}
            cx={120 + Math.cos(a) * 98}
            cy={120 + Math.sin(a) * 98}
            r={lit ? 9 : 7}
            fill={lit ? "#e0b35a" : "rgba(224,179,90,0.15)"}
            stroke="rgba(224,179,90,0.6)"
            style={{ transition: "all 600ms ease" }}
          />
        );
      })}
      <text x="120" y="132" textAnchor="middle" fontSize="38" fill="#f3e9da" fontFamily="var(--font-fraunces), serif">
        {count + 1}
      </text>
    </svg>
  );
}
