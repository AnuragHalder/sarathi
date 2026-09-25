"use client";

import Link from "next/link";
import { useState } from "react";
import { GoogleButton } from "./Sidebar";

function Shell({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center" role="dialog" aria-modal="true" aria-label={label}>
      <div className="w-full max-w-md rounded-3xl border border-line bg-surface p-6 shadow-xl">{children}</div>
    </div>
  );
}

/** Shown when a guest has used their free chats. */
export function SignInPrompt({ onSignIn, onClose }: { onSignIn: () => void; onClose: () => void }) {
  return (
    <Shell label="Sign in to continue">
      <h2 className="font-serif text-2xl font-semibold">Keep talking with Sarathi</h2>
      <p className="mt-2 text-muted">
        You&apos;ve used your free guest conversations. Sign in with Google (it&apos;s free) to keep going. Your
        conversations so far will be saved to your account, and Sarathi will start to remember what matters to you.
      </p>
      <GoogleButton onClick={onSignIn} className="mt-5 w-full" />
      <button onClick={onClose} className="mt-3 w-full text-sm text-muted hover:text-ink">
        Not now
      </button>
    </Shell>
  );
}

/** First sign-in: privacy notice, 18+ confirmation and the memory choice (DPDP-style consent). */
export function ConsentDialog({
  name,
  onAccept,
  onDecline,
}: {
  name: string | null;
  onAccept: (memory: boolean) => Promise<void> | void;
  onDecline: () => void;
}) {
  const [adult, setAdult] = useState(false);
  const [memory, setMemory] = useState(true);
  const [saving, setSaving] = useState(false);
  return (
    <Shell label="Before we begin">
      <h2 className="font-serif text-2xl font-semibold">Welcome{name ? `, ${name.split(" ")[0]}` : ""}</h2>
      <p className="mt-2 text-sm text-muted">Before we begin, here&apos;s what Sarathi keeps and why:</p>
      <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm">
        <li>Your name, email and photo from Google, to sign you in.</li>
        <li>Your conversations, so you can come back to them. You can delete any of them at any time.</li>
        <li>
          If memory is on: short notes about your situation (e.g. &ldquo;preparing for exams in November&rdquo;) so
          guidance gets more personal. You can view, delete or switch these off any time.
        </li>
        <li>Nothing is sold or used for ads. Messages are processed by OpenAI to write replies.</li>
      </ul>
      <label className="mt-4 flex items-start gap-3 text-sm">
        <input type="checkbox" checked={memory} onChange={(e) => setMemory(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[var(--accent)]" />
        <span>Let Sarathi remember what I share, to make guidance more personal</span>
      </label>
      <label className="mt-3 flex items-start gap-3 text-sm">
        <input type="checkbox" checked={adult} onChange={(e) => setAdult(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[var(--accent)]" />
        <span>
          I am 18 or older and I agree to the{" "}
          <Link href="/privacy" target="_blank" className="text-accent underline">
            privacy policy
          </Link>
        </span>
      </label>
      <button
        disabled={!adult || saving}
        onClick={async () => {
          setSaving(true);
          await onAccept(memory);
          setSaving(false);
        }}
        className="mt-5 w-full rounded-xl bg-accent px-4 py-3 font-medium text-white disabled:opacity-40 dark:text-[#1b120a]"
      >
        {saving ? "Saving…" : "Agree and continue"}
      </button>
      <button onClick={onDecline} className="mt-3 w-full text-sm text-muted hover:text-ink">
        Sign out instead
      </button>
    </Shell>
  );
}
