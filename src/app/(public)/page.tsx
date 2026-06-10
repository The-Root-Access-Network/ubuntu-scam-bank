// src/app/(public)/page.tsx

import { IconUpload } from '@tabler/icons-react';
import Nav from '@/components/layout/Nav';
import Container from '@/components/layout/Container';
import SubmissionForm from '@/components/forms/SubmissionForm';
import FeedSection from '@/components/feed/FeedSection';
import Sidebar from '@/components/layout/Sidebar';
import { createClient } from '@/lib/supabase/server';

// All page data fetched in one parallel request set.
// Components receive pre-fetched props — no waterfall, no client fetching.
async function getPageData() {
  const supabase = await createClient();

  // Auth check for shield score
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [
    reportsCount,
    usersCount,
    countryResult,
    feedResult,
    leaderboardResult,
    profileResult,
  ] = await Promise.all([
    supabase
      .from('reports')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'published'),
    supabase
      .from('leaderboard_users')
      .select('*', { count: 'exact', head: true }),
    supabase
      .from('reports')
      .select('country_code')
      .eq('status', 'published')
      .not('country_code', 'is', null),
    supabase
      .from('reports')
      .select(
        'id, type, severity, country_code, summary, confirm_count, view_count, submitted_at',
      )
      .eq('status', 'published')
      .order('submitted_at', { ascending: false })
      .limit(20),
    supabase
      .from('leaderboard_users')
      .select('id, username, display_name, points, badge, country_code')
      .order('points', { ascending: false })
      .limit(5),
    // Only fetch profile if signed in
    user
      ? supabase
          .from('users')
          .select('username, display_name, points, badge')
          .eq('id', user.id)
          .single()
      : Promise.resolve({ data: null }),
  ]);

  const uniqueCountries = new Set(
    countryResult.data?.map((r) => r.country_code) ?? [],
  ).size;

  return {
    stats: {
      reports: reportsCount.count ?? 0,
      users: usersCount.count ?? 0,
      countries: uniqueCountries,
    },
    feedReports: feedResult.data ?? [],
    topUsers: leaderboardResult.data ?? [],
    currentUser: profileResult.data ?? null,
  };
}

export default async function HomePage() {
  const { stats, feedReports, topUsers, currentUser } = await getPageData();

  return (
    <div className='min-h-dvh bg-canvas-subtle'>
      <Nav />

      {/* ── Hero ───────────────────────────────────────────────────────── */}
      <section className='bg-canvas-subtle border-b border-stroke-faint'>
        <Container className='pt-12 md:pt-16 lg:pt-20 pb-10 md:pb-14 text-center'>
          <h1 className='text-display tracking-display text-fg mb-4'>
            Seen a scam? Report it. Protect someone.
          </h1>

          <p className='text-body-lg font-medium text-fg-muted max-w-[90%] md:max-w-180 mx-auto mb-5'>
            Upload phishing emails, fake texts, and fraud attempts. Earn points,
            climb the leaderboard, and help security researchers understand
            what&apos;s happening right now.
          </p>

          <a
            href='#report'
            className='inline-flex items-center gap-2 bg-brand text-white px-5 md:px-5.5 py-2.5 rounded-md text-[13px] md:text-[14px] font-medium hover:bg-brand-dark transition-colors duration-150'
          >
            <IconUpload size={16} aria-hidden='true' />
            Report a scam
          </a>

          {/* Stats — 3 cols on all sizes, sizing scales with viewport */}
          <div className='grid grid-cols-3 gap-2 md:gap-2.5 w-full md:max-w-105 mx-auto mt-4 md:mt-5'>
            {[
              { value: stats.reports, label: 'scams reported' },
              { value: stats.users, label: 'contributors' },
              { value: stats.countries, label: 'countries' },
            ].map(({ value, label }) => (
              <div
                key={label}
                className='bg-canvas border border-stroke-faint rounded-md p-2.5 md:p-3 text-center'
              >
                <div className='text-base md:text-[20px] font-medium text-brand'>
                  {value.toLocaleString()}
                </div>
                <div className='text-[11px] md:text-[12px] text-fg-muted mt-0.5'>
                  {label}
                </div>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* ── Main content ────────────────────────────────────────────────── */}
      <main id='report'>
        <Container className='py-4'>
          {/*
           * Two-column grid — left column grows, right sidebar is fixed 260px.
           * On mobile/tablet the sidebar is hidden — leaderboard and researcher
           * access cards will get dedicated pages in Phase 2.
           */}
          <div className='grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-3.5'>
            {/* Left column */}
            <div className='flex flex-col gap-3.5'>
              <SubmissionForm />
              <FeedSection reports={feedReports} />
            </div>

            {/* Right sidebar — desktop only */}
            <aside className='hidden lg:flex flex-col gap-3.5'>
              <Sidebar topUsers={topUsers} currentUser={currentUser} />
              {/* Leaderboard, ShieldScore and Researcher access card */}
            </aside>
          </div>
        </Container>
      </main>
    </div>
  );
}
