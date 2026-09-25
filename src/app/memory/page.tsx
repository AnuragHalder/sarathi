"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/useAuth";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { GoogleButton } from "@/components/Sidebar";

type Mem = { id: string; type: string; content: string; status: string; sensitive: boolean; updated_at: string };

const GROUPS: { type: string; label: string; hint: string }[] = [
  { type: "situation", label: "What you're going through", hint: "Ongoing situations Sarathi follows up on" },
  { type: "context", label: "About your life", hint: "Work, family, where you are in life" },
  { type: "goal", label: "What matters to you", hint: "Goals and values" },
  { type: "pattern", label: "Patterns", hint: "Tendencies that come up across conversations" },
  { type: "helped", label: "What has helped", hint: "Verses and practices that resonated" },
  { type: "preference", label: "How you like guidance", hint: "Language, length, style" },
];

export default function MemoryPage() {
  const auth = useAuth();
  const router = useRouter();
  const profile = auth.profile;
  const [mems, setMems] = useState<Mem[] | null>(null);
  const [confirmAll, setConfirmAll] = useState(false);
  const [confirmAccount, setConfirmAccount] = useState(false);
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    const sb = getBrowserSupabase();
    if (!sb || !profile) return;
    const { data } = await sb
      .from("memories")
      .select("id, type, content, status, sensitive, updated_at")
      .order("updated_at", { ascending: false });
    setMems((data ?? []) as Mem[]);
  }, [profile]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch on sign-in
    load();
  }, [load]);

  async function remove(id: string) {
    const sb = getBrowserSupabase();
    if (!sb) return;
    await sb.from("memories").delete().eq("id", id);
    setMems((m) => (m ?? []).filter((x) => x.id !== id));
  }

  async function removeAll() {
    const sb = getBrowserSupabase();
    if (!sb || !profile) return;
    await sb.from("memories").delete().eq("user_id", profile.id);
    setMems([]);
    setConfirmAll(false);
    setMsg("All memory notes deleted.");
  }

  async function deleteAccount() {
    const sb = getBrowserSupabase();
    if (!sb) return;
    const { error } = await sb.rpc("delete_my_account");
    if (error) {
      setMsg("Couldn't delete your account. Please try again.");
      return;
    }
    try {
      localStorage.clear();
    } catch {}
    await auth.signOut();
    router.push("/");
  }

  return (
    <main className="mx-auto min-h-dvh max-w-2xl px-4 py-6">
      <Link href="/" className="text-sm text-accent hover:underline">
        ← Back to Sarathi
      </Link>
      <h1 className="mt-4 font-serif text-3xl font-semibold">What Sarathi knows about you</h1>

      {!auth.enabled && <p className="mt-4 text-muted">Accounts aren&apos;t set up on this site yet.</p>}
      {auth.enabled && auth.ready && !profile && (
        <div className="mt-6 rounded-2xl border border-line bg-surface p-5">
          <p>Sign in to see and manage what Sarathi remembers.</p>
          <GoogleButton onClick={() => auth.signIn("/memory")} className="mt-4" />
        </div>
      )}

      {profile && (
        <>
          <p className="mt-2 text-muted">
            Sarathi keeps short notes from your conversations so its guidance can be more personal. Only you can see
            them. Delete anything you don&apos;t want remembered.
          </p>

          <section className="mt-6 flex items-center justify-between gap-4 rounded-2xl border border-line bg-surface p-4">
            <div>
              <div className="font-medium">Memory is {profile.memory_enabled ? "on" : "off"}</div>
              <div className="text-sm text-muted">
                {profile.memory_enabled
                  ? "New conversations add and use notes."
                  : "Nothing new is saved, and existing notes aren't used. Your conversations are still saved."}
              </div>
            </div>
            <button
              role="switch"
              aria-checked={profile.memory_enabled}
              onClick={() => auth.updateProfile({ memory_enabled: !profile.memory_enabled })}
              className={`relative h-7 w-12 shrink-0 rounded-full transition ${profile.memory_enabled ? "bg-accent" : "bg-line"}`}
            >
              <span className={`absolute top-1 h-5 w-5 rounded-full bg-white transition ${profile.memory_enabled ? "left-6" : "left-1"}`} />
              <span className="sr-only">Memory</span>
            </button>
          </section>

          {msg && <p className="mt-4 text-sm text-accent">{msg}</p>}

          {mems === null ? (
            <p className="mt-6 text-muted">Loading…</p>
          ) : mems.length === 0 ? (
            <p className="mt-6 rounded-2xl bg-surface-2 p-5 text-muted">
              Nothing yet. After a few messages in a conversation, Sarathi notes what matters and it will appear here.
            </p>
          ) : (
            GROUPS.map((g) => {
              const items = mems.filter((m) => m.type === g.type);
              if (!items.length) return null;
              return (
                <section key={g.type} className="mt-6">
                  <h2 className="font-serif text-lg font-semibold">{g.label}</h2>
                  <p className="text-xs text-muted">{g.hint}</p>
                  <ul className="mt-2 space-y-2">
                    {items.map((m) => (
                      <li key={m.id} className="flex items-start gap-3 rounded-xl border border-line bg-surface px-4 py-3">
                        <div className="min-w-0 flex-1">
                          <p className={m.status === "resolved" ? "text-muted line-through decoration-1" : ""}>{m.content}</p>
                          <p className="mt-0.5 text-xs text-muted">
                            {m.status === "resolved" ? "Resolved · " : ""}
                            {m.sensitive ? "Sensitive · " : ""}
                            {new Date(m.updated_at).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}
                          </p>
                        </div>
                        <button onClick={() => remove(m.id)} className="shrink-0 text-sm text-muted hover:text-danger-ink" aria-label={`Forget: ${m.content}`}>
                          Forget
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })
          )}

          <section className="mt-10 space-y-3 border-t border-line pt-6">
            {mems && mems.length > 0 &&
              (confirmAll ? (
                <div className="rounded-xl bg-danger-bg p-4 text-sm text-danger-ink">
                  Delete all {mems.length} notes? This can&apos;t be undone.
                  <div className="mt-2 flex gap-2">
                    <button onClick={removeAll} className="rounded-lg bg-danger-ink px-3 py-1.5 font-medium text-white">Delete all</button>
                    <button onClick={() => setConfirmAll(false)} className="rounded-lg border border-current px-3 py-1.5">Cancel</button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setConfirmAll(true)} className="text-sm text-danger-ink hover:underline">
                  Delete all memory notes
                </button>
              ))}
            <div>
              {confirmAccount ? (
                <div className="rounded-xl bg-danger-bg p-4 text-sm text-danger-ink">
                  Delete your account, all conversations and all memory notes permanently?
                  <div className="mt-2 flex gap-2">
                    <button onClick={deleteAccount} className="rounded-lg bg-danger-ink px-3 py-1.5 font-medium text-white">Delete my account</button>
                    <button onClick={() => setConfirmAccount(false)} className="rounded-lg border border-current px-3 py-1.5">Cancel</button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setConfirmAccount(true)} className="text-sm text-danger-ink hover:underline">
                  Delete my account
                </button>
              )}
            </div>
            <p className="text-xs text-muted">
              Signed in as {profile.email}.{" "}
              <button onClick={async () => { await auth.signOut(); router.push("/"); }} className="underline">
                Sign out
              </button>{" "}
              · <Link href="/privacy" className="underline">Privacy policy</Link>
            </p>
          </section>
        </>
      )}
    </main>
  );
}
