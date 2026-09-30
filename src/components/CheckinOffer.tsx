"use client";

import { useState } from "react";

type Props = {
  conversationId: string;
  /** The person already said yes to check-ins (then this conversation is scheduled automatically). */
  enabled: boolean;
  /** Called after they turn check-ins on, so the profile reloads. */
  onEnabled: () => void;
};

async function post(action: string, conversationId: string) {
  const res = await fetch("/api/checkins", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, conversationId }),
  });
  return res.ok ? ((await res.json()) as { scheduled?: boolean }) : null;
}

/** Shown under a reply that ends with a practice: the offer of a next-morning check-in email. */
export default function CheckinOffer({ conversationId, enabled, onEnabled }: Props) {
  const [state, setState] = useState<"idle" | "busy" | "yes" | "no" | "skipped" | "error">("idle");

  if (state === "no") return null;

  if (state === "yes" || (enabled && state === "idle")) {
    return (
      <p className="mt-3 flex flex-wrap items-center gap-x-2 text-sm text-muted">
        <span aria-hidden="true">☀</span>
        <span>I&apos;ll check in with you tomorrow morning.</span>
        {enabled && state === "idle" && (
          <button
            className="underline underline-offset-4 hover:text-ink"
            onClick={async () => {
              setState("busy");
              setState((await post("cancel", conversationId)) ? "skipped" : "error");
            }}
          >
            Not this time
          </button>
        )}
      </p>
    );
  }
  if (state === "skipped") return <p className="mt-3 text-sm text-muted">Okay, no check-in for this one.</p>;
  if (state === "error") return <p className="mt-3 text-sm text-muted">That didn&apos;t work. Please try again later.</p>;
  if (enabled) return null;

  return (
    <div className="mt-4 rounded-2xl border border-line bg-surface p-4">
      <p className="font-serif text-lg leading-snug">Would you like me to check in with you tomorrow morning?</p>
      <p className="mt-1 text-sm text-muted">One short email around 8 am about this practice. You can stop any time.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          disabled={state === "busy"}
          className="rounded-xl bg-accent px-4 py-2 text-sm font-medium text-[#1b120a] disabled:opacity-50"
          onClick={async () => {
            setState("busy");
            const r = await post("enable", conversationId);
            if (!r) return setState("error");
            setState("yes");
            onEnabled();
          }}
        >
          Yes, check in
        </button>
        <button
          disabled={state === "busy"}
          className="rounded-xl border border-line px-4 py-2 text-sm text-muted hover:text-ink disabled:opacity-50"
          onClick={async () => {
            setState("no");
            await post("decline", conversationId);
          }}
        >
          No thanks
        </button>
      </div>
    </div>
  );
}
