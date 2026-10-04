// Builds the app's verse data.
//  - Sanskrit verses, transliteration and the ancient acharyas' Sanskrit commentaries (public domain) come from
//    https://github.com/vedicscriptures/bhagavad-gita
//  - The English and Hindi lines are Sarathi's own translation: data-src/sarathi-translation.json
//  - Modern translations and English/Hindi commentaries in the source repo are copyrighted and are NOT used.
// Usage: node scripts/build-data.mjs <path-to-cloned-repo>
import fs from "node:fs";
import path from "node:path";

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


const isPlaceholder = (s) =>
  !s || s.trim().length < 5 || /did not comment on this|has not translated this/i.test(s);

// "2.47 Your…" / "2.62-2.63 In…" / "।।2.47।। कर्म…" -> strip leading verse numbers
const stripNum = (s) =>
  s
    .replace(/^\s*(।।)?\s*\d+\.\d+\.?\s*(-\s*\d+\.\d+\.?)?\s*(।।)?\s*/, "")
    .replace(/^\s*-\s*\d+\.\d+\.?\s*/, "")
    .replace(/\s+/g, " ")
    .trim();

// repo uses "." for avagraha in IAST (saṅgo.astv…) -> "'"
const fixTranslit = (s) =>
  s
    .replace(/\|\|\s*\d+-\d+\s*\|\|/g, "")
    .replace(/(\p{L})\.a/gu, "$1'")
    .replace(/\s*\.\s*\n/g, " |\n")
    .trim();

// A few transliterations are garbled in the source; corrected by hand.
const TRANSLIT_FIX = {
  "2.64": "rāgadveṣaviyuktaistu viṣayānindriyaiścaran |\nātmavaśyairvidheyātmā prasādamadhigacchati",
  "8.8": "abhyāsayogayuktena cetasā nānyagāminā |\nparamaṃ puruṣaṃ divyaṃ yāti pārthānucintayan",
  "8.12": "sarvadvārāṇi saṃyamya mano hṛdi nirudhya ca |\nmūrdhnyādhāyātmanaḥ prāṇamāsthito yogadhāraṇām",
  "8.24": "agnirjyotirahaḥ śuklaḥ ṣaṇmāsā uttarāyaṇam |\ntatra prayātā gacchanti brahma brahmavido janāḥ",
};

// Devanagari: drop trailing ||२-४७|| marker
const fixSanskrit = (s) =>
  s.replace(/\|\|[०-९\d]+-[०-९\d]+\|\|/g, "॥").replace(/\|\|/g, "॥").replace(/\|/g, "।").trim();

// ---------------------------------------------------------------------------
// Chapter titles: the traditional Sanskrit names (from the colophons) with Sarathi's own short English titles.
const CHAPTER_TITLES = [
  "Arjuna's Despair", "Knowledge and the Undying Self", "The Path of Action", "Knowledge, Action and Renunciation",
  "True Renunciation", "Meditation and Self-Mastery", "Knowing and Realising", "The Imperishable",
  "The Royal Secret", "Divine Glories", "The Vision of the Cosmic Form", "The Path of Devotion",
  "The Field and Its Knower", "The Three Gunas", "The Highest Person", "Divine and Demonic Natures",
  "The Three Kinds of Faith", "Freedom through Letting Go",
];
const chapters = [];
for (let c = 1; c <= 18; c++) {
  const d = JSON.parse(fs.readFileSync(path.join(src, `chapter/bhagavadgita_chapter_${c}.json`), "utf8"));
  chapters.push({
    number: c,
    name: d.name,
    transliteration: d.transliteration,
    translation: d.translation,
    meaning: CHAPTER_TITLES[c - 1],
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

// Sarathi's own English + Hindi translation (one entry per verse).
const own = new Map(JSON.parse(fs.readFileSync(path.join(root, "data-src/sarathi-translation.json"), "utf8")).map((x) => [x.id, x]));

// Ancient acharyas whose Sanskrit commentaries are shown and used. (Abhinavagupta's text in the source carries a
// modern editor's apparatus, so it is left out.)
const ACHARYAS = {
  sankar: "Shankaracharya",
  raman: "Ramanujacharya",
  madhav: "Madhvacharya",
  srid: "Sridhara Swami",
  ms: "Madhusudana Saraswati",
  anand: "Anandagiri",
  jaya: "Jayatirtha",
  vallabh: "Vallabhacharya",
  venkat: "Vedanta Deshika",
  dhan: "Dhanapati",
  puru: "Purushottama",
  neel: "Nilakantha",
};
// The ones Sarathi reads before replying (most widely studied first).
const EXCERPT_FROM = ["sankar", "raman", "srid", "madhav"];

// Sanskrit commentary text: drop verse numbers, editors' notes in brackets, odd spaces.
const cleanSc = (s) =>
  stripNum(s.replace(/\u00a0/g, " "))
    .replace(/\([^)]{0,80}\)/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();

function excerptOf(text) {
  const t = cleanSc(text);
  if (t.length < 40) return "";
  if (t.length <= 450) return t;
  const cut = t.slice(0, 450);
  const end = cut.lastIndexOf("।");
  return (end > 150 ? cut.slice(0, end + 1) : cut) + " …";
}

const verses = [];
const authors = {};
const excerpts = {};
const missing = [];
raw.forEach((d) => {
  const id = `${d.chapter}.${d.verse}`;
  const commentary = [];
  for (const [key, name] of Object.entries(ACHARYAS)) {
    const t = d[key]?.sc;
    if (isPlaceholder(t)) continue;
    authors[key] = name;
    commentary.push({ key, author: name, type: "sc", label: "Sanskrit commentary", text: cleanSc(t) });
  }
  const ex = [];
  for (const key of EXCERPT_FROM) {
    const t = d[key]?.sc;
    if (isPlaceholder(t)) continue;
    const e = excerptOf(t);
    if (e) ex.push({ by: ACHARYAS[key], text: e });
  }
  excerpts[id] = ex;
  const tr = own.get(id);
  if (!tr) missing.push(id);
  verses.push({
    id,
    chapter: d.chapter,
    verse: d.verse,
    speaker: d.speaker,
    sanskrit: fixSanskrit(d.slok),
    transliteration: TRANSLIT_FIX[id] ?? fixTranslit(d.transliteration),
    translation: tr?.en ?? "",
    translationBy: "Sarathi",
    hindi: tr?.hi ?? "",
  });
  fs.writeFileSync(path.join(outComm, `${id}.json`), JSON.stringify(commentary));
});
if (missing.length) {
  console.error("Missing Sarathi translation for:", missing.join(", "));
  process.exit(1);
}

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

console.log(`verses: ${verses.length}, colophons: ${Object.keys(colophons).length}, corpus chars: ${corpusText.length}`);
