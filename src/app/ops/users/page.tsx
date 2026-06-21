// src/app/ops/users/page.tsx

import { redirect } from 'next/navigation';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import type { User } from '@supabase/supabase-js';
import UserSearch, { type UserRow } from '@/components/ops/UserSearch';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Users' };

const PER_PAGE = 20;

export default async function OpsUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  // Independent moderator check
  const authClient = await createClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();
  if (!user) redirect('/');

  let admin;
  try {
    admin = createAdminClient();
  } catch (err) {
    console.error('[ops/users] createAdminClient failed:', err);
    redirect('/');
  }

  const { data: profile } = await admin
    .from('users')
    .select('is_moderator')
    .eq('id', user.id)
    .single();
  if (!profile?.is_moderator) redirect('/');

  // ── Pagination ────────────────────────────────────────────────────────────
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page ?? '1', 10));

  // ── Fetch public.users (paginated) and auth.users in parallel ─────────────
  const [{ data: publicUsers }, { data: authData }] = await Promise.all([
    admin
      .from('users')
      .select(
        'id, username, display_name, badge, country_code, points, created_at, email, is_moderator',
      )
      .order('created_at', { ascending: false })
      .range((page - 1) * PER_PAGE, page * PER_PAGE - 1),
    admin.auth.admin.listUsers({ page, perPage: PER_PAGE }),
  ]);

  // auth.admin.listUsers returns total count — use this for page calculation
  // so both counts stay in sync (auth is the source of truth for user existence)
  const total = authData && 'total' in authData ? (authData as { total: number }).total : 0;

  // Build a map of userId → banned_until from auth.users
  const banMap = new Map<string, string | null>();
  for (const authUser of (authData?.users ?? []) as User[]) {
    banMap.set(authUser.id, authUser.banned_until ?? null);
  }

  // Merge ban status into public user rows
  const users: UserRow[] = (publicUsers ?? []).map((u) => ({
    ...u,
    banned_until: banMap.get(u.id) ?? null,
  }));

  return (
    <div className='p-6 md:p-8'>
      <div className='mb-6'>
        <h1 className='text-heading text-fg mb-1'>Users</h1>
        <p className='text-body-sm text-fg-muted'>
          {total.toLocaleString()} registered account{total !== 1 ? 's' : ''}.
          Search filters within this page.
        </p>
      </div>

      <UserSearch users={users} total={total} page={page} perPage={PER_PAGE} />
    </div>
  );
}
