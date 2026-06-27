// src/app/ops/reports/page.tsx

/**
 * Ops moderation queue — server component.
 * Layer 3: independent moderator check.
 * Fetches reports with status 'pending' or 'under_review' via admin client.
 * Oldest first — FIFO review order.
 */

import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import ReportActions from '@/components/ops/ReportActions';
import { TYPE_META, SEVERITY_LABELS, relativeTime } from '@/lib/utils';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Moderation Queue' };

// ── Types ─────────────────────────────────────────────────────────────────────

type QueueReport = {
  id: string;
  type: string;
  severity: number;
  country_code: string | null;
  summary: string | null;
  status: string;
  ai_confidence: number | null;
  submitted_at: string;
  raw_content: string | null;
};

// ── Triage status helpers ─────────────────────────────────────────────────────

function triageStatusBadge(report: QueueReport) {
  if (report.status === 'under_review' && report.ai_confidence === null) {
    return {
      label: 'Triage failed',
      classes: 'bg-danger-bg text-danger-text',
    };
  }
  if (report.status === 'under_review' && report.ai_confidence !== null) {
    return {
      label: 'Flagged for review',
      classes: 'bg-warning-bg text-warning-text',
    };
  }
  return {
    label: 'Pending',
    classes: 'bg-neutral-100 text-neutral-600',
  };
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function OpsModerationQueuePage() {
  // Independent moderator check — layer 3
  const authClient = await createClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();
  if (!user) redirect('/');

  let admin;
  try {
    admin = createAdminClient();
  } catch (err) {
    console.error('[ops/reports] createAdminClient failed:', err);
    redirect('/');
  }

  const { data: profile } = await admin
    .from('users')
    .select('is_moderator')
    .eq('id', user.id)
    .single();
  if (!profile?.is_moderator) redirect('/');

  // ── Fetch queue ───────────────────────────────────────────────────────────
  const { data: pendingReports } = await admin
    .from('reports')
    .select(
      'id, type, severity, country_code, summary, status, ai_confidence, submitted_at, raw_content',
    )
    .in('status', ['pending', 'under_review'])
    .order('submitted_at', { ascending: true }); // oldest first

  const reports = (pendingReports ?? []) as QueueReport[];

  return (
    <div className='p-6 md:p-8'>
      <div className='mb-6'>
        <h1 className='text-heading text-fg mb-1'>Moderation queue</h1>
        <p className='text-body-sm text-fg-muted'>
          {reports.length === 0
            ? 'Queue is clear.'
            : `${reports.length} report${reports.length !== 1 ? 's' : ''} awaiting review — oldest first.`}
        </p>
      </div>

      {reports.length === 0 ? (
        <div className='bg-canvas border border-stroke-faint rounded-lg p-10 text-center'>
          <p className='text-body-sm font-medium text-fg mb-1'>
            Queue is clear
          </p>
          <p className='text-body-xs text-fg-muted'>
            No reports are pending moderation. New submissions are published
            automatically when triage succeeds.
          </p>
        </div>
      ) : (
        <div className='flex flex-col gap-3'>
          {reports.map((report) => {
            const typeMeta = TYPE_META[report.type] ?? TYPE_META.other;
            const triageBadge = triageStatusBadge(report);
            const severityLabel = SEVERITY_LABELS[report.severity] ?? '—';
            const preview = report.raw_content
              ? report.raw_content.slice(0, 200) +
                (report.raw_content.length > 200 ? '…' : '')
              : null;

            return (
              <div
                key={report.id}
                className='bg-canvas border border-stroke-faint rounded-lg p-5'
              >
                {/* ── Header row ──────────────────────────────────────── */}
                <div className='flex flex-wrap items-center gap-2 mb-3'>
                  <span
                    className={`text-caption-sm font-medium px-2 py-0.5 rounded-full ${typeMeta.classes}`}
                  >
                    {typeMeta.label}
                  </span>
                  <span className='text-caption text-fg-muted'>
                    Severity: {severityLabel}
                  </span>
                  {report.country_code && (
                    <span className='text-caption text-fg-muted'>
                      {report.country_code}
                    </span>
                  )}
                  <span
                    className={`text-caption-sm font-medium px-2 py-0.5 rounded-full ${triageBadge.classes}`}
                  >
                    {triageBadge.label}
                  </span>
                  {report.ai_confidence !== null && (
                    <span className='text-caption text-fg-subtle'>
                      {Math.round(report.ai_confidence * 100)}% confidence
                    </span>
                  )}
                  <span className='text-caption text-fg-subtle ml-auto'>
                    {relativeTime(report.submitted_at)}
                  </span>
                </div>

                {/* ── Summary ─────────────────────────────────────────── */}
                {report.summary && (
                  <p className='text-body-sm text-fg leading-relaxed mb-3'>
                    {report.summary}
                  </p>
                )}

                {/* ── Raw content preview ──────────────────────────────── */}
                {preview && (
                  <div className='mb-4'>
                    <p className='text-caption text-fg-muted uppercase tracking-label mb-1.5'>
                      Raw content preview
                    </p>
                    <pre className='font-mono text-[11px] text-fg-muted leading-relaxed bg-canvas-subtle border border-stroke-faint rounded-md p-3 overflow-x-auto max-h-30 whitespace-pre-wrap wrap-break-word'>
                      {preview}
                    </pre>
                  </div>
                )}

                {/* ── Footer: report link + actions ───────────────────── */}
                <div className='flex items-center justify-between gap-3'>
                  <Link
                    href={`/reports/${report.id}`}
                    target='_blank'
                    rel='noopener noreferrer'
                    className='text-caption text-brand hover:text-brand-dark transition-colors duration-150'
                  >
                    View report ↗
                  </Link>
                  <ReportActions reportId={report.id} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
