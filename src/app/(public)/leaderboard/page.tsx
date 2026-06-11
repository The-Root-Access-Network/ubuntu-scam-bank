// src/app/(public)/leaderboard/page.tsx

/**
 * Leaderboard page showing top contributors globally, by country, and for the current month.
 *
 * Tab routing via searchParams:
 *   ?tab=global (default)  — all-time global leaderboard
 *   ?tab=monthly           — current month (or ?month=YYYY-MM for a specific month)
 *   ?tab={CC}              — any 2-character ISO country code
 *
 * Country filtering uses a full-world dropdown (CountrySelect) rather than a fixed
 * list of tabs, allowing any country to be selected.
 *
 * Month filtering uses MonthSelect, only shown when tab=monthly. Options run from
 * the launch month (2026-05) through the current month, descending.
 *
 * COUNTRY_TABS constant removed — country validation simplified to: any 2-char
 * string that isn't 'global' or 'monthly' is treated as a country code. Invalid
 * codes return an empty leaderboard (Supabase returns zero rows, empty state shown).
 */

import Link from 'next/link';
import Nav from '@/components/layout/Nav';
import Container from '@/components/layout/Container';
import Footer from '@/components/layout/Footer';
import CountrySelect from '@/components/leaderboard/CountrySelect';
import MonthSelect from '@/components/leaderboard/MonthSelect';
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

// ── Helpers ───────────────────────────────────────────────────────────────────

// Returns the current month as YYYY-MM string in UTC.
function currentMonthString(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
}

// Determines whether a tab value is a country code filter.
// Anything 2 chars that isn't a reserved keyword is treated as a country code.
function isCountryTab(tab: string): boolean {
  return tab.length === 2 && tab !== 'global' && tab !== 'monthly';
}

// ── Data fetching ─────────────────────────────────────────────────────────────

async function getData(activeTab: string, month: string | undefined) {
  const supabase = await createClient();

  if (activeTab === 'monthly') {
    // Resolve the month to query: use the provided month param, or current month.
    // Append '-01' to form a valid date string for the Postgres function.
    const resolvedMonth = month ?? currentMonthString();
    const targetMonth = `${resolvedMonth}-01`;

    const { data } = await supabase.rpc('get_monthly_leaderboard', {
      target_month: targetMonth,
    });
    return {
      entries: (data ?? []) as MonthlyEntry[],
      isMonthly: true,
      resolvedMonth,
    };
  }

  // Global or country-filtered query via leaderboard_users view.
  let query = supabase
    .from('leaderboard_users')
    .select('id, username, display_name, badge, country_code, points')
    .order('points', { ascending: false })
    .limit(50);

  if (isCountryTab(activeTab)) {
    query = query.eq('country_code', activeTab.toUpperCase());
  }

  const { data } = await query;
  return {
    entries: (data ?? []) as GlobalEntry[],
    isMonthly: false,
    resolvedMonth: undefined,
  };
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; month?: string }>;
}) {
  const { tab = 'global', month } = await searchParams;
  const { entries, isMonthly, resolvedMonth } = await getData(tab, month);

  // Resolved month for MonthSelect — current month when param is absent.
  const selectedMonth = resolvedMonth ?? currentMonthString();

  function tabHref(t: string) {
    return t === 'global' ? '/leaderboard' : `/leaderboard?tab=${t}`;
  }

  function tabClass(t: string) {
    const isActive = tab === t || (t === 'global' && tab === 'global');
    return [
      'text-body-xs px-3.5 py-1.5 rounded-md border transition-colors duration-150',
      isActive
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

          {/* Tab strip — Global and This month are fixed links.
              Country filtering is handled by CountrySelect dropdown.
              MonthSelect appears inline when monthly tab is active. */}
          <div className='flex flex-wrap items-center gap-2 mb-5'>
            <Link href={tabHref('global')} className={tabClass('global')}>
              Global
            </Link>
            <Link href={tabHref('monthly')} className={tabClass('monthly')}>
              This month
            </Link>

            <span className='flex items-center px-1 text-body-xs text-fg-subtle select-none'>
              ·
            </span>

            {/* Country dropdown — full world list, routes to ?tab={code} */}
            <CountrySelect currentTab={tab} />

            {/* Month picker — only shown when monthly tab is active */}
            {isMonthly && <MonthSelect selectedMonth={selectedMonth} />}
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
                    ? 'No contributions recorded for this period.'
                    : isCountryTab(tab)
                      ? 'No contributors from this country yet.'
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

          {/* Footer summary */}
          <p className='text-caption-sm text-fg-subtle text-center mt-4'>
            Showing {entries.length} contributor
            {entries.length !== 1 ? 's' : ''}
            {isMonthly
              ? ` · ${new Date(`${selectedMonth}-01`).toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' })}`
              : ' · all time'}
            {isCountryTab(tab) ? ` · ${tab.toUpperCase()}` : ''}
          </p>
        </Container>
      </main>

      <Footer />
    </div>
  );
}
