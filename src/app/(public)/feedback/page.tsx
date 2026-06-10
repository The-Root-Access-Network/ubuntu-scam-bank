// src/app/(public)/feedback/page.tsx

import Nav from '@/components/layout/Nav';
import Container from '@/components/layout/Container';
import FeedbackForm from '@/components/feedback/FeedbackForm';
import Footer from '@/components/layout/Footer';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Contact',
  description:
    'Get in touch with the TRAN team — questions, press enquiries, research partnerships, and feedback welcome.',
};

const CONTACT_CARDS = [
  {
    label: 'General questions',
    desc: 'Using the platform, reporting issues, or just getting started.',
  },
  {
    label: 'Research & partnerships',
    desc: 'Collaborations, API access, academic or NGO projects.',
  },
  {
    label: 'Press & media',
    desc: 'Interviews, coverage, and media kit requests.',
  },
];

export default function FeedbackPage() {
  return (
    <div className='min-h-dvh bg-canvas-subtle flex flex-col'>
      <Nav />

      <main className='flex-1'>
        <Container className='py-8 md:py-12 max-w-185'>
          {/* Page header */}
          <div className='mb-8'>
            <span className='inline-flex items-center text-caption text-brand bg-brand-light px-3 py-1 rounded-full mb-4'>
              No account needed
            </span>
            <h1 className='text-heading font-medium text-fg mb-2'>
              Get in touch
            </h1>
            <p className='text-body-sm text-fg-muted leading-relaxed max-w-135'>
              Whether you have a question, spotted something wrong, want to
              collaborate, or just want to say hello — we read every message.
            </p>
          </div>

          {/* Context cards */}
          <div className='grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8'>
            {CONTACT_CARDS.map(({ label, desc }) => (
              <div
                key={label}
                className='bg-canvas border border-stroke-faint rounded-lg p-4'
              >
                <p className='text-body-sm font-medium text-fg mb-1'>{label}</p>
                <p className='text-body-xs text-fg-muted leading-relaxed'>
                  {desc}
                </p>
              </div>
            ))}
          </div>

          {/* Form card */}
          <div className='bg-canvas border border-stroke-faint rounded-lg p-6 md:p-8'>
            <h2 className='text-[16px] font-medium text-fg mb-6'>
              Send us a message
            </h2>
            <FeedbackForm />
          </div>

          {/* Direct email fallback */}
          <p className='text-caption text-fg-subtle text-center mt-6'>
            Prefer email?{' '}
            <a
              href='mailto:therootaccessnetwork@africybercore.com'
              className='text-brand hover:text-brand-dark transition-colors duration-150'
            >
              therootaccessnetwork@africybercore.com
            </a>
          </p>
        </Container>
      </main>

      <Footer />
    </div>
  );
}
