import "server-only";
import type { CheckinWords } from "./checkinWriter";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

type EmailInput = {
  words: CheckinWords;
  practice: string;
  verse: { id: string; sanskrit: string; translation: string } | null;
  links: { helped: string; hard: string; notYet: string; cont: string; stop: string; privacy: string };
};

/**
 * The check-in email: a starry Sarathi header, a warm cream letter, the practice, the verse, three one-tap answers.
 * Built with tables and inline styles so it looks right in Gmail, Outlook and phone mail apps.
 */
export function renderCheckinEmail({ words: w, practice, verse, links }: EmailInput) {
  const sanskritLine = verse ? verse.sanskrit.split("\n")[0].replace(/[।॥|]+\s*$/, "").trim() : "";
  const btn = (href: string, label: string) =>
    `<td align="center" style="padding:0 4px;"><a href="${esc(href)}" style="display:block;padding:11px 6px;border:1px solid #e5d7bd;border-radius:12px;background:#ffffff;color:#5a4632;font-weight:600;font-size:14px;text-decoration:none;font-family:Arial,Helvetica,sans-serif;">${esc(label)}</a></td>`;

  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light"><title>${esc(w.subject)}</title></head>
<body style="margin:0;padding:0;background:#efe9df;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(w.preview)}&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#efe9df;padding:24px 12px;">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#fffdf8;border-radius:18px;overflow:hidden;font-family:Georgia,'Times New Roman',serif;color:#2b2118;">
  <tr><td align="center" bgcolor="#160f2a" style="background:#160f2a;background-image:radial-gradient(120% 140% at 20% 0%,#3b2340 0%,#160f2a 45%,#0a0716 100%);padding:26px 20px 22px;">
    <div style="color:#d9b45a;font-size:12px;letter-spacing:6px;">&#10022; &middot; &#10022; &middot; &#10022;</div>
    <div style="color:#f6e7c1;font-size:26px;letter-spacing:1px;margin-top:6px;">Sarathi</div>
    <div style="color:#d9b45a;font-family:Arial,Helvetica,sans-serif;font-size:10px;letter-spacing:3px;text-transform:uppercase;margin-top:4px;">Your charioteer</div>
  </td></tr>
  <tr><td style="padding:26px 26px 6px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.6;">
    <p style="margin:0 0 14px;">${esc(w.greeting)}</p>
    <p style="margin:0 0 18px;">${esc(w.recall)}</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="background:#fbf3e2;border-left:3px solid #d9a441;border-radius:0 12px 12px 0;padding:12px 14px;font-size:15px;line-height:1.55;">
      <div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#9a7428;font-weight:bold;margin-bottom:4px;">${esc(w.practiceLabel)}</div>
      ${esc(practice)}
    </td></tr></table>
    ${
      verse
        ? `<div style="text-align:center;margin:22px 0 4px;">
      <div style="font-family:'Noto Serif Devanagari','Mangal','Nirmala UI',serif;color:#9a5b12;font-size:18px;">${esc(sanskritLine)}</div>
      <div style="font-style:italic;color:#6f6252;font-size:14px;margin-top:4px;">${esc(verse.translation.split(/(?<=[.!?])\s/)[0])} (${esc(verse.id)})</div>
    </div>`
        : ""
    }
    <p style="font-family:Georgia,'Times New Roman',serif;font-size:20px;text-align:center;margin:24px 0 12px;">${esc(w.question)}</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
      ${btn(links.helped, w.helped)}${btn(links.hard, w.hard)}${btn(links.notYet, w.notYet)}
    </tr></table>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:10px;"><tr><td align="center" style="padding:0 4px;">
      <a href="${esc(links.cont)}" style="display:block;padding:13px 6px;border-radius:12px;background:#c2410c;color:#ffffff;font-weight:bold;font-size:15px;text-decoration:none;">${esc(w.cont)}</a>
    </td></tr></table>
    <p style="margin:24px 0 8px;color:#6f6252;font-size:15px;">${esc(w.signoff)}<br>Sarathi</p>
  </td></tr>
  <tr><td style="border-top:1px solid #efe4cf;padding:14px 26px 22px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.55;color:#8b7d6a;">
    You're receiving this because you asked Sarathi to check in with you. Your conversations stay private: we never put what you shared in a subject line. Replies to this email aren't read; tap the buttons above to talk to Sarathi.
    <a href="${esc(links.stop)}" style="color:#8b5a14;">Stop check-in emails</a> &middot; <a href="${esc(links.privacy)}" style="color:#8b5a14;">Privacy</a><br>
    Sarathi offers reflections, not professional advice. If you are struggling right now, call Tele-MANAS on 14416 (free, 24x7).
  </td></tr>
</table>
</td></tr></table>
</body></html>`;

  const text = [
    w.greeting,
    "",
    w.recall,
    "",
    `${w.practiceLabel}: ${practice}`,
    verse ? `\n${sanskritLine}\n${verse.translation.split(/(?<=[.!?])\s/)[0]} (${verse.id})` : "",
    "",
    w.question,
    `${w.helped}: ${links.helped}`,
    `${w.hard}: ${links.hard}`,
    `${w.notYet}: ${links.notYet}`,
    `${w.cont}: ${links.cont}`,
    "",
    w.signoff,
    "Sarathi",
    "",
    `Stop check-in emails: ${links.stop}`,
    "Sarathi offers reflections, not professional advice. In crisis, call Tele-MANAS 14416 (free, 24x7).",
  ].join("\n");

  return { html, text };
}

/** Sends one email through Resend's API. Returns the Resend id, or throws with the reason. */
export async function sendEmail(opts: { to: string; subject: string; html: string; text: string; unsubscribe: string }) {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY is not set");
  const from = process.env.CHECKIN_FROM || "Sarathi <sarathi@asksarathi.in>";
  const res = await fetch(process.env.RESEND_API_URL || "https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to: [opts.to],
      subject: opts.subject,
      html: opts.html,
      text: opts.text,
      headers: {
        // Lets Gmail and others show their own one-click "Unsubscribe" button.
        "List-Unsubscribe": `<${opts.unsubscribe}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
    }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Resend ${res.status}: ${body?.message || body?.name || "send failed"}`);
  return (body?.id as string) || "";
}
