export type Style = "verse" | "arjuna" | "direct";

export const STYLES: Record<Style, { label: string; short: string; blurb: string }> = {
  verse: {
    label: "Verse & Meaning",
    short: "Verses",
    blurb: "Quotes the most relevant shlokas, explains them, then applies them to you.",
  },
  arjuna: {
    label: "Arjuna's Parallel",
    short: "Arjuna",
    blurb: "Shows how Arjuna faced the same confusion on the battlefield, and how Krishna guided him.",
  },
  direct: {
    label: "Direct Counsel",
    short: "Counsel",
    blurb: "A warm conversation shaped by the Gita's wisdom, without quoting chapter and verse.",
  },
};
