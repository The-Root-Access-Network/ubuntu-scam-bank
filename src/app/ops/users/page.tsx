// src/app/ops/users/page.tsx

import { redirect } from 'next/navigation';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import type { User } from '@supabase/supabase-js';
import UserSearch, { type UserRow } from '@/components/ops/UserSearch';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Users' };

export default async function OpsUsersPage() {
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

  // ── Fetch public.users and auth.users in parallel ─────────────────────────
  const [{ data: publicUsers }, { data: authData }] = await Promise.all([
    admin
      .from('users')
      .select(
        'id, username, display_name, badge, country_code, points, created_at, email, is_moderator',
      )
      .order('created_at', { ascending: false }),
    admin.auth.admin.listUsers({ perPage: 1000 }), // TODO: paginate if user count exceeds 1000
  ]);

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
          {users.length} registered account{users.length !== 1 ? 's' : ''}.
          Search filters client-side.
        </p>
      </div>

      <UserSearch users={users} />
    </div>
  );
}
