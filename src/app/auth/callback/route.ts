// src/app/auth/callback/route.ts

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';

// Handles the OAuth redirect from Google (and the magic link redirect for
// email sign-ups). Exchanges the one-time code for a Supabase session,
// then redirects back to the homepage.
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

    await supabase.auth.exchangeCodeForSession(code);
  }

  // Always redirect home — errors surface as "not signed in" state,
  // which is safer than showing a raw error page to a non-technical user.
  return NextResponse.redirect(`${origin}/`);
}
