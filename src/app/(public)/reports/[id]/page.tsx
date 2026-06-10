// src/app/(public)/reports/[id]/page.tsx

/**
 * Report detail page. Displays all information about a single report, including:
 * - Summary and metadata (type, severity, country, AI tags)
 * - Indicators of compromise (grouped by type)
 * - Voting buttons with current counts
 * - View count and submission time
 *
 * Also increments the view count on each page load.
 *
 * Data fetching is done server-side for SEO and performance. The voting buttons
 * are a client component that calls an API route to cast votes.
 */

import { notFound } from 'next/navigation';
import Link from 'next/link';
import {
  IconArrowLeft,
  IconCheck,
  IconEye,
  IconShieldCheck,
} from '@tabler/icons-react';
import Nav from '@/components/layout/Nav';
import Container from '@/components/layout/Container';
import Footer from '@/components/layout/Footer';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { TYPE_META, SEVERITY_LABELS, relativeTime } from '@/lib/utils';
import VoteButtons from '@/components/reports/VoteButtons';
import type { Metadata } from 'next';

// ── Static display maps ───────────────────────────────────────────────────────

const SEVERITY_COLORS: Record<number, string> = {
  1: '#C0DD97',
  2: '#EF9F27',
  3: '#D85A30',
  4: '#E24B4A',
  5: '#A32D2D',
};

const INDICATOR_LABELS: Record<string, string> = {
  domain: 'Domain',
  ip_address: 'IP address',
  email_address: 'Email address',
  phone_number: 'Phone number',
  url: 'URL',
  sender_name: 'Sender name',
  file_hash: 'File hash',
};

// ── Data fetching ─────────────────────────────────────────────────────────────

async function getReport(id: string) {
  const supabase = await createClient();

  const [reportResult, indicatorsResult] = await Promise.all([
    supabase
      .from('reports')
      .select(
        'id, type, severity, country_code, summary, ai_tags, ai_confidence, confirm_count, dispute_count, view_count, is_novel, submitted_at, submitted_by',
      )
      .eq('id', id)
      .eq('status', 'published')
      .single(),
    supabase
      .from('indicators')
      .select('type, value')
      .eq('report_id', id)
      .order('type'),
  ]);

  if (!reportResult.data) return null;

  return {
    report: reportResult.data,
    indicators: indicatorsResult.data ?? [],
  };
}

// ── Metadata ──────────────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();

  const { data } = await supabase
    .from('reports')
    .select('type, summary')
    .eq('id', id)
    .eq('status', 'published')
    .single();

  if (!data) return { title: 'Report not found' };

  const meta = TYPE_META[data.type] ?? TYPE_META.other;
  return {
    title: `${meta.label} report`,
    description: data.summary?.slice(0, 155) ?? undefined,
  };
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function ReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getReport(id);

  if (!data) notFound();

  const { report, indicators } = data;

  // ── Auth check for voting — must be inside the request scope ─────────────
  const authClient = await createClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  const isOwnReport = !!user && user.id === report.submitted_by;
  const isSignedIn = !!user;

  // Increment view_count — atomic enough for a counter at MVP scale
  try {
    const admin = createAdminClient();
    await admin
      .from('reports')
      .update({ view_count: (report.view_count ?? 0) + 1 })
      .eq('id', report.id);
  } catch (err) {
    console.error('[report-detail] view_count update failed:', err);
  }

  // Group indicators by type for section display
  const grouped = indicators.reduce<Record<string, string[]>>((acc, ind) => {
    if (!acc[ind.type]) acc[ind.type] = [];
    acc[ind.type].push(ind.value);
    return acc;
  }, {});

  const meta = TYPE_META[report.type] ?? TYPE_META.other;
  const severityLabel = SEVERITY_LABELS[report.severity] ?? '—';
  const severityColor = SEVERITY_COLORS[report.severity] ?? '#C8C7C2';

  return (
    <div className='min-h-dvh bg-canvas-subtle'>
      <Nav />

      <main>
        <Container className='py-6 md:py-8'>
          {/* Back link */}
          <Link
            href='/#feed'
            className='inline-flex items-center gap-1.5 text-[13px] text-fg-muted hover:text-fg transition-colors duration-150 mb-5'
          >
            <IconArrowLeft size={14} aria-hidden='true' />
            Back to feed
          </Link>

          <div className='bg-canvas border border-stroke-faint rounded-lg p-5 md:p-7'>
            {/* ── Header row ─────────────────────────────────────────────── */}
            <div className='flex flex-wrap items-center gap-2.5 mb-5'>
              <span
                className={`text-[12px] font-medium px-2.5 py-1 rounded-full ${meta.classes}`}
              >
                {meta.label}
              </span>

              <div className='flex items-center gap-1.5'>
                <div
                  className='w-2.5 h-2.5 rounded-full shrink-0'
                  style={{ backgroundColor: severityColor }}
                  aria-hidden='true'
                />
                <span className='text-[13px] text-fg-muted'>
                  {severityLabel} severity
                </span>
              </div>

              {report.is_novel && (
                <span className='text-[12px] font-medium px-2.5 py-1 rounded-full bg-warning-bg text-warning-text'>
                  Novel campaign
                </span>
              )}
            </div>

            {/* ── Summary ────────────────────────────────────────────────── */}
            <p className='text-body-sm leading-relaxed text-fg mb-6'>
              {report.summary ?? 'No summary available for this report.'}
            </p>

            {/* ── Indicators of compromise ───────────────────────────────── */}
            {Object.keys(grouped).length > 0 && (
              <div className='mb-6'>
                <div className='flex items-center gap-1.5 mb-3'>
                  <IconShieldCheck
                    size={14}
                    className='text-fg-muted'
                    aria-hidden='true'
                  />
                  <p className='text-label text-fg-muted uppercase tracking-label'>
                    Indicators of compromise
                  </p>
                </div>
                <div className='flex flex-col gap-4'>
                  {Object.entries(grouped).map(([type, values]) => (
                    <div key={type}>
                      <p className='text-caption text-fg-subtle uppercase tracking-label mb-1.5'>
                        {INDICATOR_LABELS[type] ?? type}
                      </p>
                      <div className='flex flex-wrap gap-1.5'>
                        {values.map((value) => (
                          <span
                            key={value}
                            className='font-mono text-[12px] px-2.5 py-1 bg-canvas-subtle border border-stroke-faint rounded-md text-fg break-all'
                          >
                            {value}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Tags ───────────────────────────────────────────────────── */}
            {report.ai_tags && report.ai_tags.length > 0 && (
              <div className='mb-6'>
                <p className='text-label text-fg-muted uppercase tracking-label mb-3'>
                  Tags
                </p>
                <div className='flex flex-wrap gap-1.5'>
                  {report.ai_tags.map((tag) => (
                    <span
                      key={tag}
                      className='text-[12px] px-2.5 py-1 bg-neutral-100 text-neutral-600 rounded-full'
                    >
                      {tag.replace(/_/g, ' ')}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* ── Voting ─────────────────────────────────────────────────────── */}
            <VoteButtons
              reportId={report.id}
              confirmCount={report.confirm_count}
              disputeCount={report.dispute_count}
              isOwnReport={isOwnReport}
              isSignedIn={isSignedIn}
            />

            {/* ── Footer meta ────────────────────────────────────────────── */}
            <div className='border-t border-stroke-faint pt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-[12px] text-fg-muted'>
              <span className='flex items-center gap-1'>
                <IconEye size={13} aria-hidden='true' />
                {((report.view_count ?? 0) + 1).toLocaleString()} views
              </span>
              <span className='flex items-center gap-1'>
                <IconCheck size={13} aria-hidden='true' />
                {report.confirm_count} confirmed
              </span>
              {report.country_code && <span>{report.country_code}</span>}
              {report.ai_confidence != null && (
                <span>
                  AI confidence: {Math.round(report.ai_confidence * 100)}%
                </span>
              )}
              <span className='md:ml-auto'>
                {relativeTime(report.submitted_at)}
              </span>
            </div>
          </div>
        </Container>
      </main>

      <Footer />
    </div>
  );
}
