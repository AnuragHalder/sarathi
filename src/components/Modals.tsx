"use client";

import Link from "next/link";
import { useState } from "react";
import { GoogleButton } from "./Sidebar";

function Shell({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center" role="dialog" aria-modal="true" aria-label={label}>
      <div className="w-full max-w-md rounded-3xl border border-line bg-surface p-6 shadow-xl backdrop-blur-md">{children}</div>
    </div>
  );
}

/** Shown when a guest has used their free chats. */
export function SignInPrompt({
  onSignIn,
  onClose,
  reason = "limit",
}: {
  onSignIn: () => void;
  onClose: () => void;
  reason?: "limit" | "checkin";
}) {
  return (
    <Shell label="Sign in to continue">
      <h2 className="font-serif text-2xl font-semibold">{reason === "checkin" ? "Continue your conversation" : "Keep talking with Sarathi"}</h2>
      {reason === "checkin" ? (
        <p className="mt-2 text-muted">
          Sign in with the same Google account you use for Sarathi, and your answer will be shared with Sarathi in that
          conversation. It stays private, only for you.
        </p>
      ) : (
        <p className="mt-2 text-muted">
          You&apos;ve used your free guest conversations. Sign in with Google (it&apos;s free) to keep going. Sarathi will
          remember you, so you never have to explain things twice. Only you can see your conversations and what Sarathi
          remembers, and you can delete anything.
        </p>
      )}
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
      <p className="mt-2 text-sm text-muted">
        Everything you share here is private, only for you. Here&apos;s what Sarathi keeps and why:
      </p>
      <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm">
        <li>Your name, email and photo from Google, to sign you in.</li>
        <li>Your conversations, so you can come back to them. You can delete any of them at any time.</li>
        <li>
          If memory is on: short notes about your situation (e.g. &ldquo;preparing for exams in November&rdquo;) so
          guidance gets more personal. You can view, delete or switch these off any time.
        </li>
        <li>
          Nothing is sold, used for ads, or used to train AI. Messages are processed by OpenAI only to write your replies.
        </li>
      </ul>
      <label className="mt-4 flex items-start gap-3 text-sm">
        <input type="checkbox" checked={memory} onChange={(e) => setMemory(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[var(--accent)]" />
        <span>Let Sarathi remember what matters, so it can help me better (I decide what it keeps)</span>
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
        className="mt-5 w-full rounded-xl bg-accent px-4 py-3 font-medium text-[#1b120a] disabled:opacity-40"
      >
        {saving ? "Saving…" : "Agree and continue"}
      </button>
      <button onClick={onDecline} className="mt-3 w-full text-sm text-muted hover:text-ink">
        Sign out instead
      </button>
    </Shell>
  );
}
