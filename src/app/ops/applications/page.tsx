// src/app/ops/applications/page.tsx

import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import ApplicationActions from '@/components/ops/ApplicationActions';
import { cn } from '@/lib/utils';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Researcher Applications' };

const STATUSES = ['pending', 'approved', 'rejected'] as const;
type ApplicationStatus = (typeof STATUSES)[number];

interface ApplicationRow {
  id: string;
  full_name: string;
  organisation: string;
  role: string;
  use_case: string;
  portfolio_url: string | null;
  created_at: string;
  status: string;
  users:
    | {
        display_name: string | null;
        email: string | null;
      }
    | Array<{
        display_name: string | null;
        email: string | null;
      }>
    | null;
}

function parseStatus(value: string | string[] | undefined): ApplicationStatus {
  const status = Array.isArray(value) ? value[0] : value;
  return STATUSES.includes(status as ApplicationStatus)
    ? (status as ApplicationStatus)
    : 'pending';
}

function userFor(row: ApplicationRow) {
  return Array.isArray(row.users) ? row.users[0] : row.users;
}

export default async function OpsApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string | string[] }>;
}) {
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
    console.error('[ops/applications] createAdminClient failed:', err);
    redirect('/');
  }

  const { data: profile } = await admin
    .from('users')
    .select('is_moderator')
    .eq('id', user.id)
    .single();
  if (!profile?.is_moderator) redirect('/');

  const sp = await searchParams;
  const status = parseStatus(sp.status);

  const { data } = await admin
    .from('researcher_applications')
    .select(
      'id, full_name, organisation, role, use_case, portfolio_url, created_at, status, users!researcher_applications_user_id_fkey(display_name, email)',
    )
    .eq('status', status)
    .order('created_at', { ascending: false });

  const applications = (data ?? []) as unknown as ApplicationRow[];

  return (
    <div className='p-6 md:p-8'>
      <div className='mb-6'>
        <h1 className='text-heading text-fg mb-1'>Researcher Applications</h1>
        <p className='text-body-sm text-fg-muted'>
          Review API access requests and issue researcher keys.
        </p>
      </div>

      <div className='flex flex-wrap gap-2 mb-4'>
        {STATUSES.map((s) => (
          <Link
            key={s}
            href={
              s === 'pending'
                ? '/ops/applications'
                : `/ops/applications?status=${s}`
            }
            className={cn(
              'px-3 py-1.5 rounded-md border text-body-xs font-medium capitalize transition-colors',
              status === s
                ? 'bg-brand text-white border-brand'
                : 'bg-canvas text-fg-muted border-stroke-faint hover:text-fg',
            )}
          >
            {s}
          </Link>
        ))}
      </div>

      <div className='bg-canvas border border-stroke-faint rounded-lg overflow-hidden'>
        {applications.length === 0 ? (
          <div className='py-10 text-center'>
            <p className='text-body-sm text-fg-muted'>
              No {status} applications.
            </p>
          </div>
        ) : (
          applications.map((application, i) => {
            const applicant = userFor(application);
            return (
              <div
                key={application.id}
                className={cn(
                  'grid grid-cols-1 xl:grid-cols-[1fr_180px] gap-4 px-4 py-4',
                  i < applications.length - 1 && 'border-b border-stroke-faint',
                )}
              >
                <div className='min-w-0'>
                  <div className='flex flex-wrap items-center gap-x-2 gap-y-1 mb-1'>
                    <h2 className='text-body-sm font-medium text-fg'>
                      {application.full_name}
                    </h2>
                    <span className='text-caption text-fg-subtle'>
                      {application.organisation}
                    </span>
                  </div>
                  <p className='text-body-xs text-fg-muted mb-2'>
                    {application.role}
                  </p>
                  <p className='text-body-xs text-fg leading-relaxed mb-3 max-w-3xl'>
                    {application.use_case}
                  </p>
                  <div className='flex flex-wrap items-center gap-x-4 gap-y-1 text-caption text-fg-subtle'>
                    {application.portfolio_url && (
                      <a
                        href={application.portfolio_url}
                        target='_blank'
                        rel='noreferrer'
                        className='text-brand hover:text-brand-dark transition-colors'
                      >
                        Portfolio
                      </a>
                    )}
                    <span>
                      Submitted{' '}
                      {new Date(application.created_at).toLocaleDateString(
                        'en-GB',
                        { day: 'numeric', month: 'short', year: 'numeric' },
                      )}
                    </span>
                    <span>{applicant?.email ?? 'No account email'}</span>
                    {applicant?.display_name && (
                      <span>{applicant.display_name}</span>
                    )}
                  </div>
                </div>

                <div className='xl:text-right'>
                  <ApplicationActions
                    applicationId={application.id}
                    status={application.status}
                  />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
