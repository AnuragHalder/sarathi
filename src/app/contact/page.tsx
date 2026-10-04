import type { Metadata } from "next";
import LegalPage from "@/components/LegalPage";
import { CONTACT_EMAIL, OPERATOR, SITE } from "@/lib/site";

export const metadata: Metadata = { title: "Contact · Sarathi" };

export default function Contact() {
  return (
    <LegalPage title="Contact us">
      <p>
        Sarathi ({SITE}) is run by <strong>{OPERATOR}</strong>.
      </p>
      <ul>
        <li>
          Email: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
        </li>
        <li>We usually reply within 2 working days. Complaints and grievances are acknowledged within 24 hours.</li>
        <li>For privacy requests (seeing or deleting your data), you can also use the &ldquo;What Sarathi knows&rdquo; page.</li>
        <li>Found a mistake in a verse or translation? We&apos;d be grateful to hear about it.</li>
      </ul>
      <p className="rounded-xl bg-surface-2 p-4 text-sm">
        If you are in crisis, please don&apos;t wait for an email. In India, call Tele-MANAS on{" "}
        <a href="tel:14416">14416</a> (free, 24x7) or emergency services on <a href="tel:112">112</a>.
      </p>
    </LegalPage>
  );
}
