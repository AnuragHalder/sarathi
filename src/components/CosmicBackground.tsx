/**
 * The app's backdrop, "Swarna Mandala": a deep peacock-teal sky with a vast golden lotus mandala that turns
 * very slowly, ringed with peacock-feather eyes, plus faint stars and rising gold dust.
 *
 * Everything is plain SVG + CSS animation (see the "Mandala backdrop" block in globals.css), so it costs
 * almost nothing to run. People who turn off motion on their device get a still picture.
 * The geometry is deterministic, so server and browser render the same markup.
 */

const CX = 400;
const CY = 400;
const GOLD = "#d9b45a";

/** Seeded random numbers, so the stars and dust are identical on every render. */
function seeded(seed: number) {
  let s = seed;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

function petalPath(r0: number, r1: number, w: number) {
  const mid = (r0 + r1) / 2;
  return `M${CX} ${CY - r0} C ${CX - w} ${CY - mid} ${CX - w * 0.4} ${CY - r1 + 6} ${CX} ${CY - r1} C ${CX + w * 0.4} ${CY - r1 + 6} ${CX + w} ${CY - mid} ${CX} ${CY - r0}Z`;
}

function Petals({ n, r0, r1, w, sw }: { n: number; r0: number; r1: number; w: number; sw: number }) {
  const d = petalPath(r0, r1, w);
  return (
    <g fill="none" stroke={GOLD} strokeWidth={sw}>
      {Array.from({ length: n }, (_, i) => (
        <path key={i} d={d} transform={`rotate(${(i / n) * 360} ${CX} ${CY})`} />
      ))}
    </g>
  );
}

function heart(cx: number, cy: number, r: number) {
  return `M${cx} ${cy + r} C ${cx - r * 1.4} ${cy} ${cx - r * 1.1} ${cy - r * 1.3} ${cx} ${cy - r * 0.7} C ${cx + r * 1.1} ${cy - r * 1.3} ${cx + r * 1.4} ${cy} ${cx} ${cy + r} Z`;
}

/** One peacock-feather eye, centred on (0,0). */
function PeacockEye({ s }: { s: number }) {
  return (
    <g>
      <ellipse cx={0} cy={0} rx={17 * s} ry={22 * s} fill="url(#pk-e1)" />
      <ellipse cx={0} cy={1 * s} rx={13 * s} ry={17.5 * s} fill="url(#pk-e2)" />
      <ellipse cx={0} cy={2 * s} rx={10 * s} ry={13 * s} fill="url(#pk-e3)" />
      <ellipse cx={0} cy={3 * s} rx={7 * s} ry={9.5 * s} fill="url(#pk-e4)" />
      <path d={heart(0, 5 * s, 4.8 * s)} fill="url(#pk-e5)" />
    </g>
  );
}

const rnd = seeded(11);
const STARS = Array.from({ length: 70 }, () => ({
  x: rnd() * 1000,
  y: rnd() * 1000,
  r: rnd() < 0.08 ? 2.2 : 0.8 + rnd() * 1.1,
  warm: rnd() < 0.3,
  dur: 3 + rnd() * 6,
  delay: -rnd() * 6,
}));
const DUST = Array.from({ length: 18 }, () => ({
  x: rnd() * 1000,
  y: 400 + rnd() * 600,
  r: 1 + rnd() * 2.4,
  dur: 16 + rnd() * 18,
  delay: -rnd() * 34,
}));

export default function CosmicBackground() {
  return (
    <div className="cosmos" aria-hidden="true">
      {/* stars + rising gold dust, stretched over the whole screen */}
      <svg className="cosmos-layer" viewBox="0 0 1000 1000" preserveAspectRatio="xMidYMid slice">
        {STARS.map((s, i) => (
          <circle
            key={i}
            className="twinkle"
            cx={s.x}
            cy={s.y}
            r={s.r}
            fill={s.warm ? "#f3d995" : "#fff7e6"}
            style={{ animationDuration: `${s.dur}s`, animationDelay: `${s.delay}s` }}
          />
        ))}
        {DUST.map((d, i) => (
          <circle
            key={i}
            className="dust"
            cx={d.x}
            cy={d.y}
            r={d.r}
            fill="#f0d58a"
            style={{ animationDuration: `${d.dur}s`, animationDelay: `${d.delay}s` }}
          />
        ))}
      </svg>

      {/* the mandala: a square drawing centred a little above the middle of the screen */}
      <svg className="mandala" viewBox="0 0 800 800">
        <defs>
          <radialGradient id="pk-e1" cx="50%" cy="55%" r="50%">
            <stop offset="0" stopColor="#d8b457" stopOpacity="0.95" />
            <stop offset="0.75" stopColor="#9c7a2a" stopOpacity="0.85" />
            <stop offset="1" stopColor="#6e5a1c" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="pk-e2" cx="50%" cy="58%" r="50%">
            <stop offset="0" stopColor="#3fd0a0" />
            <stop offset="1" stopColor="#12704c" />
          </radialGradient>
          <radialGradient id="pk-e3" cx="50%" cy="60%" r="50%">
            <stop offset="0" stopColor="#43e6e0" />
            <stop offset="1" stopColor="#0c8f9c" />
          </radialGradient>
          <radialGradient id="pk-e4" cx="50%" cy="62%" r="50%">
            <stop offset="0" stopColor="#3d7bff" />
            <stop offset="1" stopColor="#1a3aa0" />
          </radialGradient>
          <radialGradient id="pk-e5" cx="50%" cy="65%" r="55%">
            <stop offset="0" stopColor="#1a2a7a" />
            <stop offset="1" stopColor="#060c33" />
          </radialGradient>
          <radialGradient id="mandala-glow">
            <stop offset="0" stopColor="#f1d58a" stopOpacity="0.28" />
            <stop offset="1" stopColor="#f1d58a" stopOpacity="0" />
          </radialGradient>
        </defs>

        <circle cx={CX} cy={CY} r={200} fill="url(#mandala-glow)" />

        <g className="spin spin-slow mandala-outer">
          {[380, 332, 288, 190, 122, 76].map((r, i) => (
            <circle key={r} cx={CX} cy={CY} r={r} fill="none" stroke={GOLD} strokeWidth={i % 2 ? 0.8 : 1.3} />
          ))}
          <Petals n={32} r0={288} r1={376} w={28} sw={0.9} />
          <Petals n={24} r0={190} r1={286} w={33} sw={1.1} />
          {Array.from({ length: 64 }, (_, i) => {
            const a = (i / 64) * Math.PI * 2;
            return <circle key={i} cx={CX + Math.cos(a) * 310} cy={CY + Math.sin(a) * 310} r={1.8} fill={GOLD} />;
          })}
        </g>

        <g className="spin spin-rev mandala-inner">
          <Petals n={16} r0={122} r1={190} w={28} sw={1.3} />
          <Petals n={12} r0={76} r1={122} w={20} sw={1.3} />
          <circle cx={CX} cy={CY} r={40} fill="none" stroke={GOLD} strokeWidth={1.2} />
          <Petals n={8} r0={0} r1={40} w={12} sw={1.1} />
        </g>

        <g className="spin spin-slow mandala-eyes">
          {Array.from({ length: 8 }, (_, i) => (
            <g key={i} transform={`rotate(${i * 45 + 22.5} ${CX} ${CY}) translate(${CX} ${CY - 240})`}>
              <PeacockEye s={1.15} />
            </g>
          ))}
        </g>
      </svg>

      <div className="cosmos-vignette" />
    </div>
  );
}
