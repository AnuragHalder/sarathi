import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";

// Self-hosted (variable) fonts: no build-time network calls, and they work offline in the PWA.
const inter = localFont({ src: "../fonts/inter-latin-wght-normal.woff2", variable: "--font-inter", weight: "100 900" });
const fraunces = localFont({ src: "../fonts/fraunces-latin-wght-normal.woff2", variable: "--font-fraunces", weight: "100 900" });
const deva = localFont({
  src: "../fonts/noto-serif-devanagari-devanagari-wght-normal.woff2",
  variable: "--font-deva",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "Sarathi: Gita Counsel",
  description: "Guidance for life's battles, from the Bhagavad Gita.",
  appleWebApp: { capable: true, title: "Sarathi", statusBarStyle: "default" },
  // Google Search Console ownership check: set GOOGLE_SITE_VERIFICATION in Vercel to the code from the meta tag.
  ...(process.env.GOOGLE_SITE_VERIFICATION ? { verification: { google: process.env.GOOGLE_SITE_VERIFICATION } } : {}),
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fbf6ec" },
    { media: "(prefers-color-scheme: dark)", color: "#17120d" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} ${fraunces.variable} ${deva.variable} h-full antialiased`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
