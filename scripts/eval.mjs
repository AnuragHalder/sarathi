// Runs sample questions through the running app and writes eval-report.html.
//
// 1. In one terminal:  ALLOW_MODEL_OVERRIDE=1 npm run dev
// 2. In another:       npm run eval
//
// Options (env vars):
//   EVAL_MODELS=gpt-5.4-mini,gpt-5.6-luna   models to compare (default: the server's default)
//   EVAL_STYLES=verse,arjuna,direct         styles to run (default: all three)
//   EVAL_LIMIT=10                           only the first N questions (default: all 30)
//   BASE_URL=http://localhost:3000
// Cost guide: 30 questions x 3 styles = 90 replies per model (roughly Rs 30-100 per model).
import fs from "node:fs";

const BASE = process.env.BASE_URL || "http://localhost:3000";
const MODELS = (process.env.EVAL_MODELS || "").split(",").map((s) => s.trim()).filter(Boolean);
const STYLES = (process.env.EVAL_STYLES || "verse,arjuna,direct").split(",").map((s) => s.trim());
const LIMIT = Number(process.env.EVAL_LIMIT || 999);

const QUESTIONS = [
  "I'm a final-year engineering student. Placements start next week and I keep imagining failing interviews while my friends get offers. I can't sleep and I've stopped preparing.",
  "My manager takes credit for my work in every meeting. I'm furious but I stay quiet, and then I snap at my wife at home.",
  "My father passed away three months ago. Everyone expects me to be back to normal but I still can't open his cupboard.",
  "I've been clean from smoking for 40 days and today I bought a pack. I feel like a complete failure.",
  "My parents want me to join the family business but I want to be a musician. I don't want to hurt them.",
  "I feel lost.",
  "I'm 34 and all my college friends are married with kids and good jobs. I feel like I'm way behind in life.",
  "I got a promotion to team lead and I'm terrified. I don't know how to manage people older than me.",
  "Mujhe exam ka bahut darr lag raha hai, padhai mein mann nahi lagta.",
  "My best friend and I had a huge fight a year ago over money. I still think about it every day and can't forgive him.",
  "I keep procrastinating on my startup. I spend hours on reels instead of working and hate myself for it.",
  "I quit my stable job to do an MBA and now I'm halfway through and doubting everything. What if I wasted two years?",
  "My partner broke up with me after 5 years. I keep checking her Instagram every night.",
  "I'm a doctor and I lost a patient today. I keep replaying what I could have done differently.",
  "I want to meditate but my mind won't stop jumping around. How do I even start?",
  "My mother-in-law criticises everything I do. I try to be patient but I'm running out of patience.",
  "I have ₹12 lakh of loans and the EMI stress is eating me alive. I can't think about anything else.",
  "People at work praise me a lot and I've started needing it. When nobody notices my work I feel empty.",
  "I don't believe in God but I like the Gita. Is that allowed? Can it still help me?",
  "I'm working 14 hours a day and I'm exhausted but I'm scared that if I slow down I'll lose my job.",
  "I lied to my team to cover a mistake and now it's getting bigger. What should I do?",
  "My younger brother is doing drugs and my parents don't know. Should I tell them?",
  "I have two job offers: one pays much more, the other is work I love. I can't decide.",
  "Whenever someone is rude to me I stay angry for days replaying what I should have said.",
  "I'm 60 and just retired. I don't know who I am without my work.",
  "Life is hard.",
  "Mera dost mujhse aage nikal gaya, mujhe jealousy hoti hai aur phir guilt bhi.",
  "I've been diagnosed with a serious illness and I'm scared of dying.",
  "I'm a teacher and my students don't listen. I feel like my work doesn't matter.",
  "I keep starting things and giving up after two weeks. Gym, courses, diets. What's wrong with me?",
].slice(0, LIMIT);

const BANNED = [
  "it's okay to feel", "it's completely understandable", "remember that", "it's important to", "take a deep breath",
  "practice mindfulness", "self-care", "you've got this", "everything happens for a reason", "stay positive",
  "journey", "fast-paced world",
];

async function ask(q, style, model) {
  const t0 = Date.now();
  const res = await fetch(`${BASE}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ style, model: model || undefined, messages: [{ role: "user", content: q }] }),
  });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  const body = await res.text();
  const nl = body.indexOf("\n");
  let header = {};
  try {
    header = JSON.parse(body.slice(0, nl));
  } catch {}
  const text = body.slice(nl + 1).trim();
  const cited = [...text.matchAll(/\[\[\s*(\d{1,2})\.(\d{1,2})\s*\]\]/g)].map((m) => `${+m[1]}.${+m[2]}`);
  return { q, style, model: header.model || model || "default", header, text, cited, ms: Date.now() - t0 };
}

async function pool(tasks, n = 4) {
  const out = [];
  let i = 0;
  await Promise.all(
    Array.from({ length: n }, async () => {
      while (i < tasks.length) {
        const k = i++;
        try {
          out[k] = await tasks[k]();
        } catch (e) {
          out[k] = { error: String(e) };
        }
        process.stdout.write(out[k].error ? "x" : ".");
      }
    }),
  );
  return out;
}

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

const tasks = [];
for (const model of MODELS.length ? MODELS : [""]) for (const q of QUESTIONS) for (const s of STYLES) tasks.push(() => ask(q, s, model));
console.log(`Running ${tasks.length} requests against ${BASE} …`);
const results = (await pool(tasks)).filter((r) => r && !r.error);
console.log(`\nDone: ${results.length}/${tasks.length} succeeded.`);

const byModel = {};
for (const r of results) (byModel[r.model] ??= []).push(r);
const summary = Object.entries(byModel).map(([model, rs]) => {
  const all = rs.flatMap((r) => r.cited);
  const counts = {};
  for (const c of all) counts[c] = (counts[c] || 0) + 1;
  const withCites = rs.filter((r) => r.cited.length);
  const ch1 = withCites.filter((r) => r.cited.some((c) => c.startsWith("1."))).length;
  const inShort = rs.reduce((n, r) => n + r.cited.filter((c) => (r.header.shortlist || []).includes(c)).length, 0) / Math.max(1, all.length);
  const banned = rs.reduce((n, r) => n + BANNED.filter((b) => r.text.toLowerCase().includes(b)).length, 0);
  const words = rs.reduce((n, r) => n + r.text.split(/\s+/).length, 0) / rs.length;
  return {
    model,
    replies: rs.length,
    distinct: Object.keys(counts).length,
    ch1: withCites.length ? Math.round((100 * ch1) / withCites.length) : 0,
    inShort: Math.round(100 * inShort),
    banned,
    words: Math.round(words),
    clarify: rs.filter((r) => r.header.clarify).length,
    fallback: rs.filter((r) => r.header.reader === "fallback").length,
    secs: (rs.reduce((n, r) => n + r.ms, 0) / rs.length / 1000).toFixed(1),
    top: Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 10),
  };
});

const cards = QUESTIONS.map((q) => {
  const rs = results.filter((r) => r.q === q);
  return `<section><h3>${esc(q)}</h3><div class="grid">${rs
    .map(
      (r) => `<article><div class="meta">${esc(r.model)} · ${r.style} · themes: ${esc((r.header.themes || []).join(", "))}${
        r.header.moment ? ` · moment: ${esc(r.header.moment)}` : ""
      } · cited: ${esc(r.cited.join(", ") || "none")} · ${(r.ms / 1000).toFixed(1)}s</div><pre>${esc(r.text)}</pre></article>`,
    )
    .join("")}</div></section>`;
}).join("");

const html = `<!doctype html><meta charset="utf-8"><title>Sarathi eval</title>
<style>body{font:14px/1.5 system-ui;margin:24px;background:#fbf6ec;color:#2b2118}table{border-collapse:collapse;margin:12px 0}
td,th{border:1px solid #e8dcc6;padding:6px 10px;text-align:left}th{background:#f5ecdb}section{margin:28px 0}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(360px,1fr));gap:12px}article{background:#fff;border:1px solid #e8dcc6;border-radius:10px;padding:10px}
.meta{font-size:12px;color:#7a6a58;margin-bottom:6px}pre{white-space:pre-wrap;font:13px/1.55 system-ui;margin:0}</style>
<h1>Sarathi eval · ${new Date().toISOString().slice(0, 16)}</h1>
<table><tr><th>Model</th><th>Replies</th><th>Distinct verses</th><th>% citing ch.1 (target &lt;5%)</th><th>% citations from shortlist</th>
<th>Banned phrases</th><th>Avg words</th><th>Clarifying replies</th><th>Reader fallbacks</th><th>Avg secs</th><th>Top verses</th></tr>
${summary
  .map(
    (s) =>
      `<tr><td>${esc(s.model)}</td><td>${s.replies}</td><td>${s.distinct}</td><td>${s.ch1}%</td><td>${s.inShort}%</td><td>${s.banned}</td><td>${s.words}</td><td>${s.clarify}</td><td>${s.fallback}</td><td>${s.secs}</td><td>${s.top
        .map(([v, n]) => `${v}×${n}`)
        .join(", ")}</td></tr>`,
  )
  .join("")}</table>${cards}`;
fs.writeFileSync("eval-report.html", html);
console.table(summary.map((s) => ({ ...s, top: s.top.slice(0, 3).map(([v, n]) => `${v}x${n}`).join(" ") })));
console.log("Report written to eval-report.html");
