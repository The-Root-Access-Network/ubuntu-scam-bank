// src/app/ops/digest/page.tsx

/**
 * Ops digest preview — server component.
 * Shows the fortnightly digest data in a readable format.
 * Admins can use this to copy content into Resend Broadcasts.
 */

import { redirect } from 'next/navigation';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { TYPE_META } from '@/lib/utils';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Email Digest' };

const SEVERITY_LABELS: Record<number, string> = {
  1: 'Very low',
  2: 'Low',
  3: 'Medium',
  4: 'High',
  5: 'Critical',
};

export default async function OpsDigestPage() {
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
    console.error('[ops/digest] createAdminClient failed:', err);
    redirect('/');
  }

  const { data: profile } = await admin
    .from('users')
    .select('is_moderator')
    .eq('id', user.id)
    .single();
  if (!profile?.is_moderator) redirect('/');

  const days = 14;
  const sinceDate = new Date();
  sinceDate.setDate(sinceDate.getDate() - days);
  const since = sinceDate.toISOString();

  const [topReports, totalReports, totalConfirms, newUsers, countryResult] =
    await Promise.all([
      admin
        .from('reports')
        .select('id, type, severity, summary, confirm_count, country_code')
        .eq('status', 'published')
        .gte('published_at', since)
        .order('confirm_count', { ascending: false })
        .limit(5),
      admin
        .from('reports')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'published')
        .gte('published_at', since),
      admin
        .from('votes')
        .select('*', { count: 'exact', head: true })
        .eq('vote', 'confirm')
        .gte('voted_at', since),
      admin
        .from('users')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', since),
      admin
        .from('reports')
        .select('country_code')
        .eq('status', 'published')
        .gte('published_at', since)
        .not('country_code', 'is', null),
    ]);

  const uniqueCountries = new Set(
    (countryResult.data ?? []).map((r) => r.country_code),
  ).size;

  const periodEnd = new Date().toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const periodStart = new Date(since).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className='p-6 md:p-8 max-w-3xl'>
      <div className='mb-6'>
        <h1 className='text-heading text-fg mb-1'>Email digest</h1>
        <p className='text-body-sm text-fg-muted'>
          Fortnightly digest content — {periodStart} to {periodEnd}. Copy this
          into Resend Broadcasts to send to the audience.
        </p>
      </div>

      {/* Stats */}
      <div className='grid grid-cols-2 md:grid-cols-4 gap-3 mb-6'>
        {[
          { label: 'Reports published', value: totalReports.count ?? 0 },
          { label: 'Confirms cast', value: totalConfirms.count ?? 0 },
          { label: 'New users', value: newUsers.count ?? 0 },
          { label: 'Active countries', value: uniqueCountries },
        ].map(({ label, value }) => (
          <div
            key={label}
            className='bg-canvas border border-stroke-faint rounded-lg p-4 text-center'
          >
            <p className='text-title font-medium text-brand'>{value}</p>
            <p className='text-caption text-fg-muted mt-0.5'>{label}</p>
          </div>
        ))}
      </div>

      {/* Top reports */}
      <div className='mb-6'>
        <h2 className='text-body font-medium text-fg mb-3'>
          Top reports this period
        </h2>
        {(topReports.data ?? []).length === 0 ? (
          <div className='bg-canvas border border-stroke-faint rounded-lg p-6 text-center'>
            <p className='text-body-sm text-fg-muted'>
              No reports published in this period yet.
            </p>
          </div>
        ) : (
          <div className='flex flex-col gap-3'>
            {(topReports.data ?? []).map((r, i) => {
              const meta = TYPE_META[r.type] ?? TYPE_META.other;
              return (
                <div
                  key={r.id}
                  className='bg-canvas border border-stroke-faint rounded-lg p-4'
                >
                  <div className='flex items-center gap-2 mb-2'>
                    <span className='text-caption text-fg-subtle font-medium'>
                      #{i + 1}
                    </span>
                    <span
                      className={`text-caption-sm font-medium px-2 py-0.5 rounded-full ${meta.classes}`}
                    >
                      {meta.label}
                    </span>
                    <span className='text-caption text-fg-muted'>
                      {SEVERITY_LABELS[r.severity ?? 1]} severity
                    </span>
                    {r.country_code && (
                      <span className='text-caption text-fg-muted'>
                        · {r.country_code}
                      </span>
                    )}
                    <span className='text-caption text-brand ml-auto'>
                      {r.confirm_count} confirmed
                    </span>
                  </div>
                  <p className='text-body-xs text-fg leading-relaxed mb-2'>
                    {r.summary ?? 'No summary.'}
                  </p>
                  <a
                    href={`https://scambank.ubuntubridgeinitiatives.org/reports/${r.id}`}
                    target='_blank'
                    rel='noopener noreferrer'
                    className='text-caption text-brand hover:text-brand-dark transition-colors'
                  >
                    View report ↗
                  </a>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className='bg-canvas-subtle border border-stroke-faint rounded-lg p-5'>
        <h2 className='text-body font-medium text-fg mb-2'>
          How to send this digest
        </h2>
        <ol className='text-body-xs text-fg-muted space-y-2 list-decimal list-inside'>
          <li>
            Go to <strong>resend.com</strong> → Broadcasts → Create Broadcast
          </li>
          <li>
            Select the <strong>UbuntuScamBank Users</strong> audience
          </li>
          <li>Use the stats and top reports above to compose the email body</li>
          <li>
            Subject line suggestion:{' '}
            <em>
              UbuntuScamBank — Top scams {periodStart} to {periodEnd}
            </em>
          </li>
          <li>
            Preview, test send to yourself, then send to the full audience
          </li>
        </ol>
      </div>
    </div>
  );
}
