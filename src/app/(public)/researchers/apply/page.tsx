// src/app/(public)/researchers/apply/page.tsx

import { redirect } from 'next/navigation';
import Nav from '@/components/layout/Nav';
import Container from '@/components/layout/Container';
import ApplicationForm from '@/components/researchers/ApplicationForm';
import { createClient } from '@/lib/supabase/server';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Apply for researcher API access' };

export default async function ResearchersApplyPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // API access requires an account
  if (!user) redirect('/');

  // Check for an existing application
  const { data: existing } = await supabase
    .from('researcher_applications')
    .select('id, status')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const alreadyPendingOrApproved =
    existing?.status === 'pending' || existing?.status === 'approved';

  return (
    <div className='min-h-dvh bg-canvas-subtle'>
      <Nav />

      <main>
        <Container className='py-8 md:py-12 max-w-185'>
          {/* Page header */}
          <div className='mb-8'>
            <span className='inline-flex items-center text-[12px] text-brand bg-brand-light px-3 py-1 rounded-full mb-4'>
              Free access · No credit card required
            </span>
            <h1 className='text-[22px] font-medium text-fg mb-2'>
              Apply for researcher API access
            </h1>
            <p className='text-body-sm text-fg-muted leading-relaxed max-w-135'>
              The UbuntuScamBank API gives security researchers, NGOs,
              journalists, and academics structured access to real-world scam
              intelligence data. Access is merit-based and free.
            </p>
          </div>

          {/* What you get */}
          <div className='grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8'>
            {[
              {
                label: 'Structured data',
                desc: 'Clean JSON feed of classified, anonymised scam reports',
              },
              {
                label: 'IOC extraction',
                desc: 'Domains, email addresses, phone numbers, URLs per report',
              },
              {
                label: 'Always free',
                desc: 'No cost for research, NGO, and academic use',
              },
            ].map(({ label, desc }) => (
              <div
                key={label}
                className='bg-canvas border border-stroke-faint rounded-lg p-4'
              >
                <p className='text-[13px] font-medium text-fg mb-1'>{label}</p>
                <p className='text-[12px] text-fg-muted leading-relaxed'>
                  {desc}
                </p>
              </div>
            ))}
          </div>

          {/* Existing application state */}
          {existing?.status === 'pending' && (
            <div className='bg-warning-bg border border-warning text-warning-text rounded-lg px-4 py-3.5 text-body-xs mb-6'>
              Your application is under review. We&apos;ll be in touch within 5
              working days.
            </div>
          )}
          {existing?.status === 'approved' && (
            <div className='bg-brand-light border border-brand-medium text-brand-dark rounded-lg px-4 py-3.5 text-body-xs mb-6'>
              Your API access has been approved. Check your registered email for
              your key.
            </div>
          )}
          {existing?.status === 'rejected' && (
            <div className='bg-danger-bg border border-danger text-danger-text rounded-lg px-4 py-3.5 text-body-xs mb-6'>
              Your previous application was not approved. Contact{' '}
              <a
                href='mailto:info@therootaccessnetwork.com'
                className='underline'
              >
                info@therootaccessnetwork.com
              </a>{' '}
              if you believe this is an error.
            </div>
          )}

          {/* Form — hidden if pending or approved */}
          {!alreadyPendingOrApproved && (
            <div className='bg-canvas border border-stroke-faint rounded-lg p-6 md:p-8'>
              <h2 className='text-[16px] font-medium text-fg mb-6'>
                Your application
              </h2>
              <ApplicationForm />
            </div>
          )}
        </Container>
      </main>
    </div>
  );
}
