// src/components/home/FAQ.tsx

'use client';

import { useState } from 'react';
import { IconChevronDown } from '@tabler/icons-react';

const FAQ_ITEMS = [
  {
    q: 'How do I submit a scam report?',
    a: "Use the submission form on the homepage. You can paste scam text directly, upload a screenshot or file, or both. Select the scam type, choose a severity, and pick your country. You'll earn points as soon as you submit.",
  },
  {
    q: 'What happens to my report after I submit it?',
    a: 'Your report is automatically analysed by our AI triage system, which extracts key indicators (links, phone numbers, email addresses) and generates a plain-English summary. It then goes into a moderation queue before being published to the public feed.',
  },
  {
    q: 'How do I earn points?',
    a: 'You earn points for every scam you report. Bonus points are awarded for high-severity reports, novel campaign types, and when other community members confirm your report. Your first submission earns a welcome bonus.',
  },
  {
    q: 'What are the badge tiers?',
    a: 'There are five tiers: Watcher (0–2,499 pts), Guardian (2,500–4,999 pts), Sentinel (5,000–9,999 pts), Elite Sentinel (10,000–19,999 pts), and Sage (20,000+ pts). Your badge upgrades automatically as you accumulate points.',
  },
  {
    q: 'How do I view or edit my profile?',
    a: 'Click your avatar in the top-right corner after signing in, or navigate directly to /profile. You can update your display name, bio, and country from there.',
  },
  {
    q: 'How do I confirm or dispute a report?',
    a: "Open any published report and use the Confirm or Dispute buttons at the bottom. Confirming a report means you've seen the same or similar scam. Disputing means you believe the report may be inaccurate. You need a Guardian badge or above to vote.",
  },
  {
    q: 'Who can access the researcher API?',
    a: 'Security researchers, academics, journalists, and NGOs can apply for API access via the researchers page. Applications are reviewed by the TRAN team. Approved researchers receive a personal API key for programmatic access to published reports.',
  },
  {
    q: 'Is my personal information safe?',
    a: 'Yes. Your email address is never shown publicly. Any personal information in submitted scam content is automatically stripped by our AI before storage. Uploaded files have metadata (such as GPS coordinates in photos) removed before being saved.',
  },
];

export default function FAQ() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <section className='mt-8'>
      <h2 className='text-heading font-medium text-fg mb-1'>
        Frequently asked questions
      </h2>
      <p className='text-body-sm text-fg-muted mb-5'>
        Everything you need to know about using UbuntuScamBank.
      </p>
      <div className='flex flex-col divide-y divide-stroke-faint border border-stroke-faint rounded-lg overflow-hidden'>
        {FAQ_ITEMS.map((item, i) => (
          <div key={i} className='bg-canvas'>
            <button
              type='button'
              onClick={() => setOpen(open === i ? null : i)}
              className='w-full flex items-center justify-between px-5 py-4 text-left gap-4 hover:bg-canvas-subtle transition-colors duration-150 cursor-pointer'
              aria-expanded={open === i}
            >
              <span className='text-body-sm font-medium text-fg'>{item.q}</span>
              <IconChevronDown
                size={16}
                className={[
                  'text-fg-muted shrink-0 transition-transform duration-200',
                  open === i ? 'rotate-180' : '',
                ].join(' ')}
                aria-hidden='true'
              />
            </button>
            {open === i && (
              <div className='px-5 pb-4'>
                <p className='text-body-sm text-fg-muted leading-relaxed'>
                  {item.a}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
