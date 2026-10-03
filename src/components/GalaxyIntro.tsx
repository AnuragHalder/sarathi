"use client";

import { useEffect, useRef } from "react";

/**
 * A spiral galaxy for the welcome screen, drawn live on a canvas (no image or GIF to download).
 * It is "born" first: the stars bloom out from a bright core over about 3 seconds, then the galaxy
 * keeps turning slowly, with the inner stars moving faster than the outer ones, as in a real galaxy.
 * People who ask their device for reduced motion skip the bloom (it appears fully formed) but still see
 * the slow, gentle turning, which is calm enough not to be a motion trigger.
 */
export default function GalaxyIntro() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Colour groups, drawn one group at a time (cheap: one fillStyle per group per frame).
    const GROUPS = [
      { color: "255,238,205", alpha: 0.7 }, // warm core
      { color: "255,214,160", alpha: 0.5 }, // golden inner disc
      { color: "214,226,255", alpha: 0.55 }, // blue-white arms
      { color: "170,196,255", alpha: 0.5 }, // young blue stars
      { color: "255,176,206", alpha: 0.55 }, // rose star-forming knots
    ];
    type P = { r: number; a: number; s: number; g: number };
    const small = window.innerWidth < 700;
    const N = small ? 7000 : 11000;
    const pts: P[] = [];
    const gauss = () => (Math.random() + Math.random() + Math.random() - 1.5) / 1.5;

    for (let i = 0; i < N; i++) {
      const kind = Math.random();
      if (kind < 0.28) {
        // bulge: dense, warm, near the centre
        const r = Math.abs(gauss()) * 0.2;
        pts.push({ r, a: Math.random() * Math.PI * 2, s: 0.6 + Math.random() * 0.9, g: r < 0.07 ? 0 : 1 });
      } else if (kind < 0.84) {
        // two logarithmic spiral arms
        const arm = Math.random() < 0.5 ? 0 : Math.PI;
        const r = 0.08 + Math.pow(Math.random(), 0.8) * 0.92;
        const spread = 0.38 + r * 0.5;
        const a = arm + Math.log(r / 0.08) * 2.1 + gauss() * spread;
        const roll = Math.random();
        pts.push({ r: r + gauss() * 0.035, a, s: 0.5 + Math.random() * 1.0, g: roll < 0.05 ? 4 : roll < 0.35 ? 3 : 2 });
      } else {
        // a faint, even disc between the arms
        const r = Math.sqrt(Math.random()) * 1.05;
        pts.push({ r, a: Math.random() * Math.PI * 2, s: 0.4 + Math.random() * 0.7, g: r < 0.25 ? 1 : 2 });
      }
    }

    let w = 0, h = 0, R = 0, cx = 0, cy = 0, raf = 0, last = 0;
    const start = performance.now();
    const TILT = (-28 * Math.PI) / 180; // the galaxy lies diagonally, like Andromeda in the photo
    const SQUASH = 0.34; // seen at a steep angle, so the disc looks like a long ellipse
    const cosT = Math.cos(TILT), sinT = Math.sin(TILT);

    function size() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas!.clientWidth;
      h = canvas!.clientHeight;
      canvas!.width = Math.round(w * dpr);
      canvas!.height = Math.round(h * dpr);
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      R = Math.min(w * 0.56, h * 0.36, 520);
      cx = w / 2;
      cy = h * 0.3;
    }

    function draw(now: number) {
      const t = Math.max(0, (now - start) / 1000); // a frame can be stamped slightly before start
      const bloom = calm ? 1 : 1 - Math.pow(1 - Math.min(t / 3.2, 1), 3); // ease-out birth
      ctx!.clearRect(0, 0, w, h);

      // soft haze of unresolved starlight across the whole disc (what makes it look like a photo)
      ctx!.save();
      ctx!.translate(cx, cy);
      ctx!.rotate(TILT);
      ctx!.scale(1, SQUASH);
      const hazeR = R * 1.05 * bloom + 1;
      const hz = ctx!.createRadialGradient(0, 0, 0, 0, 0, hazeR);
      hz.addColorStop(0, "rgba(255,226,190,0.30)");
      hz.addColorStop(0.2, "rgba(200,205,255,0.14)");
      hz.addColorStop(0.55, "rgba(150,170,255,0.07)");
      hz.addColorStop(1, "rgba(150,170,255,0)");
      ctx!.fillStyle = hz;
      ctx!.fillRect(-hazeR, -hazeR, hazeR * 2, hazeR * 2);
      ctx!.restore();

      // core glow
      const glowR = R * (0.12 + 0.5 * bloom);
      const g = ctx!.createRadialGradient(cx, cy, 0, cx, cy, glowR);
      g.addColorStop(0, `rgba(255,240,210,${0.55 + 0.25 * (1 - bloom)})`);
      g.addColorStop(0.18, "rgba(255,214,160,0.22)");
      g.addColorStop(0.55, "rgba(150,170,255,0.06)");
      g.addColorStop(1, "rgba(150,170,255,0)");
      ctx!.save();
      ctx!.translate(cx, cy);
      ctx!.rotate(TILT);
      ctx!.scale(1, SQUASH * 1.6);
      ctx!.translate(-cx, -cy);
      ctx!.fillStyle = g;
      ctx!.fillRect(cx - glowR, cy - glowR, glowR * 2, glowR * 2);
      ctx!.restore();

      ctx!.globalCompositeOperation = "lighter";
      for (let gi = 0; gi < GROUPS.length; gi++) {
        ctx!.fillStyle = `rgba(${GROUPS[gi].color},${GROUPS[gi].alpha})`;
        for (const p of pts) {
          if (p.g !== gi) continue;
          // inner stars orbit faster: one outer turn takes about 4 minutes
          const ang = p.a + t * (0.026 / (p.r + 0.12));
          const rr = p.r * R * bloom;
          const x = Math.cos(ang) * rr;
          const y = Math.sin(ang) * rr * SQUASH;
          const px = cx + x * cosT - y * sinT;
          const py = cy + x * sinT + y * cosT;
          ctx!.fillRect(px, py, p.s, p.s);
        }
      }
      ctx!.globalCompositeOperation = "source-over";
    }

    function loop(now: number) {
      raf = requestAnimationFrame(loop);
      if (now - last < 33) return; // ~30 fps
      last = now;
      draw(now);
    }

    function onVisibility() {
      cancelAnimationFrame(raf);
      if (!document.hidden) raf = requestAnimationFrame(loop);
    }

    size();
    draw(performance.now());
    raf = requestAnimationFrame(loop);
    const onResize = () => { size(); draw(performance.now()); };
    window.addEventListener("resize", onResize);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return <canvas ref={ref} aria-hidden="true" className="pointer-events-none fixed inset-0 -z-[5] h-full w-full" />;
}
