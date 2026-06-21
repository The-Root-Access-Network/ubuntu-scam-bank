// src/app/(public)/page.tsx

/**
 * HomePage is a server component that fetches all necessary data in parallel before rendering. This includes the latest reports for the feed, leaderboard users for the sidebar, and the current user's profile for the shield score.
 *
 * By fetching all data server-side and passing it as props to child components, we ensure a fast initial load without any client-side fetching or waterfalls.
 *
 * The page is structured with a hero section at the top, followed by a two-column layout where the left side contains the submission form and feed, and the right sidebar displays the leaderboard and shield score.
 *
 * The sidebar also includes dynamic country tabs based on the top countries from the leaderboard data.
 *
 * The page revalidates every 5 minutes at the edge to keep content reasonably fresh without overwhelming the server with requests.
 *
 * This affects the full page including the feed (latest 20 reports) and the sidebar country tabs.
 * At current scale this is acceptable — flag for review if real-time feed freshness becomes a priority post-launch.
 */

export const revalidate = 60;

import { IconUpload } from '@tabler/icons-react';
import Nav from '@/components/layout/Nav';
import Container from '@/components/layout/Container';
import Footer from '@/components/layout/Footer';
import SubmissionForm from '@/components/forms/SubmissionForm';
import FeedSection from '@/components/feed/FeedSection';
import Sidebar from '@/components/layout/Sidebar';
import FAQ from '@/components/home/FAQ';
import { createClient } from '@/lib/supabase/server';

async function getPageData() {
  const supabase = await createClient();

  // Auth check for shield score — if user is signed in, fetch their profile for the sidebar
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
    countryPointsResult,
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
    supabase
      .from('leaderboard_users')
      .select('country_code, points')
      .not('country_code', 'is', null),
  ]);

  // Aggregate points per country and derive top 2 by total.
  const countryTotals = (countryPointsResult.data ?? []).reduce<
    Record<string, number>
  >((acc, row) => {
    const code = row.country_code!;
    acc[code] = (acc[code] ?? 0) + (row.points ?? 0);
    return acc;
  }, {});

  const topCountries = Object.entries(countryTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([code]) => code);

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
    topCountries,
  };
}

export default async function HomePage() {
  const { stats, feedReports, topUsers, currentUser, topCountries } =
    await getPageData();

  return (
    <div className='min-h-dvh bg-canvas-subtle'>
      <Nav />

      {/* ── Hero ───────────────────────────────────────────────────────── */}
      <section className='bg-canvas-subtle border-b border-stroke-faint'>
        <Container className='pt-12 md:pt-16 lg:pt-20 pb-10 md:pb-14 text-center'>
          <h1 className='text-display tracking-display text-fg mb-4'>
            Seen a scam? Report it. Protect someone.
          </h1>

          <p className='text-body-sm font-bold text-fg mb-1'>
            Report scams. Earn points. Top contributors get rewarded.
          </p>
          <p className='text-body-xs text-fg-muted max-w-[90%] md:max-w-180 mx-auto mb-1'>
            Stay active, climb the leaderboard, and be first in line when we
            launch contributor rewards.
          </p>

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
           * On mobile/tablet the sidebar is hidden.
           */}
          <div className='grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-3.5'>
            {/* Left column */}
            <div className='flex flex-col gap-3.5'>
              <SubmissionForm />
              <FeedSection reports={feedReports} />
            </div>

            {/* Right sidebar — desktop only */}
            <aside className='hidden lg:flex flex-col gap-3.5'>
              <Sidebar
                topUsers={topUsers}
                currentUser={currentUser}
                topCountries={topCountries}
              />
            </aside>
          </div>
        </Container>

        {/* FAQ — full width below the two-column grid */}
        <Container className='pb-8'>
          <FAQ />
        </Container>
      </main>

      <Footer />
    </div>
  );
}
