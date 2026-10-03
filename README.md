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

**Opening replies (v3.6):** for the first advising reply of a conversation the context says `OPENING: yes`. Sarathi then
opens by naming the feeling underneath the message, keeps to 150–250 words, ends with one practice and a warm
invitation to come back ("Tell me tonight how it went"), and asks at most one question per reply. It mirrors the
person's language and script (Hinglish stays in Roman letters). The home screen offers topic buttons (Work, Family,
A relationship, Loss, Self-doubt, A decision, Something else) that start the message for the person.

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
| `src/lib/memory.ts` | Memory checkpoints (writing notes) and loading them into replies |
| `supabase/schema.sql` | Database tables + security rules |

## Accounts, chat history and memory (v3)

- **Google sign-in** via Supabase. Guests get 3 free conversations (kept in their browser); on sign-in they move into the account.
- **Side panel** with every past conversation: open, continue, delete (deleting also forgets memory notes that came only from that chat).
- **Memory**: after the 2nd message of a conversation and every 4 after, a background call (`src/lib/memory.ts`)
  updates short notes about the person (situations, context, goals, patterns, what helped, preferences) and a
  one-line summary of the chat. New replies get those notes plus recent summaries in their context.
- **Controls**: first sign-in shows a consent + 18+ screen with a memory choice. `/memory` lists every note
  (forget one, forget all, memory on/off, delete account). `/privacy` is a draft privacy policy (review it!).
- Database: run `supabase/schema.sql` once in the Supabase SQL editor. Row-level security means each user can only read their own rows.
- Without the two `NEXT_PUBLIC_SUPABASE_*` variables the app still works, guest-only.
- **Usage limits** (server-side): 15 messages/day per guest IP, 60/day per signed-in user (`RATE_LIMIT_GUEST`, `RATE_LIMIT_USER`). Needs `supabase/002_rate_limit.sql` run once.

## Cosmic background

The whole app sits on a night sky (`src/components/CosmicBackground.tsx` + the "Cosmic backdrop" block in
`src/app/globals.css`): a saffron, gold and violet nebula that drifts over a few minutes, a faint Milky Way band,
and ~120–420 softly twinkling stars on one small canvas (about 20 frames a second, paused when the tab is hidden).
People who turn off motion on their device get a still sky. Colours live in the `:root` variables at the top of
`globals.css`; surfaces are slightly see-through so the sky shows behind cards and panels.

## Welcome galaxy

The first-visit welcome screen shows a spiral galaxy drawn live on a canvas (`src/components/GalaxyIntro.tsx`),
no image download. Its stars bloom out from a bright core over ~3 seconds ("creation"), then it keeps turning
slowly, inner stars faster than outer ones. About 7,000 stars on phones and 11,000 on larger screens, ~30 frames
a second, paused when the tab is hidden. With "reduced motion" on, the bloom is skipped but the slow turning stays.

## Morning check-in emails (v3.7)

When Sarathi gives a practice, it writes it as `[[practice]]…[[/practice]]` (shown as a "Today's practice" card). Signed-in
people are then offered: *"Would you like me to check in with you tomorrow morning?"* After a yes, every conversation with
a practice is scheduled automatically (with a "Not this time" link).

- `supabase/003_checkins.sql` (run once): `profiles.checkins_enabled`, the `checkins` table, and two functions only the
  server's secret key may call.
- Every morning Vercel calls `/api/cron/checkins` (`vercel.json`: 02:30 UTC = 8–9 am India). For each check-in due today it
  reads the conversation, has the AI write the "I remember…" lines in the person's language (`src/lib/checkinWriter.ts`),
  fills the email (`src/lib/email.ts`) and sends it with Resend. Up to 100 a day (Resend's free limit).
- Never sent for guests, crisis conversations, or people who haven't said yes. One email per conversation at most.
- The email's "It helped / Still hard / Not yet" buttons open that conversation and send the answer; the answer is saved.
- "Stop check-in emails" (and Gmail's own Unsubscribe button) turn them off; so does the switch on `/memory`.
- The owner (`ADMIN_EMAIL`) sees "Send me a test check-in now" on `/memory`.
- Needs `RESEND_API_KEY`, `SUPABASE_SECRET_KEY`, `CRON_SECRET` and `ADMIN_EMAIL` in Vercel (all Secrets).

## Calm practices (v3.8)

A **Calm** button (🪔) in the header opens short guided practices over the chat, so the background music keeps
playing. Each is anchored in a verse, shown at the start and the end (`src/lib/practices.ts`):

- **Steady Lamp** (6.19): breathe in 4, out 6, with a diya whose flame rises and settles. 2 or 5 minutes.
- **Bring It Back** (6.26): count ten out-breaths on a ring of beads; "My mind wandered" returns to one, gently.

`src/components/CalmPlayer.tsx` runs them: on-screen words, a soft singing-bowl chime made with Web Audio (no sound
file, can be switched off), a light vibration on phones, the screen kept awake, and a still version for reduced
motion. When someone is anxious or overwhelmed, Sarathi may offer one in its reply with `[[calm:steady-lamp]]` or
`[[calm:bring-back]]` (at most once per conversation, never in a crisis reply), shown as a tappable card. `/calm`
lists them too (`/calm?p=bring-back` opens one directly). Free for everyone.

## Background music

Put an MP3 at `public/audio/calm.mp3`. It loops quietly (30% volume, 2.5 s fade-in). Browsers only allow sound
after the visitor's first tap, click or keypress, so the music starts then. The speaker button in the header opens
**Mute** and a **volume slider**, and the choice is remembered on that device. If the file is missing, the button is hidden.

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
