// src/app/ops/page.tsx

/**
 * Ops overview — server component.
 * Layer 3 security: independently verifies moderator status.
 * Four stat cards fetched in parallel via admin client.
 */

import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Overview' };

// ── Stat card component ───────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  className,
}: {
  label: string;
  value: number;
  sub?: string;
  className?: string;
}) {
  return (
    <div
      className={[
        'bg-canvas border border-stroke-faint rounded-lg p-5',
        className ?? '',
      ].join(' ')}
    >
      <p className='text-caption text-fg-muted uppercase tracking-label mb-2'>
        {label}
      </p>
      <p className='text-title font-medium text-fg leading-none mb-1'>
        {value.toLocaleString()}
      </p>
      {sub && <p className='text-body-xs text-fg-subtle'>{sub}</p>}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function OpsOverviewPage() {
  // Independent moderator check — never trusts layout alone
  const authClient = await createClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();
  if (!user) redirect('/');

  let admin;
  try {
    admin = createAdminClient();
  } catch (err) {
    console.error('[ops/page] createAdminClient failed:', err);
    redirect('/');
  }

  // Layer 3: page-level moderator check
  const { data: profile } = await admin
    .from('users')
    .select('is_moderator')
    .eq('id', user.id)
    .single();
  if (!profile?.is_moderator) redirect('/');

  // ── Fetch all stats in parallel ───────────────────────────────────────────
  const [
    usersCount,
    pendingAppsCount,
    publishedReportsCount,
    pendingReportsCount,
  ] = await Promise.all([
    admin.from('users').select('*', { count: 'exact', head: true }),
    admin
      .from('researcher_applications')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending'),
    admin
      .from('reports')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'published'),
    admin
      .from('reports')
      .select('*', { count: 'exact', head: true })
      .in('status', ['pending', 'under_review']),
  ]);

  return (
    <div className='p-6 md:p-8'>
      <div className='mb-6'>
        <h1 className='text-heading text-fg mb-1'>Overview</h1>
        <p className='text-body-sm text-fg-muted'>
          Platform snapshot — updates on page load.
        </p>
      </div>

      <div className='grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3'>
        <Link href='/ops/users' className='block'>
          <StatCard
            label='Registered users'
            value={usersCount.count ?? 0}
            className='hover:border-brand transition-colors duration-150 cursor-pointer h-full'
          />
        </Link>
        <Link href='/ops/applications' className='block'>
          <StatCard
            label='Pending applications'
            value={pendingAppsCount.count ?? 0}
            sub='Researcher API requests awaiting review'
            className='hover:border-brand transition-colors duration-150 cursor-pointer h-full'
          />
        </Link>
        <Link href='/reports' className='block'>
          <StatCard
            label='Published reports'
            value={publishedReportsCount.count ?? 0}
            sub='Verified scam reports available to the public'
            className='hover:border-brand transition-colors duration-150 cursor-pointer h-full'
          />
        </Link>
        {/* Clickable — links to moderation queue */}
        <Link href='/ops/reports' className='block'>
          <StatCard
            label='Reports pending moderation'
            value={pendingReportsCount.count ?? 0}
            sub='Triage failures queued for manual review'
            className='hover:border-brand transition-colors duration-150 cursor-pointer h-full'
          />
        </Link>
      </div>
    </div>
  );
}
