"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/useAuth";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { GoogleButton } from "@/components/Sidebar";
import { EXERCISES, type ExerciseKind } from "@/lib/exercises";

type Row = {
  id: string;
  kind: ExerciseKind;
  to_name: string | null;
  body: string | null;
  items: { inHands?: string[]; notInHands?: string[]; chosen?: string } | null;
  sealed: boolean;
  released: boolean;
  response: { reflection?: string; step?: string | null; verse?: string | null } | null;
  created_at: string;
};

/** Your letters and exercises: only you can see them; delete any of them at any time. */
export default function LettersPage() {
  const auth = useAuth();
  const profile = auth.profile;
  const [rows, setRows] = useState<Row[] | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<string | null>(null);

  const load = useCallback(async () => {
    const sb = getBrowserSupabase();
    if (!sb || !profile) return;
    const { data } = await sb
      .from("reflections")
      .select("id, kind, to_name, body, items, sealed, released, response, created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    setRows((data ?? []) as Row[]);
  }, [profile]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch on sign-in
    load();
  }, [load]);

  async function remove(id: string) {
    const sb = getBrowserSupabase();
    if (!sb) return;
    await sb.from("reflections").delete().eq("id", id);
    setRows((r) => (r ?? []).filter((x) => x.id !== id));
    setConfirm(null);
  }

  return (
    <main className="mx-auto min-h-dvh max-w-2xl px-4 py-6">
      <Link href="/" className="text-sm text-accent hover:underline">
        ← Back to Sarathi
      </Link>
      <h1 className="mt-4 font-serif text-3xl font-semibold">Your letters</h1>
      {auth.enabled && auth.ready && !profile && (
        <div className="mt-6 rounded-2xl border border-line bg-surface p-5">
          <p>Sign in to see the letters and exercises you&apos;ve kept.</p>
          <GoogleButton onClick={() => auth.signIn("/letters")} className="mt-4" />
        </div>
      )}
      {profile && (
        <>
          <p className="mt-2 text-muted">Only you can see these. Sealed letters are never read by Sarathi. Delete anything, any time.</p>
          {rows === null ? (
            <p className="mt-6 text-muted">Loading…</p>
          ) : rows.length === 0 ? (
            <p className="mt-6 rounded-2xl bg-surface-2 p-5 text-muted">Nothing here yet. Open 🪔 Calm &amp; Reflect to write your first letter.</p>
          ) : (
            <ul className="mt-6 grid gap-3">
              {rows.map((r) => {
                const open = openId === r.id;
                const title = r.kind === "feet" ? EXERCISES.feet.name : r.to_name ? `${EXERCISES[r.kind].name} · ${r.to_name}` : EXERCISES[r.kind].name;
                return (
                  <li key={r.id} className="rounded-2xl border border-line bg-surface">
                    <button onClick={() => setOpenId(open ? null : r.id)} className="flex w-full items-baseline justify-between gap-3 p-4 text-left" aria-expanded={open}>
                      <span className="font-serif text-lg font-semibold">{title}</span>
                      <span className="shrink-0 text-xs text-muted">
                        {r.sealed ? "Sealed · " : r.released ? "Released · " : ""}
                        {new Date(r.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                      </span>
                    </button>
                    {open && (
                      <div className="border-t border-line px-4 pt-3 pb-4">
                        {r.body && (
                          <div className="rounded-xl bg-[#f6ecd6] px-4 py-3 font-serif leading-relaxed whitespace-pre-wrap text-[#3a2a18]">{r.body}</div>
                        )}
                        {r.released && <p className="text-sm text-muted italic">The words were released into the fire. What Sarathi said remains.</p>}
                        {r.items && (
                          <div className="text-sm">
                            {!!r.items.notInHands?.length && <p className="text-muted">Offered: {r.items.notInHands.join(" · ")}</p>}
                            {r.items.chosen && <p className="mt-1">Chose to act on: {r.items.chosen}</p>}
                          </div>
                        )}
                        {r.response?.reflection && (
                          <div className="mt-3 space-y-2 leading-relaxed">
                            <div className="text-xs font-medium text-muted">Sarathi{r.response.verse ? ` · ${r.response.verse}` : ""}</div>
                            {r.response.reflection.split(/\n\s*\n/).map((p, i) => (
                              <p key={i}>{p}</p>
                            ))}
                            {r.response.step && <p className="rounded-xl bg-accent-soft px-3 py-2 text-sm">✦ {r.response.step}</p>}
                          </div>
                        )}
                        <div className="mt-4 text-right">
                          {confirm === r.id ? (
                            <span className="text-sm">
                              Delete for good?{" "}
                              <button onClick={() => remove(r.id)} className="ml-2 rounded-lg bg-[#b91c1c] px-3 py-1 font-medium text-white">
                                Delete
                              </button>
                              <button onClick={() => setConfirm(null)} className="ml-2 text-muted">
                                Cancel
                              </button>
                            </span>
                          ) : (
                            <button onClick={() => setConfirm(r.id)} className="text-sm text-muted hover:text-ink">
                              Delete
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </main>
  );
}
