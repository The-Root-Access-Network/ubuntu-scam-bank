// src/app/(public)/leaderboard/page.tsx

/**
 * Leaderboard page showing top contributors globally, by country, and for the current month. Users can easily see how they rank against others and track their progress towards the next badge tier.
 *
 * Data is fetched server-side in one batch to avoid waterfalls and ensure fast load times. The page supports tabbed navigation between global, monthly, and country-specific leaderboards, with the active tab reflected in the URL for easy sharing.
 *
 * Each leaderboard entry displays the contributor's rank, avatar (with deterministic colors), name, badge, country, and points. The design is responsive, with certain details hidden on smaller screens to maintain readability.
 *
 * The page also includes a footer summarizing the current view, such as the number of contributors shown and the scope of the leaderboard (e.g. "Showing 50 contributors · Global · All time").
 */

import Link from 'next/link';
import Nav from '@/components/layout/Nav';
import Container from '@/components/layout/Container';
import { createClient } from '@/lib/supabase/server';
import { BADGE_META, getInitials } from '@/lib/utils';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Leaderboard' };

// ── Display constants ─────────────────────────────────────────────────────────

const AVATAR_PALETTE = [
  { bg: '#E1F5EE', fg: '#085041' },
  { bg: '#E6F1FB', fg: '#0C447C' },
  { bg: '#FAEEDA', fg: '#633806' },
  { bg: '#FAECE7', fg: '#712B13' },
  { bg: '#EEEDFE', fg: '#3C3489' },
  { bg: '#F1EFE8', fg: '#5F5E5A' },
];

function avatarStyle(username: string) {
  return AVATAR_PALETTE[username.charCodeAt(0) % AVATAR_PALETTE.length];
}

const RANK_COLOR: Record<number, string> = {
  1: '#BA7517',
  2: '#888780',
  3: '#993C1D',
};

// Fixed country tabs — primary target markets
const COUNTRY_TABS = [
  { code: 'NG', label: 'Nigeria' },
  { code: 'GB', label: 'UK' },
  { code: 'GH', label: 'Ghana' },
  { code: 'ZA', label: 'South Africa' },
  { code: 'US', label: 'USA' },
  { code: 'KE', label: 'Kenya' },
];

// ── Types ─────────────────────────────────────────────────────────────────────

type GlobalEntry = {
  id: string;
  username: string;
  display_name: string | null;
  badge: string;
  country_code: string | null;
  points: number;
};

type MonthlyEntry = {
  id: string;
  username: string;
  display_name: string | null;
  badge: string;
  country_code: string | null;
  monthly_points: number;
};

// ── Data fetching ─────────────────────────────────────────────────────────────

async function getData(activeTab: string) {
  const supabase = await createClient();

  if (activeTab === 'monthly') {
    const { data } = await supabase.rpc('get_monthly_leaderboard');
    return { entries: (data ?? []) as MonthlyEntry[], isMonthly: true };
  }

  const countryCode = COUNTRY_TABS.find((c) => c.code === activeTab)?.code;

  let query = supabase
    .from('leaderboard_users')
    .select('id, username, display_name, badge, country_code, points')
    .order('points', { ascending: false })
    .limit(50);

  if (countryCode) query = query.eq('country_code', countryCode);

  const { data } = await query;
  return { entries: (data ?? []) as GlobalEntry[], isMonthly: false };
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab = 'global' } = await searchParams;
  const { entries, isMonthly } = await getData(tab);

  const activeCountryTab = COUNTRY_TABS.find((c) => c.code === tab);

  // Build tab href helper
  function tabHref(t: string) {
    return t === 'global' ? '/leaderboard' : `/leaderboard?tab=${t}`;
  }

  function tabClass(t: string) {
    return [
      'text-body-xs px-3.5 py-1.5 rounded-md border transition-colors duration-150',
      tab === t || (t === 'global' && tab === 'global')
        ? 'bg-brand text-white border-brand'
        : 'bg-canvas border-stroke text-fg-muted hover:text-fg',
    ].join(' ');
  }

  return (
    <div className='min-h-dvh bg-canvas-subtle'>
      <Nav />

      <main>
        <Container className='py-6 md:py-8'>
          {/* Page header */}
          <div className='mb-5'>
            <h1 className='text-heading font-medium text-fg mb-1'>
              Leaderboard
            </h1>
            <p className='text-body-sm text-fg-muted'>
              Top contributors protecting communities across the world
            </p>
          </div>

          {/* Tab strip */}
          <div className='flex flex-wrap gap-1.5 mb-5'>
            <Link href={tabHref('global')} className={tabClass('global')}>
              Global
            </Link>
            <Link href={tabHref('monthly')} className={tabClass('monthly')}>
              This month
            </Link>

            <span className='flex items-center px-1 text-body-xs text-fg-subtle select-none'>
              ·
            </span>

            {COUNTRY_TABS.map((c) => (
              <Link
                key={c.code}
                href={tabHref(c.code)}
                className={tabClass(c.code)}
              >
                {c.label}
              </Link>
            ))}
          </div>

          {/* Table */}
          <div className='bg-canvas border border-stroke-faint rounded-lg overflow-hidden'>
            {/* Header row */}
            <div className='grid grid-cols-[36px_1fr_auto] md:grid-cols-[36px_1fr_80px_100px] gap-3 px-5 py-3 border-b border-stroke-faint bg-canvas-subtle'>
              <div className='text-caption-sm text-fg-muted uppercase tracking-label'>
                #
              </div>
              <div className='text-caption-sm text-fg-muted uppercase tracking-label'>
                Contributor
              </div>
              <div className='hidden md:block text-caption-sm text-fg-muted uppercase tracking-label text-right'>
                Country
              </div>
              <div className='text-caption-sm text-fg-muted uppercase tracking-label text-right'>
                {isMonthly ? 'Pts this month' : 'Total pts'}
              </div>
            </div>

            {entries.length === 0 ? (
              <div className='text-center py-14'>
                <p className='text-body-sm text-fg-muted'>
                  {tab === 'monthly'
                    ? 'No contributions recorded this month yet.'
                    : activeCountryTab
                      ? `No contributors from ${activeCountryTab.label} yet.`
                      : 'No contributors yet.'}
                </p>
              </div>
            ) : (
              entries.map((entry, i) => {
                const rank = i + 1;
                const av = avatarStyle(entry.username);
                const badge = BADGE_META[entry.badge] ?? BADGE_META.watcher;
                const name = entry.display_name ?? entry.username;
                const pts = isMonthly
                  ? Number((entry as MonthlyEntry).monthly_points)
                  : (entry as GlobalEntry).points;

                return (
                  <div
                    key={entry.id}
                    className={[
                      'grid grid-cols-[36px_1fr_auto] md:grid-cols-[36px_1fr_80px_100px] gap-3 px-5 py-3.5 items-center',
                      i < entries.length - 1
                        ? 'border-b border-stroke-faint'
                        : '',
                    ].join(' ')}
                  >
                    {/* Rank */}
                    <div
                      className='text-body font-medium text-center'
                      style={{ color: RANK_COLOR[rank] ?? 'var(--fg-muted)' }}
                    >
                      {rank}
                    </div>

                    {/* Name + badge */}
                    <div className='flex items-center gap-3 min-w-0'>
                      <div
                        className='w-8 h-8 rounded-full flex items-center justify-center text-caption shrink-0'
                        style={{ background: av.bg, color: av.fg }}
                      >
                        {getInitials(
                          entry.display_name ?? null,
                          entry.username,
                        )}
                      </div>
                      <div className='min-w-0'>
                        <p className='text-body-sm font-medium text-fg truncate'>
                          {name}
                        </p>
                        <span
                          className={`text-caption-sm font-medium px-2 py-0.5 rounded-full ${badge.classes}`}
                        >
                          {badge.label}
                        </span>
                      </div>
                    </div>

                    {/* Country — hidden on mobile */}
                    <div className='hidden md:block text-body-xs text-fg-muted text-right'>
                      {entry.country_code ?? '—'}
                    </div>

                    {/* Points */}
                    <div className='text-body-sm font-medium text-brand text-right'>
                      {pts.toLocaleString()}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <p className='text-caption-sm text-fg-subtle text-center mt-4'>
            Showing {entries.length} contributor
            {entries.length !== 1 ? 's' : ''}
            {isMonthly ? ' this month' : ' · all time'}
            {activeCountryTab ? ` · ${activeCountryTab.label}` : ''}
          </p>
        </Container>
      </main>
    </div>
  );
}
