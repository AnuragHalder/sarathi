import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { AUTH_ENABLED, SUPABASE_KEY, SUPABASE_URL } from "@/lib/supabase/config";

/** Keeps the Supabase login session fresh on every page/API request. */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  if (!AUTH_ENABLED) return response;

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        Object.entries(headers ?? {}).forEach(([k, v]) => response.headers.set(k, v));
      },
    },
  });
  // Refreshes the token if needed. Do not remove.
  await supabase.auth.getClaims();
  return response;
}

export const config = {
  matcher: [
    // Skip static files, verse/commentary JSON, audio and images.
    "/((?!_next/static|_next/image|favicon.ico|verse/|commentary/|audio/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|mp3|json|woff2)$).*)",
  ],
};
