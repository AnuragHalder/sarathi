import { getAdminSupabase } from "@/lib/supabase/admin";
import { APP_URL, verifyUser } from "@/lib/checkins";

export const runtime = "nodejs";

/** Turns check-in emails off for one person. The link carries a signature, so it only works for them. */
async function stop(req: Request) {
  const url = new URL(req.url);
  const u = url.searchParams.get("u") ?? "";
  const s = url.searchParams.get("s") ?? "";
  if (!/^[0-9a-f-]{36}$/i.test(u) || !verifyUser(u, s)) return false;
  const admin = getAdminSupabase();
  if (!admin) return false;
  await admin.from("profiles").update({ checkins_enabled: false }).eq("id", u);
  await admin.from("checkins").update({ status: "cancelled", note: "unsubscribed" }).eq("user_id", u).eq("status", "scheduled");
  return true;
}

const page = (ok: boolean) =>
  new Response(
    `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Sarathi</title></head>
<body style="margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#0a0716;color:#f4ead9;font-family:Arial,Helvetica,sans-serif;text-align:center;padding:24px">
<div style="max-width:420px"><div style="font-family:Georgia,serif;font-size:30px;color:#f6e7c1">Sarathi</div>
<p style="font-size:17px;line-height:1.6;margin-top:18px">${ok ? "Done. Sarathi won't send you check-in emails any more." : "This link didn't work. You can switch check-ins off on the \"What Sarathi knows\" page instead."}</p>
<p style="color:#b9aa92;font-size:14px;line-height:1.6">${ok ? "You can turn them back on any time on the \"What Sarathi knows\" page." : ""}</p>
<a href="${APP_URL}" style="display:inline-block;margin-top:14px;background:#fb923c;color:#1b120a;padding:12px 22px;border-radius:14px;text-decoration:none;font-weight:bold">Open Sarathi</a></div></body></html>`,
    { status: ok ? 200 : 400, headers: { "Content-Type": "text/html; charset=utf-8" } },
  );

export async function GET(req: Request) {
  return page(await stop(req));
}

/** One-click unsubscribe from the mail app's own button (RFC 8058). */
export async function POST(req: Request) {
  const ok = await stop(req);
  return new Response(null, { status: ok ? 200 : 400 });
}
