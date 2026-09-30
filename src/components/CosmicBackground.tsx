"use client";

import { useEffect, useRef } from "react";

/**
 * The app's backdrop: a deep night sky with a saffron-and-gold nebula (CSS, drifting over minutes)
 * and a field of softly twinkling stars (one small canvas, ~20 frames a second).
 * Motion is deliberately slow so it never competes with reading. People who turn off motion on
 * their device still get the gentle twinkle, with the drift slowed to half; it pauses whenever the tab is hidden.
 */
export default function CosmicBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const still = window.matchMedia("(prefers-reduced-motion: reduce)");
    const COLORS = ["255,244,224", "255,244,224", "255,244,224", "255,216,155", "255,200,140", "207,224,255"];

    type Star = { x: number; y: number; r: number; a: number; speed: number; phase: number; drift: number; color: string };
    let stars: Star[] = [];
    let w = 0;
    let h = 0;
    let raf = 0;
    let last = 0;
    let prev = 0;

    function build() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas!.width = Math.round(w * dpr);
      canvas!.height = Math.round(h * dpr);
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.max(120, Math.min(420, Math.round((w * h) / 4500)));
      stars = Array.from({ length: count }, () => {
        const bright = Math.random() < 0.06;
        return {
          x: Math.random() * w,
          y: Math.random() * h,
          r: bright ? 1.3 + Math.random() * 0.9 : 0.3 + Math.random() * 0.9,
          a: bright ? 0.75 + Math.random() * 0.25 : 0.25 + Math.random() * 0.6,
          speed: 0.25 + Math.random() * 0.9, // twinkle, radians per second
          phase: Math.random() * Math.PI * 2,
          drift: 0.6 + Math.random() * 1.4, // depth: nearer stars drift a little faster
          color: COLORS[Math.floor(Math.random() * COLORS.length)],
        };
      });
    }

    function draw(t: number) {
      const dt = prev ? Math.min((t - prev) / 1000, 0.2) : 0;
      prev = t;
      ctx!.clearRect(0, 0, w, h);
      for (const s of stars) {
        {
          s.x -= s.drift * (still.matches ? 0.18 : 0.35) * dt; // the whole sky slides very slowly, about 20 px a minute
          if (s.x < -4) s.x = w + 4;
        }
        const tw = 0.6 + 0.4 * Math.sin(s.phase + (t / 1000) * s.speed);
        const alpha = s.a * tw;
        if (s.r > 1.2) {
          const g = ctx!.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r * 5);
          g.addColorStop(0, `rgba(${s.color},${alpha * 0.45})`);
          g.addColorStop(1, `rgba(${s.color},0)`);
          ctx!.fillStyle = g;
          ctx!.fillRect(s.x - s.r * 5, s.y - s.r * 5, s.r * 10, s.r * 10);
        }
        ctx!.fillStyle = `rgba(${s.color},${alpha})`;
        ctx!.beginPath();
        ctx!.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx!.fill();
      }
    }

    function loop(t: number) {
      raf = requestAnimationFrame(loop);
      if (t - last < 50) return; // ~20 fps is plenty for a slow sky and easy on the battery
      last = t;
      draw(t);
    }

    function start() {
      cancelAnimationFrame(raf);
      prev = 0;
      if (document.hidden) draw(performance.now());
      else raf = requestAnimationFrame(loop);
    }

    function onResize() {
      build();
      draw(performance.now());
    }

    build();
    start();
    window.addEventListener("resize", onResize);
    document.addEventListener("visibilitychange", start);
    still.addEventListener("change", start);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", start);
      still.removeEventListener("change", start);
    };
  }, []);

  return (
    <div className="cosmos" aria-hidden="true">
      <div className="nebula nebula-a" />
      <div className="nebula nebula-b" />
      <div className="nebula nebula-c" />
      <div className="galaxy-band" />
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
      <div className="cosmos-vignette" />
    </div>
  );
}
