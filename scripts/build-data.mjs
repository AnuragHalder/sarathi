// Builds clean app data from https://github.com/vedicscriptures/bhagavad-gita
// Usage: node scripts/build-data.mjs <path-to-cloned-repo>
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const DICT = new Set(require("an-array-of-english-words"));

const src = process.argv[2];
if (!src) {
  console.error("Usage: node scripts/build-data.mjs <path-to-bhagavad-gita-repo>");
  process.exit(1);
}
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const outData = path.join(root, "src/data");
const outComm = path.join(root, "public/commentary");
const outVerse = path.join(root, "public/verse");
for (const d of [outData, outComm, outVerse]) fs.mkdirSync(d, { recursive: true });

const FIELD_LABELS = {
  et: "English translation",
  ht: "Hindi translation",
  ec: "English commentary",
  hc: "Hindi commentary",
  sc: "Sanskrit commentary",
};

const isPlaceholder = (s) =>
  !s || s.trim().length < 5 || /did not comment on this|has not translated this/i.test(s);

// ---------------------------------------------------------------------------
// Repair: the source lost every "qu" in many English texts ("eanimity", "alities",
// "conered"). For each unknown word, try inserting "qu" at each position; if exactly
// one result is a real English word, use it.
const repairs = new Map();
// Rare English words that collide with Sanskrit terms (asat, asi, idam, ena…) — never produce these.
const NOT_QU = new Set(["asquat", "quasi", "quidam", "quena", "queys", "quint", "quipu", "maquis"]);
function fixQu(text) {
  return text.replace(/[A-Za-z]{3,}/g, (w) => {
    const lw = w.toLowerCase();
    if (DICT.has(lw)) return w;
    const hits = new Set();
    for (let i = 0; i <= lw.length; i++) {
      const cand = lw.slice(0, i) + "qu" + lw.slice(i);
      if (DICT.has(cand) && !NOT_QU.has(cand)) hits.add(cand);
    }
    if (hits.size !== 1) return w;
    let fixed = [...hits][0];
    if (w[0] === w[0].toUpperCase()) fixed = fixed[0].toUpperCase() + fixed.slice(1);
    repairs.set(w, fixed);
    return fixed;
  });
}

// "2.47 Your…" / "2.62-2.63 In…" / "।।2.47।। कर्म…" -> strip leading verse numbers
const stripNum = (s) =>
  s
    .replace(/^\s*(।।)?\s*\d+\.\d+\.?\s*(-\s*\d+\.\d+\.?)?\s*(।।)?\s*/, "")
    .replace(/^\s*-\s*\d+\.\d+\.?\s*/, "")
    .replace(/\s+/g, " ")
    .trim();

// translator notes like "[Meaning only the portion …-Tr.]"
const stripNotes = (s) => s.replace(/\s*\[[^\]]{0,400}\]/g, "").replace(/\s+([,.;:?!])/g, "$1").replace(/\s{2,}/g, " ").trim();

const cleanEn = (s) => stripNotes(fixQu(stripNum(s)));

// repo uses "." for avagraha in IAST (saṅgo.astv…) -> "'"
const fixTranslit = (s) =>
  s
    .replace(/\|\|\s*\d+-\d+\s*\|\|/g, "")
    .replace(/(\p{L})\.a/gu, "$1'")
    .replace(/\s*\.\s*\n/g, " |\n")
    .trim();

// Devanagari: drop trailing ||२-४७|| marker
const fixSanskrit = (s) =>
  s.replace(/\|\|[०-९\d]+-[०-९\d]+\|\|/g, "॥").replace(/\|\|/g, "॥").replace(/\|/g, "।").trim();

// ---------------------------------------------------------------------------
const chapters = [];
for (let c = 1; c <= 18; c++) {
  const d = JSON.parse(fs.readFileSync(path.join(src, `chapter/bhagavadgita_chapter_${c}.json`), "utf8"));
  chapters.push({
    number: c,
    name: d.name,
    transliteration: d.transliteration,
    translation: d.translation,
    meaning: d.meaning?.en ?? "",
    summary: d.summary?.en ?? "",
    versesCount: d.verses_count,
  });
}

const raw = [];
const colophons = {};
for (const ch of chapters) {
  const files = fs
    .readdirSync(path.join(src, "slok"))
    .filter((f) => f.startsWith(`bhagavadgita_chapter_${ch.number}_slok_`));
  for (const f of files) {
    const d = JSON.parse(fs.readFileSync(path.join(src, "slok", f), "utf8"));
    if (d.verse > ch.versesCount) colophons[ch.number] = fixSanskrit(d.slok);
    else raw.push(d);
  }
}
raw.sort((a, b) => a.chapter - b.chapter || a.verse - b.verse);

// Translator preference for the main English line.
const TRANSLATORS = ["gambir", "siva", "adi", "san", "purohit", "prabhu"];

// A translation identical to that of a NON-adjacent verse is a copy error in the source
// (e.g. 18.45 carries 5.10's text). Identical adjacent verses are genuinely combined.
const seen = new Map(); // `${key}:${text}` -> index
const broken = new Set(); // `${key}:${index}`
raw.forEach((d, i) => {
  for (const k of TRANSLATORS) {
    const t = d[k]?.et;
    if (isPlaceholder(t)) continue;
    const sig = `${k}:${stripNum(t).slice(0, 120)}`;
    if (seen.has(sig)) {
      const j = seen.get(sig);
      if (i - j > 3) broken.add(`${k}:${i}`);
    } else seen.set(sig, i);
  }
});

const verses = [];
const authors = {};
const excerpts = {};
const EXCERPT_SOURCES = [
  // [key, field, label]
  ["sankar", "et", "Shankaracharya"],
  ["raman", "et", "Ramanujacharya"],
  ["siva", "ec", "Swami Sivananda"],
  ["abhinav", "et", "Abhinavagupta"],
  ["prabhu", "ec", "Prabhupada"],
];

function excerptOf(key, field, text) {
  let t = text;
  if (key === "siva" && field === "ec") {
    // Sivananda's commentary opens with a word-by-word gloss; keep what follows "Commentary"
    const i = t.indexOf("Commentary");
    if (i === -1) return "";
    t = t.slice(i + "Commentary".length);
  }
  t = cleanEn(t).replace(/\?(?=\s|$)/g, ",");
  if (t.length < 60) return "";
  if (t.length <= 480) return t;
  const cut = t.slice(0, 480);
  const end = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("; "));
  return (end > 200 ? cut.slice(0, end + 1) : cut) + " …";
}

raw.forEach((d, i) => {
  const id = `${d.chapter}.${d.verse}`;
  const commentary = [];
  for (const [key, val] of Object.entries(d)) {
    if (!val || typeof val !== "object" || !val.author) continue;
    authors[key] = val.author;
    for (const [field, text] of Object.entries(val)) {
      if (field === "author" || isPlaceholder(text)) continue;
      const isEn = field.startsWith("e");
      commentary.push({
        key,
        author: val.author,
        type: field,
        label: FIELD_LABELS[field] ?? field,
        text: isEn ? fixQu(stripNum(text)) : stripNum(text),
      });
    }
  }
  const tk = TRANSLATORS.find((k) => !isPlaceholder(d[k]?.et) && !broken.has(`${k}:${i}`));
  const ex = [];
  for (const [key, field, label] of EXCERPT_SOURCES) {
    const t = d[key]?.[field];
    if (isPlaceholder(t)) continue;
    const e = excerptOf(key, field, t);
    if (e) ex.push({ by: label, text: e });
  }
  excerpts[id] = ex;
  verses.push({
    id,
    chapter: d.chapter,
    verse: d.verse,
    speaker: d.speaker,
    sanskrit: fixSanskrit(d.slok),
    transliteration: fixTranslit(d.transliteration),
    translation: tk ? cleanEn(d[tk].et) : "",
    translationBy: tk ? d[tk].author : "",
    hindi: !isPlaceholder(d.tej?.ht) ? stripNum(d.tej.ht) : "",
  });
  fs.writeFileSync(path.join(outComm, `${id}.json`), JSON.stringify(commentary));
});

fs.writeFileSync(path.join(outData, "verses.json"), JSON.stringify(verses));
for (const v of verses) fs.writeFileSync(path.join(outVerse, `${v.id}.json`), JSON.stringify(v));
fs.writeFileSync(path.join(outData, "chapters.json"), JSON.stringify(chapters));
fs.writeFileSync(path.join(outData, "authors.json"), JSON.stringify({ authors, colophons }, null, 1));
fs.writeFileSync(path.join(outData, "excerpts.json"), JSON.stringify(excerpts));

const SPEAKERS = { "श्रीभगवान्": "Krishna", "अर्जुन": "Arjuna", "सञ्जय": "Sanjaya", "धृतराष्ट्र": "Dhritarashtra" };
// Compact corpus for the LLM prompt: one line per verse
const corpus = [];
for (const ch of chapters) {
  corpus.push(`\n# Chapter ${ch.number}: ${ch.translation} (${ch.meaning})`);
  for (const v of verses.filter((x) => x.chapter === ch.number)) {
    corpus.push(`${v.id} [${SPEAKERS[v.speaker] ?? v.speaker}] ${v.translation}`);
  }
}
const corpusText = corpus.join("\n").trim();
fs.writeFileSync(path.join(outData, "corpus.txt"), corpusText);
fs.writeFileSync(
  path.join(outData, "corpus.ts"),
  `// Generated by scripts/build-data.mjs. Do not edit.\nconst corpus = ${JSON.stringify(corpusText)};\nexport default corpus;\n`,
);

const brokenList = [...broken].map((b) => {
  const [k, i] = b.split(":");
  return `${raw[i].chapter}.${raw[i].verse} (${k})`;
});
console.log(`verses: ${verses.length}, colophons: ${Object.keys(colophons).length}, corpus chars: ${corpusText.length}`);
console.log(`copy-error translations skipped: ${brokenList.join(", ") || "none"}`);
console.log(`"qu" repairs: ${repairs.size} distinct words`);
fs.writeFileSync(path.join(root, "scripts/qu-repairs.log"), [...repairs].map(([a, b]) => `${a} -> ${b}`).sort().join("\n"));
