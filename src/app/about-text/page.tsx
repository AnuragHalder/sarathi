import type { Metadata } from "next";
import LegalPage from "@/components/LegalPage";
import { CONTACT_EMAIL } from "@/lib/site";

export const metadata: Metadata = { title: "About the text · Sarathi" };

export default function AboutText() {
  return (
    <LegalPage title="About the text">
      <h2>The Sanskrit</h2>
      <p>
        The Sanskrit verses of the Bhagavad Gita (its 18 chapters; 701 verses in this edition) and their transliteration are ancient
        and in the public domain. Sarathi&apos;s copy comes from the open{" "}
        <a href="https://github.com/vedicscriptures/bhagavad-gita">vedicscriptures/bhagavad-gita</a> collection, with a
        few transliteration slips corrected.
      </p>

      <h2>The English and Hindi</h2>
      <p>
        The English and Hindi lines on every verse card are <strong>Sarathi&apos;s own rendering</strong>, written afresh from the
        Sanskrit in plain modern language, so that anyone can read the Gita without a dictionary. Translation always involves
        choices; where a verse can be read more than one way, we&apos;ve chosen the reading most widely shared by the
        traditional commentators. © 2026 Sarathi.
      </p>

      <h2>The commentaries</h2>
      <p>
        &ldquo;Read the acharyas&apos; commentaries&rdquo; shows the original Sanskrit commentaries of Shankaracharya, Ramanujacharya,
        Madhvacharya, Sridhara Swami, Madhusudana Saraswati and others. These works are centuries old and in the public
        domain. When Sarathi mentions what an acharya said, it is explaining these Sanskrit originals in its own words.
      </p>

      <h2>Sarathi&apos;s replies</h2>
      <p>
        Sarathi&apos;s guidance is written by an AI that draws on the verses and these commentaries. It aims to be faithful,
        but it can make mistakes. If you notice an error in a verse, a translation or an explanation, please write to{" "}
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
      </p>
    </LegalPage>
  );
}
