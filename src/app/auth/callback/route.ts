import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";

/** Google → Supabase → here. Exchanges the one-time code for a session cookie, then returns home. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next");
  const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
  const supabase = await getServerSupabase();
  if (code && supabase) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(safeNext, url.origin));
    console.error("Auth callback error:", error.message);
  }
  return NextResponse.redirect(new URL("/?auth_error=1", url.origin));
}
