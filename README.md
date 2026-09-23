# Sarathi: Gita Counsel (MVP)

A mobile-first web app (PWA) where people describe a life problem and get guidance rooted in the Bhagavad Gita, in one of three styles:

1. **Verse & Meaning**: the most relevant shlokas, explained, then applied to the person's situation.
2. **Arjuna's Parallel**: how Arjuna faced the same confusion and what Krishna told him (narrator voice).
3. **Direct Counsel**: a conversational reply shaped by the Gita, with no quotes.

## How it works (prompt v2)

Each message goes through two steps:

1. **Situation reader** (`src/lib/counsel.ts`, cheap model, JSON): picks 1–3 themes from the hand-built
   theme index, the matching "Arjuna moment", intensity, and whether the message is too vague to answer
   (then Sarathi asks 1–2 questions first, at most once per chat). If this step fails, a keyword fallback is used.
2. **Counsellor**: gets the whole Gita (cached) plus a shortlist of ~15 verses for those themes, with
   commentary excerpts from Shankara, Ramanuja, Sivananda and others, minus verses already cited.

`src/lib/themes.ts` holds the 40 themes and 17 Arjuna moments; `src/lib/prompts.ts` holds both prompts.

### Measuring quality

```bash
ALLOW_MODEL_OVERRIDE=1 npm run dev            # terminal 1 (needs OPENAI_API_KEY in .env.local)
EVAL_MODELS=gpt-5.4-mini,gpt-5.6-luna npm run eval   # terminal 2 → eval-report.html
```

The report shows distinct verses cited, % of replies citing chapter 1, banned-phrase count, and every reply side by side.

## How it worked in v1

- `src/data/corpus.ts`: all 701 verses as one-line English translations (~35k tokens). It goes into the system prompt,
  so the model can choose from the whole Gita (no vector DB needed). It sits at the start of the prompt, so OpenAI's
  automatic prompt caching makes repeat requests cheaper and faster.
- The model cites verses as `[[2.47]]`. The UI swaps each tag for a card with the **authentic** Sanskrit, IAST,
  translation and all commentaries from `public/verse/*.json` and `public/commentary/*.json`. The model never writes
  scripture text itself, and made-up verse IDs are dropped.
- Safety: a keyword screen (English/Hindi/Hinglish) flags crisis messages. The UI shows Tele-MANAS 14416, and the
  prompt switches to putting safety first.

| File | Purpose |
|---|---|
| `src/lib/prompts.ts` | System prompt + the 3 style instructions + crisis keywords. **Edit the product's voice here.** |
| `src/lib/styles.ts` | Style names/descriptions shown in the UI |
| `src/app/api/chat/route.ts` | Streaming OpenAI endpoint |
| `src/app/page.tsx` | Chat UI |
| `src/components/VerseCard.tsx` | Verse card with Hindi toggle + commentary picker |
| `scripts/build-data.mjs` | Rebuilds all data from the source repo |

## Run locally

```bash
npm install
cp .env.example .env.local   # add your OPENAI_API_KEY
npm run dev                  # http://localhost:3000
```

## Deploy (Vercel, ~5 min)

1. Push this repo to GitHub.
2. On vercel.com, choose **Add New → Project**, import the repo, and keep the defaults.
3. Under **Environment Variables**, add `OPENAI_API_KEY`.
4. Deploy. On a phone, open the URL and use **Add to Home Screen** to install it like an app.

## Rebuild the verse data

```bash
git clone --depth 1 https://github.com/vedicscriptures/bhagavad-gita ../bhagavad-gita
node scripts/build-data.mjs ../bhagavad-gita
```

The cleanup drops the 18 chapter colophons and ~1,400 "did not comment" placeholders, fixes the IAST avagraha
(`saṅgo.astv` → `saṅgo'stv`), strips verse-number prefixes and translator notes, restores the "qu" the source
lost in ~150 English words ("eanimity" → "equanimity"), and skips copy-error translations (e.g. 18.45).

## Content & licensing (before public launch)

Verse data comes from [vedicscriptures/bhagavad-gita](https://github.com/vedicscriptures/bhagavad-gita) (GPL-3.0).
Several bundled translations and commentaries (e.g. Prabhupada/BBT, Gambirananda/Advaita Ashrama, Chinmayananda,
Ramsukhdas/Gita Press, Sivananda/DLS) are copyrighted by their publishers. The MVP includes everything for a
private beta. Review permissions (and the GPL implications) before a public launch.

## Known limitations / next steps

- Chats are not saved (refreshing clears them). Next: local history, then accounts.
- Crisis detection is keyword-based. Next: add OpenAI's moderation endpoint (self-harm categories).
- No rate limiting yet. Add one (e.g. Vercel KV / Upstash) before sharing the link publicly.
