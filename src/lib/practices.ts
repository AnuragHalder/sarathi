/** Calm practices: short guided exercises, each anchored in one Gita verse. Free for everyone. */

export type PracticeId = "steady-lamp" | "bring-back";

export type Practice = {
  id: PracticeId;
  name: string;
  tagline: string;
  verseId: string;
  sanskrit: string;
  /** Sarathi's own short rendering of the verse (not a published translation). */
  meaning: string;
  intro: string;
  closing: string;
  /** Breath rhythm in seconds. A longer out-breath is what calms the body. */
  inhale: number;
  exhale: number;
  minutes: number[];
};

export const PRACTICES: Record<PracticeId, Practice> = {
  "steady-lamp": {
    id: "steady-lamp",
    name: "Steady Lamp",
    tagline: "Slow breathing with a glowing diya. For when you feel shaken.",
    verseId: "6.19",
    sanskrit: "यथा दीपो निवातस्थो नेङ्गते सोपमा स्मृता ।\nयोगिनो यतचित्तस्य युञ्जतो योगमात्मनः ॥",
    meaning: "As a lamp in a windless place does not flicker, so is the steady mind of one who turns within.",
    intro:
      "Sit comfortably and let your shoulders drop. Follow the flame: breathe in as it rises, breathe out slowly as it settles. The out-breath is a little longer; that is what tells the body it is safe.",
    closing: "The wind outside may still blow. For these few minutes, your flame was still, and you can return to it any time.",
    inhale: 4,
    exhale: 6,
    minutes: [2, 5],
  },
  "bring-back": {
    id: "bring-back",
    name: "Bring It Back",
    tagline: "Count ten breaths. When the mind wanders, return without scolding.",
    verseId: "6.26",
    sanskrit: "यतो यतो निश्चरति मनश्चञ्चलमस्थिरम् ।\nततस्ततो नियम्यैतदात्मन्येव वशं नयेत् ॥",
    meaning: "Wherever the restless, wavering mind wanders off, from there gently bring it back, and rest it in the Self.",
    intro:
      "Count each out-breath, one bead at a time, up to ten. The mind will wander; that is not failure. When you notice it has gone, tap \"My mind wandered\" and begin again at one. Every return is the practice.",
    closing: "Krishna does not ask for a mind that never wanders, only for the patience to bring it back. You just did that.",
    inhale: 4,
    exhale: 6,
    minutes: [3, 5],
  },
};

export const PRACTICE_LIST = Object.values(PRACTICES);

export const isPracticeId = (v: unknown): v is PracticeId => typeof v === "string" && v in PRACTICES;
