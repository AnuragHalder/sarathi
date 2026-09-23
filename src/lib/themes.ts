// Hand-curated retrieval index. Verse IDs follow the data's 701-verse numbering
// (chapter 13 is one higher than 700-verse editions). Every ID was checked against src/data/verses.json.

export type Theme = { key: string; situation: string; verses: string[] };

export const THEMES: Theme[] = [
  { key: "fear-of-failure", situation: "Anxiety about results, exams, interviews", verses: ["2.47", "2.48", "2.38", "2.40", "4.20", "5.12"] },
  { key: "overthinking", situation: "Restless mind, can't switch off", verses: ["6.5", "6.26", "6.35", "6.19", "2.66", "2.67"] },
  { key: "anger", situation: "Losing temper, then regret", verses: ["2.62", "2.63", "3.37", "16.21", "5.23", "16.2"] },
  { key: "craving", situation: "Desire, addiction, bad habits", verses: ["2.60", "2.64", "3.39", "3.41", "3.43", "5.22"] },
  { key: "grief", situation: "Loss of a loved one", verses: ["2.11", "2.13", "2.20", "2.22", "2.27", "2.28"] },
  { key: "fear-of-death", situation: "Mortality, serious illness", verses: ["2.20", "2.23", "2.27", "2.13", "8.5"] },
  { key: "self-worth", situation: "Low confidence, harsh self-criticism", verses: ["6.5", "6.6", "4.36", "9.30", "9.31", "15.7"] },
  { key: "guilt", situation: "Past mistakes, shame", verses: ["4.36", "4.37", "9.30", "9.31", "18.66", "6.40"] },
  { key: "purpose", situation: "Career confusion, what is my path", verses: ["3.35", "18.47", "18.46", "18.48", "3.8", "6.1"] },
  { key: "procrastination", situation: "Inertia, avoidance, laziness (tamas)", verses: ["3.8", "14.8", "14.13", "18.39", "2.3", "6.16"] },
  { key: "burnout", situation: "Overwork, exhaustion", verses: ["6.16", "6.17", "2.48", "5.12", "18.9", "3.19"] },
  { key: "comparison", situation: "Envy, comparing with peers", verses: ["3.35", "18.47", "12.13", "12.15", "5.20", "4.22"] },
  { key: "praise-criticism", situation: "Hurt by criticism, craving approval", verses: ["12.18", "12.19", "14.24", "14.25", "2.56", "2.14"] },
  { key: "ego", situation: "Pride, needing credit", verses: ["3.27", "13.8", "16.4", "5.8", "18.58"] },
  { key: "difficult-people", situation: "Conflict with a boss, family or partner", verses: ["6.9", "12.13", "12.15", "5.18", "16.2", "16.3"] },
  { key: "speech", situation: "Harsh words, hard conversations", verses: ["17.15", "16.2", "12.15", "13.8"] },
  { key: "loneliness", situation: "Feeling alone or abandoned", verses: ["9.29", "6.30", "9.22", "18.61", "6.29"] },
  { key: "despair", situation: "Hopelessness, wanting to give up", verses: ["2.3", "6.40", "18.58", "9.22", "18.66", "2.40"] },
  { key: "dilemma", situation: "Hard decision, right vs right", verses: ["2.7", "3.2", "18.30", "18.63", "16.24", "3.35"] },
  { key: "family-duty", situation: "Own path vs parents' or family expectations", verses: ["3.35", "18.47", "18.48", "2.31", "2.33", "3.8"] },
  { key: "ups-downs", situation: "Staying steady through success and failure", verses: ["2.14", "2.38", "2.48", "2.56", "5.20", "12.18"] },
  { key: "out-of-control", situation: "Outcome depends on others or luck", verses: ["18.14", "3.27", "2.47", "5.8", "18.11"] },
  { key: "money", situation: "Financial anxiety, greed", verses: ["2.45", "9.22", "2.70", "2.71", "4.22", "16.12"] },
  { key: "discipline", situation: "Sleep, food, health habits", verses: ["6.16", "6.17", "17.8", "2.59", "6.26"] },
  { key: "calm-down", situation: "Finding stillness, starting meditation", verses: ["6.10", "6.12", "6.19", "5.27", "2.58", "6.21"] },
  { key: "faith-doubt", situation: "Doubt, spiritual confusion", verses: ["4.39", "4.40", "17.3", "7.21", "4.38"] },
  { key: "quit", situation: "Wanting to quit or run away", verses: ["3.4", "3.8", "5.2", "18.7", "18.8", "18.11"] },
  { key: "restart", situation: "Starting over, fear of failing halfway", verses: ["6.40", "6.41", "6.45", "2.40", "4.36"] },
  { key: "leadership", situation: "Setting an example, carrying responsibility", verses: ["3.21", "3.20", "3.25", "18.43", "12.15"] },
  { key: "excellence", situation: "Quality of work, skill in action", verses: ["2.50", "3.8", "18.46", "3.19", "18.9"] },
  { key: "service", situation: "Meaning through helping others", verses: ["3.19", "3.25", "5.25", "12.4", "6.32", "12.13"] },
  { key: "contentment", situation: "Never enough, gratitude", verses: ["12.19", "4.22", "2.55", "12.14", "3.17", "2.70"] },
  { key: "temptation", situation: "Self-control lapses", verses: ["2.58", "2.59", "2.60", "2.67", "6.6", "3.41"] },
  { key: "courage", situation: "Fear of standing up for what is right", verses: ["2.3", "2.31", "2.37", "16.1", "4.10", "18.43"] },
  { key: "resentment", situation: "Holding grudges, forgiveness", verses: ["16.3", "12.13", "2.63", "6.9", "5.18", "12.18"] },
  { key: "heartbreak", situation: "Breakup, attachment to a person", verses: ["2.62", "5.21", "5.22", "2.14", "6.21", "2.70"] },
  { key: "identity", situation: "Who am I, the Self", verses: ["2.20", "2.23", "13.2", "15.7", "6.29", "13.28"] },
  { key: "surrender", situation: "Letting go, trusting", verses: ["18.66", "9.22", "18.62", "18.57", "12.7", "18.61"] },
  { key: "change", situation: "Impermanence, life transitions", verses: ["2.14", "2.13", "2.22", "2.28", "5.22"] },
  { key: "seeing-good", situation: "Prejudice, seeing oneness in people", verses: ["5.18", "6.29", "6.30", "13.28", "18.20", "6.32"] },
];

export type ArjunaMoment = {
  key: string;
  arjuna: string[]; // Arjuna's own words: for the story, not to be cited as the teaching
  felt: string;
  parallel: string;
  answer: string[]; // Krishna's reply: the verses to cite
};

export const ARJUNA_MOMENTS: ArjunaMoment[] = [
  { key: "collapse", arjuna: ["1.28", "1.29", "1.30", "1.47", "2.7"], felt: "Body gives way; cannot face people he loves; begs to be taught", parallel: "Freezing before a confrontation involving family; total paralysis", answer: ["2.3", "2.11", "2.13"] },
  { key: "steady-mind", arjuna: ["2.54"], felt: "What does a person of steady wisdom look like?", parallel: "Wanting to be calm like someone you admire", answer: ["2.55", "2.56", "2.70"] },
  { key: "mixed-advice", arjuna: ["3.1", "3.2"], felt: "Your words confuse me. Tell me one thing for certain.", parallel: "Parents and mentors giving opposite advice", answer: ["3.3", "3.8", "3.35"] },
  { key: "against-will", arjuna: ["3.36"], felt: "What drives a person to do wrong even against their will?", parallel: "Relapsing into a habit you have sworn off", answer: ["3.37", "3.41", "3.43"] },
  { key: "skepticism", arjuna: ["4.4"], felt: "Doubts how Krishna could have taught the ancients", parallel: "Distrusting advice or authority", answer: ["4.5", "4.7"] },
  { key: "quit-or-continue", arjuna: ["5.1"], felt: "You praise giving up action, then action. Which is better?", parallel: "Resign or stay; drop out or push on", answer: ["5.2", "6.1"] },
  { key: "restless-mind", arjuna: ["6.33", "6.34"], felt: "The mind is as hard to hold as the wind.", parallel: "Cannot focus; mind racing at night", answer: ["6.35", "6.26"] },
  { key: "fail-halfway", arjuna: ["6.37", "6.38", "6.39"], felt: "If one falls short, is all effort lost?", parallel: "Switched careers midway, abandoned a course", answer: ["6.40", "6.41", "2.40"] },
  { key: "big-questions", arjuna: ["8.1", "8.2"], felt: "Asks what the self, action and death really are", parallel: "What is the point of all this?", answer: ["8.3", "8.5"] },
  { key: "seeking-meaning", arjuna: ["10.17"], felt: "In what things should I think of you?", parallel: "Finding meaning in ordinary life", answer: ["10.20", "10.41"] },
  { key: "wants-big-picture", arjuna: ["11.1", "11.4"], felt: "His confusion lifts; he asks to see the whole", parallel: "Craving certainty about the future", answer: ["11.8"] },
  { key: "taken-for-granted", arjuna: ["11.41", "11.42"], felt: "Regrets treating his dearest friend casually", parallel: "Regret over taking a loved one for granted", answer: ["11.49", "11.55"] },
  { key: "overwhelmed", arjuna: ["11.45", "11.46"], felt: "Thrilled and terrified at once; asks for the familiar form", parallel: "Promotion, new parenthood, something too big", answer: ["11.49"] },
  { key: "which-path", arjuna: ["12.1"], felt: "Which devotees are better, those of form or the formless?", parallel: "Choosing between two good paths", answer: ["12.2", "12.8", "12.12"] },
  { key: "beyond-moods", arjuna: ["14.21"], felt: "How does one rise above the gunas?", parallel: "Mood swings; being run by moods", answer: ["14.22", "14.24", "14.26"] },
  { key: "unconventional-faith", arjuna: ["17.1"], felt: "What of those with faith who ignore the rules?", parallel: "Spiritual but not religious; sincere but unorthodox", answer: ["17.2", "17.3"] },
  { key: "letting-go", arjuna: ["18.1"], felt: "What do renunciation and letting go really mean?", parallel: "Confusing detachment with not caring", answer: ["18.2", "18.9", "18.11"] },
];

const THEME_BY_KEY = new Map(THEMES.map((t) => [t.key, t]));
const MOMENT_BY_KEY = new Map(ARJUNA_MOMENTS.map((m) => [m.key, m]));
export const getTheme = (k: string) => THEME_BY_KEY.get(k);
export const getMoment = (k: string | null | undefined) => (k ? MOMENT_BY_KEY.get(k) : undefined);

/** One line per theme / moment, for the situation reader's prompt. */
export const THEME_LIST = THEMES.map((t) => `${t.key}: ${t.situation}`).join("\n");
export const MOMENT_LIST = ARJUNA_MOMENTS.map((m) => `${m.key}: ${m.parallel}`).join("\n");

/** Verse IDs the assistant has already cited in this conversation ([[x.y]] tags). */
export function citedIn(texts: string[]): Set<string> {
  const out = new Set<string>();
  for (const t of texts) {
    for (const m of t.matchAll(/\[\[\s*(?:BG\s*)?(\d{1,2})\.(\d{1,2})\s*\]\]/gi)) out.add(`${Number(m[1])}.${Number(m[2])}`);
  }
  return out;
}

/**
 * Build the verse shortlist: verses of the detected themes (round-robin so each theme is represented),
 * plus Krishna's answer verses for the Arjuna moment, minus anything already cited. Capped at `max`.
 */
export function buildShortlist(themes: string[], moment: string | null | undefined, exclude: Set<string>, max = 15): string[] {
  const lists: string[][] = [];
  const m = getMoment(moment);
  if (m) lists.push(m.answer);
  for (const k of themes) {
    const t = getTheme(k);
    if (t) lists.push(t.verses);
  }
  const out: string[] = [];
  const seen = new Set(exclude);
  for (let i = 0; out.length < max && lists.some((l) => i < l.length); i++) {
    for (const l of lists) {
      const id = l[i];
      if (id && !seen.has(id)) {
        seen.add(id);
        out.push(id);
        if (out.length >= max) break;
      }
    }
  }
  return out;
}

/** Fallback when the situation reader is unavailable: rough keyword match (English + Hinglish). */
const KEYWORDS: [RegExp, string][] = [
  [/exam|interview|result|placement|test|marks|fail|promotion|appraisal|pariksha|darr/i, "fear-of-failure"],
  [/overthink|can'?t stop thinking|racing|restless|sleep|insomnia|soch/i, "overthinking"],
  [/anger|angry|temper|rage|irritat|gussa/i, "anger"],
  [/addict|craving|porn|smok|drink|alcohol|phone|scroll|habit/i, "craving"],
  [/died|death|passed away|lost (my|a)|grief|funeral|mourn/i, "grief"],
  [/worthless|not good enough|confidence|hate myself|insecure/i, "self-worth"],
  [/guilt|shame|regret|mistake/i, "guilt"],
  [/purpose|meaning|career|path|direction|what should i do with my life/i, "purpose"],
  [/procrastinat|lazy|motivation|can'?t start|avoid/i, "procrastination"],
  [/burn ?out|exhausted|overwork|tired/i, "burnout"],
  [/jealous|envy|compar|friends are ahead|others are doing better/i, "comparison"],
  [/boss|manager|colleague|coworker|partner|husband|wife|in-?laws|conflict|fight/i, "difficult-people"],
  [/lonely|alone|no friends|abandon/i, "loneliness"],
  [/hopeless|give up|pointless|no way out/i, "despair"],
  [/decide|decision|dilemma|confused between|choose/i, "dilemma"],
  [/parents|family expect|father wants|mother wants|society/i, "family-duty"],
  [/money|debt|loan|salary|financial|paisa/i, "money"],
  [/quit|resign|leave (my )?job|drop out|run away/i, "quit"],
  [/breakup|broke up|ex |heartbreak|rejected/i, "heartbreak"],
  [/criticis|insult|humiliat|praise|approval|judg/i, "praise-criticism"],
  [/meditat|calm|peace|stillness/i, "calm-down"],
  [/forgive|grudge|resent|revenge/i, "resentment"],
];
export function guessThemes(text: string): string[] {
  const hits = [...new Set(KEYWORDS.filter(([r]) => r.test(text)).map(([, k]) => k))].slice(0, 3);
  return hits.length ? hits : ["ups-downs"];
}
