import type { Metadata } from "next";
import LegalPage from "@/components/LegalPage";
import { CONTACT_EMAIL, OPERATOR, SITE } from "@/lib/site";

export const metadata: Metadata = { title: "Terms of use · Sarathi" };

// A plain-language draft. Have it reviewed by a lawyer before charging for anything.
export default function Terms() {
  return (
    <LegalPage title="Terms of use" updated="4 October 2026">
      <p>
        These terms apply to Sarathi ({SITE}), operated by {OPERATOR} (&ldquo;we&rdquo;). By using Sarathi you agree to them.
      </p>

      <h2>What Sarathi is, and is not</h2>
      <ul>
        <li>Sarathi offers reflections inspired by the Bhagavad Gita, written by an AI. It can be wrong; please use your own judgement.</li>
        <li>It is <strong>not</strong> medical, psychological, legal or financial advice, and not a substitute for a professional.</li>
        <li>It is not an emergency service. In a crisis in India, call Tele-MANAS on 14416 (free, 24x7) or 112.</li>
      </ul>

      <h2>Who can use it</h2>
      <p>You must be 18 or older. You are responsible for keeping your Google account secure.</p>

      <h2>Your content</h2>
      <ul>
        <li>What you write (messages, letters, notes) stays yours. You allow us to store and process it only to provide Sarathi to you, as described in the <a href="/privacy">privacy policy</a>.</li>
        <li>Please don&apos;t use Sarathi for anything unlawful, to harass anyone, or to try to break, overload or misuse the service.</li>
      </ul>

      <h2>Paid features</h2>
      <p>Sarathi is free today. If we offer paid features:</p>
      <ul>
        <li>Prices are shown in Indian rupees (or the currency shown) before you pay, including any applicable taxes.</li>
        <li>Payments are processed by Razorpay; we never see or store your card or UPI details.</li>
        <li>Subscriptions renew automatically until you cancel. You can cancel any time; access continues until the end of the period you paid for.</li>
        <li>Dakshina (an optional offering) is voluntary and is not a purchase of any service, blessing or ritual.</li>
        <li>Refunds follow our <a href="/refunds">refund policy</a>.</li>
      </ul>

      <h2>Our content</h2>
      <p>
        The Sanskrit text of the Bhagavad Gita and the acharyas&apos; Sanskrit commentaries are in the public domain. Sarathi&apos;s
        English and Hindi translation, its design and its written material belong to Sarathi; please don&apos;t copy them in bulk
        without permission. See <a href="/about-text">About the text</a>.
      </p>

      <h2>Changes and availability</h2>
      <p>
        We may change, pause or end features, or update these terms. If a change matters, we&apos;ll tell you in the app or by
        email. We try to keep Sarathi available but can&apos;t promise it will always be uninterrupted or error-free.
      </p>

      <h2>Limits of our responsibility</h2>
      <p>
        To the extent the law allows, Sarathi is provided &ldquo;as is&rdquo;, and we are not liable for decisions you make based on
        its reflections, or for indirect losses. Nothing here limits rights you have under Indian consumer law.
      </p>

      <h2>Ending your use</h2>
      <p>
        You can stop using Sarathi and delete your account at any time from the &ldquo;What Sarathi knows&rdquo; page. We may suspend
        accounts that misuse the service.
      </p>

      <h2>Law and grievances</h2>
      <p>
        These terms are governed by the laws of India. For any complaint or grievance, write to {OPERATOR} at{" "}
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. We acknowledge within 24 hours and aim to resolve within 15 days.
      </p>
    </LegalPage>
  );
}
