// middleware.ts

import { updateSession } from '@/lib/supabase/middleware';
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

// Paths that require authentication at the middleware layer.
// The ops layout and each page do independent server-side moderator checks —
// middleware is the first layer, not the only one.
const OPS_PATHS = ['/ops', '/api/ops'];

function isOpsPath(pathname: string): boolean {
  return OPS_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── Ops path guard ────────────────────────────────────────────────────────
  // For /ops and /api/ops routes, check authentication before anything else.
  // Unauthenticated requests are redirected to / immediately.
  // Moderator check is deferred to layout/page — middleware only checks auth.
  if (isOpsPath(pathname)) {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll() {
            // Read-only check — no need to set cookies here
          },
        },
      },
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  // ── Session refresh for all other routes ──────────────────────────────────
  return await updateSession(request);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
