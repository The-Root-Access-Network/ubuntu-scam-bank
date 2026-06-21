// src/lib/ops/requireModerator.ts

/**
 * Shared moderator auth guard for /api/ops route handlers.
 * Every ops API route must call this before any action.
 *
 * Returns the verified user on success.
 * Returns a 401 or 403 Response on failure — caller should return it immediately.
 *
 * Usage:
 *   const result = await requireModerator();
 *   if (result instanceof Response) return result;
 *   const { user } = result;
 */

import { createClient, createAdminClient } from '@/lib/supabase/server';

type ModeratorCheckSuccess = { user: { id: string; email?: string } };

export async function requireModerator(): Promise<
  ModeratorCheckSuccess | Response
> {
  // ── 1. Session check ──────────────────────────────────────────────────────
  const authClient = await createClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  if (!user) {
    return Response.json(
      { success: false, error: 'Authentication required.' },
      { status: 401 },
    );
  }

  // ── 2. Moderator check ────────────────────────────────────────────────────
  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return Response.json(
      { success: false, error: 'Server configuration error.' },
      { status: 500 },
    );
  }

  const { data: profile } = await admin
    .from('users')
    .select('is_moderator')
    .eq('id', user.id)
    .single();

  if (!profile?.is_moderator) {
    return Response.json(
      { success: false, error: 'Forbidden.' },
      { status: 403 },
    );
  }

  return { user: { id: user.id, email: user.email } };
}
