// src/app/(public)/page.tsx

import { IconUpload } from '@tabler/icons-react';
import Nav from '@/components/layout/Nav';
import Container from '@/components/layout/Container';
import { createClient } from '@/lib/supabase/server';

async function getStats() {
  const supabase = await createClient();

  const [reportsResult, usersResult, countryResult] = await Promise.all([
    supabase
      .from('reports')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'published'),
    supabase.from('users').select('*', { count: 'exact', head: true }),
    supabase
      .from('reports')
      .select('country_code')
      .eq('status', 'published')
      .not('country_code', 'is', null),
  ]);

  const uniqueCountries = new Set(
    countryResult.data?.map((r) => r.country_code) ?? [],
  ).size;

  return {
    reports: reportsResult.count ?? 0,
    users: usersResult.count ?? 0,
    countries: uniqueCountries,
  };
}

export default async function HomePage() {
  const stats = await getStats();

  return (
    <div className='min-h-dvh bg-canvas-subtle'>
      <Nav />

      {/* ── Hero ───────────────────────────────────────────────────────── */}
      <section className='bg-canvas-subtle border-b border-stroke-faint'>
        <Container className='pt-8 md:pt-9 pb-6 md:pb-7 text-center'>
          <h1 className='text-lg md:text-[20px] lg:text-[22px] font-medium text-fg mb-2'>
            Seen a scam? Report it. Protect someone.
          </h1>

          <p className='text-[13px] md:text-[14px] text-fg-muted max-w-[90%] md:max-w-120 mx-auto mb-5 leading-relaxed'>
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
                <div className='text-[10px] md:text-[11px] text-fg-muted mt-0.5'>
                  {label}
                </div>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* ── Main content — added in subsequent steps ──────────────────── */}
      <main id='report'>
        <Container className='py-4'>
          {/* Submission form, feed, and sidebar follow here */}
        </Container>
      </main>
    </div>
  );
}
