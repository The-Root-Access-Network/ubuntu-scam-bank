// src/app/auth/callback/route.ts

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';
import { addToDigestAudience } from '@/lib/email/audience';

// Handles the OAuth redirect from Google (and the magic link redirect for
// email sign-ups). Exchanges the one-time code for a Supabase session,
// then redirects back to the homepage.
//
// After a successful exchange, adds the user to the Resend digest audience.
// This is fire-and-forget — audience sync failure never blocks the redirect.
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const origin = url.origin;

  if (code) {
    const cookieStore = await cookies();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          },
        },
      },
    );

    const { data } = await supabase.auth.exchangeCodeForSession(code);

    // Add to digest audience — non-fatal, fire and forget.
    // Runs after session is established so user.email is available.
    // Resend handles duplicate contacts gracefully (updates, not duplicates).
    if (data?.user?.email) {
      const firstName =
        data.user.user_metadata?.full_name?.split(' ')[0] ??
        data.user.user_metadata?.name?.split(' ')[0] ??
        data.user.email.split('@')[0];

      addToDigestAudience(data.user.email, firstName).catch((err) =>
        console.error('[callback] audience sync error:', err),
      );
    }
  }

  // Always redirect home — errors surface as "not signed in" state,
  // which is safer than showing a raw error page to a non-technical user.
  return NextResponse.redirect(`${origin}/`);
}
