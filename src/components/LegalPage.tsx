import Link from "next/link";
import type { ReactNode } from "react";

/** Shared layout for Terms, Refunds, Contact, Privacy and About the text. */
export default function LegalPage({ title, updated, children }: { title: string; updated?: string; children: ReactNode }) {
  return (
    <main className="mx-auto max-w-2xl px-4 py-8 leading-relaxed">
      <Link href="/" className="text-sm text-accent hover:underline">
        ← Back to Sarathi
      </Link>
      <h1 className="mt-4 font-serif text-3xl font-semibold">{title}</h1>
      {updated && <p className="text-sm text-muted">Last updated {updated}</p>}
      <div className="mt-6 space-y-5 [&_a]:text-accent [&_a]:underline [&_h2]:font-serif [&_h2]:text-xl [&_h2]:font-semibold [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5">
        {children}
      </div>
      <nav className="mt-10 flex flex-wrap gap-x-4 gap-y-1 border-t border-line pt-4 text-sm text-muted" aria-label="Policies">
        <Link href="/privacy" className="hover:text-ink">Privacy</Link>
        <Link href="/terms" className="hover:text-ink">Terms</Link>
        <Link href="/refunds" className="hover:text-ink">Refunds</Link>
        <Link href="/contact" className="hover:text-ink">Contact</Link>
        <Link href="/about-text" className="hover:text-ink">About the text</Link>
      </nav>
    </main>
  );
}
