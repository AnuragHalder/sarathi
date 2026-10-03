/** Reflective exercises: letters and "Lay it at Krishna's feet". Shared by the app and the server. */

export type LetterKind = "unsent" | "forgiveness" | "younger" | "regret";
export type ExerciseKind = LetterKind | "feet";

export type Exercise = {
  kind: ExerciseKind;
  name: string;
  tagline: string;
  /** Placeholder for the "To" line (letters only). */
  toHint?: string;
  /** Fixed recipient (e.g. "My younger self"); otherwise the person types one. */
  fixedTo?: string;
  /** The opening line shown for a fixed recipient. */
  greeting?: string;
  /** Gentle sentence starters the person can tap. */
  starters: string[];
  /** Verses Sarathi may choose from when reflecting. */
  verses: string[];
};

export const EXERCISES: Record<ExerciseKind, Exercise> = {
  unsent: {
    kind: "unsent",
    name: "Unsent letter",
    tagline: "Write to someone you can't talk to. Say what was never said.",
    toHint: "Papa, Riya, my old boss…",
    starters: ["What I never got to say is…", "What I wish you knew…", "What I'm still carrying…", "I remember…"],
    verses: ["2.62", "2.63", "2.20", "2.27", "2.14", "6.5", "12.13"],
  },
  forgiveness: {
    kind: "forgiveness",
    name: "Forgiveness letter",
    tagline: "To someone you're ready to forgive, or to ask forgiveness from.",
    toHint: "The person this is for",
    starters: ["You hurt me when…", "I've been holding on to…", "I'm sorry that I…", "I'm ready to let go of…"],
    verses: ["16.3", "12.13", "12.14", "5.18", "6.32", "2.62", "2.63"],
  },
  younger: {
    kind: "younger",
    name: "Letter to your younger self",
    tagline: "Tell the person you were what you know now.",
    fixedTo: "My younger self",
    greeting: "Dear younger me,",
    starters: ["I wish you knew that…", "Don't be so hard on yourself about…", "The thing you were afraid of…", "You were braver than you thought when…"],
    verses: ["6.5", "2.14", "3.35", "4.36", "2.47", "6.40"],
  },
  regret: {
    kind: "regret",
    name: "Regret into lesson",
    tagline: "Write one regret. Find the lesson and one step to make it right.",
    fixedTo: "Myself",
    greeting: "A regret I carry",
    starters: ["I regret that I…", "What I would do differently…", "Who was hurt by it…", "What it taught me…"],
    verses: ["6.40", "4.36", "9.30", "9.31", "18.66", "6.5", "3.35"],
  },
  feet: {
    kind: "feet",
    name: "Lay it at Krishna's feet",
    tagline: "List your worries. Keep what's in your hands, offer the rest.",
    starters: [],
    verses: ["2.47", "18.66", "2.48", "3.30", "9.22", "12.6"],
  },
};

export const LETTER_KINDS: LetterKind[] = ["unsent", "forgiveness", "younger", "regret"];
export const EXERCISE_LIST: Exercise[] = [EXERCISES.unsent, EXERCISES.feet, EXERCISES.forgiveness, EXERCISES.younger, EXERCISES.regret];

export const isExerciseKind = (v: unknown): v is ExerciseKind => typeof v === "string" && v in EXERCISES;

/** What Sarathi sends back after reading. */
export type ReflectResult = {
  id?: string | null;
  crisis?: boolean;
  reflection: string;
  verse?: string | null;
  step?: string | null;
  /** Up to two short notes Sarathi asks permission to remember (signed-in people with memory on). */
  remember?: { type: "context" | "situation" | "pattern" | "goal" | "helped"; content: string }[];
};
