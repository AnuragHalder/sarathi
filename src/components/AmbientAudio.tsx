"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** Background music file. Replace public/audio/calm.mp3 to change the track. */
const SRC = "/audio/calm.mp3";
const DEFAULT_VOLUME = 0.3;
const PREF_KEY = "sarathi-music";

type Pref = { on: boolean; volume: number };

function readPref(): Pref {
  try {
    const p = JSON.parse(localStorage.getItem(PREF_KEY) || "null");
    if (p && typeof p.on === "boolean" && typeof p.volume === "number") return p;
  } catch {}
  return { on: true, volume: DEFAULT_VOLUME };
}
function writePref(p: Pref) {
  try {
    localStorage.setItem(PREF_KEY, JSON.stringify(p));
  } catch {}
}

/**
 * Calming background music, looped, with a speaker button that opens mute + volume controls.
 * Browsers block sound until the visitor interacts with the page, so if autoplay is refused the
 * music starts (with a gentle fade-in) on their first tap, click or keypress anywhere.
 * Volume uses Web Audio when available, because iPhones ignore audio.volume.
 */
export default function AmbientAudio() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const fadeRef = useRef<number | null>(null);
  const wantOnRef = useRef(true);
  const volRef = useRef(DEFAULT_VOLUME);
  const boxRef = useRef<HTMLDivElement>(null);

  const [available, setAvailable] = useState(false);
  const [on, setOn] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(DEFAULT_VOLUME);
  const [open, setOpen] = useState(false);

  const setLevel = useCallback((v: number) => {
    const a = audioRef.current;
    if (!a) return;
    if (gainRef.current) {
      a.volume = 1;
      gainRef.current.gain.value = v;
    } else {
      a.volume = Math.min(1, Math.max(0, v));
    }
  }, []);

  const currentLevel = () => (gainRef.current ? gainRef.current.gain.value : audioRef.current?.volume ?? 0);

  const fadeTo = useCallback(
    (target: number, ms: number, done?: () => void) => {
      if (fadeRef.current) cancelAnimationFrame(fadeRef.current);
      const from = currentLevel();
      const t0 = performance.now();
      const step = (t: number) => {
        const k = Math.min(1, (t - t0) / ms);
        setLevel(from + (target - from) * k);
        if (k < 1) fadeRef.current = requestAnimationFrame(step);
        else {
          fadeRef.current = null;
          done?.();
        }
      };
      fadeRef.current = requestAnimationFrame(step);
    },
    [setLevel],
  );

  // Route audio through a GainNode so volume works on iOS. Must happen inside a user gesture.
  const ensureGraph = useCallback(() => {
    const a = audioRef.current;
    if (!a || ctxRef.current) {
      ctxRef.current?.resume().catch(() => {});
      return;
    }
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    try {
      const ctx = new AC();
      const gain = ctx.createGain();
      gain.gain.value = a.paused ? 0 : a.volume;
      ctx.createMediaElementSource(a).connect(gain).connect(ctx.destination);
      ctxRef.current = ctx;
      gainRef.current = gain;
      a.volume = 1;
      ctx.resume().catch(() => {});
    } catch {}
  }, []);

  const start = useCallback(
    (fromGesture: boolean) => {
      const a = audioRef.current;
      if (!a) return Promise.resolve(false);
      if (fromGesture) ensureGraph();
      if (a.paused) setLevel(0);
      return a
        .play()
        .then(() => {
          setPlaying(true);
          fadeTo(volRef.current, 2500);
          return true;
        })
        .catch(() => false);
    },
    [ensureGraph, fadeTo, setLevel],
  );

  const stop = useCallback(() => {
    fadeTo(0, 400, () => {
      audioRef.current?.pause();
      setPlaying(false);
    });
  }, [fadeTo]);

  useEffect(() => {
    const pref = readPref();
    wantOnRef.current = pref.on;
    volRef.current = pref.volume;
    /* eslint-disable react-hooks/set-state-in-effect -- restore saved preference after hydration */
    setOn(pref.on);
    setVolume(pref.volume);
    /* eslint-enable react-hooks/set-state-in-effect */

    const a = new Audio(SRC);
    a.loop = true;
    a.preload = "auto";
    audioRef.current = a;
    a.addEventListener("canplay", () => setAvailable(true), { once: true });
    a.addEventListener("error", () => setAvailable(false));

    // First interaction anywhere (except on the music controls themselves) starts the music.
    const onGesture = (e: Event) => {
      if ((e.target as Element | null)?.closest?.("[data-music-control]")) return;
      if (!wantOnRef.current) return;
      start(true).then((ok) => ok && removeGesture());
    };
    const events = ["pointerdown", "keydown", "touchstart"] as const;
    const removeGesture = () => events.forEach((ev) => window.removeEventListener(ev, onGesture, true));

    if (pref.on) {
      start(false).then((ok) => {
        if (!ok) events.forEach((ev) => window.addEventListener(ev, onGesture, { capture: true, passive: true }));
      });
    }

    // Pause when the app is in the background; resume when it comes back.
    const onVis = () => {
      if (document.hidden) a.pause();
      else if (wantOnRef.current && a.currentTime > 0) a.play().catch(() => {});
    };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      removeGesture();
      document.removeEventListener("visibilitychange", onVis);
      a.pause();
      ctxRef.current?.close().catch(() => {});
      ctxRef.current = null;
      gainRef.current = null;
    };
  }, [start]);

  // Close the panel on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function toggle() {
    const next = !on;
    setOn(next);
    wantOnRef.current = next;
    writePref({ on: next, volume });
    if (next) start(true);
    else stop();
  }

  function changeVolume(v: number) {
    setVolume(v);
    volRef.current = v;
    writePref({ on, volume: v });
    ensureGraph();
    if (playing) setLevel(v);
    else if (v > 0 && on) start(true);
  }

  if (!available) return null;

  const muted = !on || !playing || volume === 0;

  return (
    <div ref={boxRef} className="relative" data-music-control>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={muted ? "Music is off. Open music controls" : "Music is playing. Open music controls"}
        aria-expanded={open}
        className="flex h-9 w-9 items-center justify-center rounded-full border border-line text-muted hover:text-ink"
      >
        <SpeakerIcon muted={muted} />
      </button>
      {open && (
        <div className="absolute right-0 top-11 z-20 w-60 rounded-2xl border border-line bg-surface p-4 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Calming music</span>
            <button
              onClick={toggle}
              className={`rounded-full px-3 py-1.5 text-sm font-medium ${on ? "bg-accent-soft text-accent" : "border border-line text-muted"}`}
            >
              {on ? "Mute" : "Play"}
            </button>
          </div>
          <label className="mt-4 flex items-center gap-3">
            <SpeakerIcon muted={volume === 0} small />
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={volume}
              onChange={(e) => changeVolume(Number(e.target.value))}
              aria-label="Music volume"
              className="w-full accent-[var(--accent)]"
            />
          </label>
          {on && !playing && <p className="mt-3 text-xs text-muted">Starts when you tap anywhere on the page.</p>}
        </div>
      )}
    </div>
  );
}

function SpeakerIcon({ muted, small }: { muted: boolean; small?: boolean }) {
  const s = small ? 16 : 18;
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M11 5 6 9H3v6h3l5 4V5z" fill="currentColor" stroke="none" />
      {muted ? (
        <>
          <line x1="16" y1="9" x2="22" y2="15" />
          <line x1="22" y1="9" x2="16" y2="15" />
        </>
      ) : (
        <>
          <path d="M15.5 8.5a5 5 0 0 1 0 7" />
          <path d="M18.5 5.5a9 9 0 0 1 0 13" />
        </>
      )}
    </svg>
  );
}
