// src/app/(public)/reports/page.tsx

import Link from 'next/link';
import {
  IconCheck,
  IconEye,
  IconChevronLeft,
  IconChevronRight,
} from '@tabler/icons-react';
import Nav from '@/components/layout/Nav';
import Container from '@/components/layout/Container';
import Footer from '@/components/layout/Footer';
import ReportFilters from '@/components/reports/ReportFilters';
import { createClient } from '@/lib/supabase/server';
import { TYPE_META, SEVERITY_LABELS, relativeTime } from '@/lib/utils';
import type { Metadata } from 'next';
import type { Tables } from '@/types/database';

export const metadata: Metadata = {
  title: 'All Reports',
  description: 'Browse all published scam reports on UbuntuScamBank.',
};

const PER_PAGE = 20;

type FeedReport = Pick<
  Tables<'reports'>,
  | 'id'
  | 'type'
  | 'severity'
  | 'country_code'
  | 'summary'
  | 'confirm_count'
  | 'view_count'
  | 'submitted_at'
>;

async function getReports(page: number, type: string, country: string) {
  const supabase = await createClient();

  let query = supabase
    .from('reports')
    .select(
      'id, type, severity, country_code, summary, confirm_count, view_count, submitted_at',
      { count: 'exact' },
    )
    .eq('status', 'published')
    .order('submitted_at', { ascending: false })
    .range((page - 1) * PER_PAGE, page * PER_PAGE - 1);

  if (type) query = query.eq('type', type);
  if (country) query = query.eq('country_code', country.toUpperCase());

  const { data, count, error } = await query;

  if (error) {
    console.error('[reports/page] fetch failed:', error);
    return { reports: [], total: 0 };
  }

  return { reports: (data ?? []) as FeedReport[], total: count ?? 0 };
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; type?: string; country?: string }>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page ?? '1', 10));
  const type = sp.type ?? '';
  const country = sp.country ?? '';

  const { reports, total } = await getReports(page, type, country);
  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
  const hasPrev = page > 1;
  const hasNext = page < totalPages;
  const hasFilters = !!(type || country);

  return (
    <div className='min-h-dvh bg-canvas-subtle'>
      <Nav />

      <main>
        <Container className='py-6 md:py-8'>
          {/* Header */}
          <div className='mb-5'>
            <h1 className='text-heading font-medium text-fg mb-1'>
              All reports
            </h1>
            <p className='text-body-sm text-fg-muted'>
              {total.toLocaleString()} published report{total !== 1 ? 's' : ''}
              {hasFilters ? ' matching your filters' : ''}
            </p>
          </div>

          {/* Filters — client component */}
          <ReportFilters currentType={type} currentCountry={country} />

          {/* Report list */}
          <div className='bg-canvas border border-stroke-faint rounded-lg p-5'>
            {reports.length === 0 ? (
              <div className='text-center py-10'>
                <p className='text-body-sm text-fg-muted mb-3'>
                  No reports match your filters.
                </p>
                {hasFilters && (
                  <Link
                    href='/reports'
                    className='text-body-xs text-brand hover:text-brand-dark transition-colors duration-150'
                  >
                    Clear filters
                  </Link>
                )}
              </div>
            ) : (
              <div>
                {reports.map((report, i) => {
                  const meta = TYPE_META[report.type] ?? TYPE_META.other;
                  const timeStr = relativeTime(report.submitted_at);
                  const loc = report.country_code
                    ? ` · ${report.country_code}`
                    : '';

                  return (
                    <Link
                      key={report.id}
                      href={`/reports/${report.id}`}
                      className={[
                        'block py-3 group',
                        i < reports.length - 1
                          ? 'border-b border-stroke-faint'
                          : '',
                      ].join(' ')}
                    >
                      {/* Top row */}
                      <div className='flex items-center justify-between mb-1.5'>
                        <span
                          className={`text-caption font-medium px-2 py-0.5 rounded-full ${meta.classes}`}
                        >
                          {meta.label}
                        </span>
                        <span className='text-caption text-fg-subtle'>
                          {timeStr}
                          {loc}
                        </span>
                      </div>

                      {/* Summary */}
                      <p className='text-body-sm text-fg leading-relaxed mb-1.5 group-hover:text-brand transition-colors duration-150'>
                        {report.summary ?? 'No summary available.'}
                      </p>

                      {/* Meta row */}
                      <div className='flex items-center gap-3 text-caption text-fg-muted'>
                        <span className='flex items-center gap-1'>
                          <IconEye size={12} aria-hidden='true' />
                          {report.view_count.toLocaleString()} views
                        </span>
                        <span className='flex items-center gap-1'>
                          <IconCheck size={12} aria-hidden='true' />
                          {report.confirm_count} confirmed
                        </span>
                        <span>
                          Severity: {SEVERITY_LABELS[report.severity] ?? '—'}
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* Pagination */}
          {reports.length > 0 && (
            <div className='flex items-center justify-between mt-4'>
              <p className='text-caption-sm text-fg-subtle'>
                Page {page} of {totalPages} · {total.toLocaleString()} total
                report{total !== 1 ? 's' : ''}
              </p>

              <div className='flex items-center gap-1'>
                {hasPrev ? (
                  <Link
                    href={`/reports?${new URLSearchParams({ ...(type && { type }), ...(country && { country }), page: String(page - 1) })}`}
                    className='inline-flex items-center gap-1 text-caption-sm px-2.5 py-1.5 border border-stroke rounded-md text-fg-muted hover:text-fg hover:bg-canvas-subtle transition-colors duration-150'
                  >
                    <IconChevronLeft size={13} aria-hidden='true' />
                    Prev
                  </Link>
                ) : (
                  <span className='inline-flex items-center gap-1 text-caption-sm px-2.5 py-1.5 border border-stroke-faint rounded-md text-fg-subtle cursor-not-allowed'>
                    <IconChevronLeft size={13} aria-hidden='true' />
                    Prev
                  </span>
                )}

                <span className='text-caption-sm text-fg-muted px-2'>
                  {page} / {totalPages}
                </span>

                {hasNext ? (
                  <Link
                    href={`/reports?${new URLSearchParams({ ...(type && { type }), ...(country && { country }), page: String(page + 1) })}`}
                    className='inline-flex items-center gap-1 text-caption-sm px-2.5 py-1.5 border border-stroke rounded-md text-fg-muted hover:text-fg hover:bg-canvas-subtle transition-colors duration-150'
                  >
                    Next
                    <IconChevronRight size={13} aria-hidden='true' />
                  </Link>
                ) : (
                  <span className='inline-flex items-center gap-1 text-caption-sm px-2.5 py-1.5 border border-stroke-faint rounded-md text-fg-subtle cursor-not-allowed'>
                    Next
                    <IconChevronRight size={13} aria-hidden='true' />
                  </span>
                )}
              </div>
            </div>
          )}
        </Container>
      </main>

      <Footer />
    </div>
  );
}
