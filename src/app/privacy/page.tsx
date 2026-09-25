import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Privacy policy · Sarathi" };

// DRAFT: have this reviewed (ideally by a lawyer familiar with India's DPDP Act) and fill in the
// contact details before publishing the app to everyone.
const CONTACT_EMAIL = "privacy@example.com"; // TODO: replace with your real contact email
const UPDATED = "25 September 2026";

export default function Privacy() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-8 leading-relaxed">
      <Link href="/" className="text-sm text-accent hover:underline">
        ← Back to Sarathi
      </Link>
      <h1 className="mt-4 font-serif text-3xl font-semibold">Privacy policy</h1>
      <p className="text-sm text-muted">Last updated {UPDATED}</p>

      <div className="mt-6 space-y-5 [&_h2]:font-serif [&_h2]:text-xl [&_h2]:font-semibold [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5">
        <p>
          Sarathi is a reflective companion that offers guidance inspired by the Bhagavad Gita. It is not a medical,
          psychological or legal service. This policy explains what we collect, why, and the choices you have.
        </p>

        <h2>What we collect</h2>
        <ul>
          <li><strong>Google account basics</strong> when you sign in: name, email address and profile photo.</li>
          <li><strong>Your conversations</strong>: the messages you send and Sarathi&apos;s replies.</li>
          <li><strong>Memory notes</strong> (only if memory is on): short notes drawn from your conversations, such as an ongoing situation or what has helped you.</li>
          <li><strong>Settings</strong>: your preferred guidance style, memory on/off, and your consent record.</li>
          <li>If you use Sarathi without signing in, your conversations stay in your browser and are not stored on our servers.</li>
        </ul>

        <h2>Why we use it</h2>
        <ul>
          <li>To sign you in and let you return to past conversations.</li>
          <li>To make guidance more relevant to you over time (memory).</li>
          <li>To keep the service safe and working, for example preventing abuse.</li>
        </ul>
        <p>We do not sell your data, and we do not use it for advertising.</p>

        <h2>Who processes it</h2>
        <ul>
          <li><strong>Supabase</strong> stores accounts, conversations and memory notes.</li>
          <li><strong>OpenAI</strong> processes messages to write replies and memory notes. Data sent through OpenAI&apos;s API is not used to train their models by default.</li>
          <li><strong>Vercel</strong> hosts the app.</li>
        </ul>

        <h2>Your choices and rights</h2>
        <ul>
          <li>View, edit or delete any memory note, or switch memory off, on the <Link href="/memory" className="text-accent underline">What Sarathi knows</Link> page.</li>
          <li>Delete any conversation from the side panel.</li>
          <li>Delete your account and all your data at any time from the same page. This is permanent.</li>
          <li>Withdraw consent at any time by switching memory off or deleting your account.</li>
          <li>Contact us about your data at <a href={`mailto:${CONTACT_EMAIL}`} className="text-accent underline">{CONTACT_EMAIL}</a>.</li>
        </ul>

        <h2>Retention</h2>
        <p>
          We keep your data while your account is active. Accounts inactive for one year may be deleted after
          advance notice. When you delete your account, your conversations and memory notes are removed.
        </p>

        <h2>Age</h2>
        <p>Sarathi is for people aged 18 and over.</p>

        <h2>If you are in crisis</h2>
        <p>
          Sarathi cannot help in an emergency. In India, call Tele-MANAS on <a href="tel:14416" className="text-accent underline">14416</a> (free,
          24x7) or emergency services on <a href="tel:112" className="text-accent underline">112</a>.
        </p>
      </div>
    </main>
  );
}
