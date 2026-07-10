// src/app/(public)/terms/page.tsx

import Nav from '@/components/layout/Nav';
import Container from '@/components/layout/Container';
import Footer from '@/components/layout/Footer';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms and Conditions',
  description:
    'The terms governing your use of UbuntuScamBank, operated by The Root Access Network.',
};

// ── Shared prose components ───────────────────────────────────────────────────

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className='text-body font-semibold text-fg mt-8 mb-3'>{children}</h2>
  );
}

function Body({ children }: { children: React.ReactNode }) {
  return (
    <p className='text-body-sm text-fg-muted leading-relaxed mb-3'>
      {children}
    </p>
  );
}

function BulletList({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className='list-disc list-outside pl-5 mb-3 flex flex-col gap-1.5'>
      {items.map((item, i) => (
        <li key={i} className='text-body-sm text-fg-muted leading-relaxed'>
          {item}
        </li>
      ))}
    </ul>
  );
}

function ContactEmail() {
  return (
    <a
      href='mailto:therootaccessnetwork@africybercore.com'
      className='text-brand hover:text-brand-dark transition-colors duration-150'
    >
      therootaccessnetwork@africybercore.com
    </a>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function TermsPage() {
  return (
    <div className='min-h-dvh bg-canvas-subtle flex flex-col'>
      <Nav />

      <main className='flex-1'>
        <Container className='py-8 md:py-12 max-w-3xl'>
          {/* Page header */}
          <div className='mb-8 pb-6 border-b border-stroke-faint'>
            <p className='text-caption text-fg-subtle mb-2'>
              The Root Access Network — UbuntuScamBank
            </p>
            <h1 className='text-heading font-medium text-fg mb-2'>
              Terms and Conditions
            </h1>
            <p className='text-body-xs text-fg-subtle'>
              Last updated: July 2026
            </p>
          </div>

          {/* Content */}
          <div>
            <SectionHeading>About these terms</SectionHeading>
            <Body>
              These terms govern your use of UbuntuScamBank at{' '}
              <a
                href='https://scambank.ubuntubridgeinitiatives.org'
                className='text-brand hover:text-brand-dark transition-colors duration-150'
              >
                scambank.ubuntubridgeinitiatives.org
              </a>
              , operated by The Root Access Network (&ldquo;TRAN&rdquo;,
              &ldquo;we&rdquo;, &ldquo;us&rdquo;). By creating an account or
              using the platform, you agree to these terms. If you do not agree,
              please do not use the platform.
            </Body>
            <Body>
              These terms are governed by the laws of England and Wales.
            </Body>

            <SectionHeading>Who can use UbuntuScamBank</SectionHeading>
            <Body>
              You must be at least 16 years old to create an account. By
              registering, you confirm that you are 16 or older.
            </Body>

            <SectionHeading>What UbuntuScamBank is</SectionHeading>
            <Body>
              UbuntuScamBank is a community-powered threat intelligence
              platform. Its purpose is to allow members of the public to submit
              scam reports, and to make that threat data available to security
              researchers, NGOs, journalists, and the general public.
            </Body>
            <Body>
              The platform is operated on a not-for-profit basis under the
              Ubuntu Bridge Initiative, a programme of The Root Access Network.
            </Body>

            <SectionHeading>Your account</SectionHeading>
            <Body>
              You are responsible for keeping your account credentials secure.
              You are responsible for all activity that occurs under your
              account.
            </Body>
            <Body>
              You may not create accounts for the purpose of manipulation, spam,
              or abuse. You may not impersonate another person or organisation.
            </Body>

            <SectionHeading>Submitting reports</SectionHeading>
            <Body>When you submit a scam report, you confirm that:</Body>
            <BulletList
              items={[
                'The content describes a real scam or fraud attempt that you or someone you know has encountered',
                'You are not submitting false, fabricated, or misleading reports',
                'You have removed or not included unnecessary personal information about yourself or others in the submission',
                'You understand that submitted reports may be published publicly on the platform and made available to researchers via the API',
              ]}
            />
            <Body>
              We use AI to analyse and summarise submitted reports before
              publication. Automated systems are not perfect — if you believe a
              published report about content you submitted is inaccurate,
              contact us and we will review it.
            </Body>
            <Body>
              We reserve the right to reject, remove, or modify any submitted
              report that violates these terms, contains harmful content, or is
              otherwise inappropriate.
            </Body>

            <SectionHeading>Points and badges</SectionHeading>
            <Body>
              The points and badge system is designed to recognise community
              contribution. Points are awarded for submitting reports, receiving
              community confirmations, and other qualifying actions.
            </Body>
            <Body>
              Points and badges have no monetary value and cannot be exchanged
              for cash or transferred between accounts. We reserve the right to
              adjust the points system, badge thresholds, or rewards structure
              at any time.
            </Body>
            <Body>
              Contributor rewards, where offered, are at the sole discretion of
              The Root Access Network. No specific reward is guaranteed by
              participation in the platform.
            </Body>

            <SectionHeading>Community voting</SectionHeading>
            <Body>
              Registered users with a Guardian badge or above may confirm or
              dispute published reports. Voting is intended to reflect genuine
              community assessment of whether a report represents a real scam.
              Voting to manipulate point totals, gaming the confirmation system,
              or coordinated voting to promote or suppress specific reports is
              prohibited.
            </Body>

            <SectionHeading>Researcher API access</SectionHeading>
            <Body>
              API access is granted at our discretion following an application
              review. Approved researchers receive a personal API key and agree
              to:
            </Body>
            <BulletList
              items={[
                'Use the API only for legitimate security research, academic, journalistic, or public interest purposes',
                'Not redistribute raw API data commercially without prior written consent from TRAN',
                'Not use the API to build systems that profile or target individuals',
                'Comply with applicable data protection law in their jurisdiction',
              ]}
            />
            <Body>
              We reserve the right to revoke API access at any time without
              notice if these conditions are violated.
            </Body>

            <SectionHeading>Prohibited conduct</SectionHeading>
            <Body>You may not use UbuntuScamBank to:</Body>
            <BulletList
              items={[
                'Submit false, fabricated, or malicious reports intended to harm individuals or organisations',
                'Harass, threaten, or abuse other users',
                'Attempt to gain unauthorised access to the platform, other accounts, or our infrastructure',
                'Scrape or systematically harvest data from the platform outside of the authorised researcher API',
                'Use the platform for any unlawful purpose',
              ]}
            />
            <Body>
              Violations may result in account suspension or permanent removal.
            </Body>

            <SectionHeading>Content you submit</SectionHeading>
            <Body>
              By submitting a report or other content to UbuntuScamBank, you
              grant The Root Access Network a worldwide, royalty-free licence to
              store, process, display, and distribute that content as part of
              the platform&lsquo;s threat intelligence mission. This includes
              making the content available via the public feed, the researcher
              API, and future TRAN publications or research outputs.
            </Body>
            <Body>
              You retain ownership of content you submit. We do not claim
              ownership of your submissions.
            </Body>

            <SectionHeading>Our content</SectionHeading>
            <Body>
              The platform, its design, code, and original content are owned by
              The Root Access Network. You may not reproduce, redistribute, or
              create derivative works from the platform without our written
              permission.
            </Body>
            <Body>
              Published scam reports are made available under an open data ethos
              for public interest use. Researchers and journalists may reference
              and cite report content with attribution to UbuntuScamBank and The
              Root Access Network.
            </Body>

            <SectionHeading>Limitation of liability</SectionHeading>
            <Body>
              UbuntuScamBank is provided as-is. We do not guarantee that the
              platform will be available at all times, that reports will be
              accurate, or that the threat intelligence provided will prevent
              harm.
            </Body>
            <Body>
              To the fullest extent permitted by law, The Root Access Network
              shall not be liable for any direct, indirect, or consequential
              loss arising from your use of the platform or reliance on its
              content.
            </Body>
            <Body>
              Nothing in these terms limits liability for death or personal
              injury caused by negligence, or for fraud.
            </Body>

            <SectionHeading>Moderation and account termination</SectionHeading>
            <Body>
              We reserve the right to suspend or permanently remove accounts
              that violate these terms, submit abusive content, or otherwise
              harm the platform or its community. Where possible, we will notify
              you of moderation actions and the reason for them.
            </Body>
            <Body>
              You may delete your account at any time from your profile page or
              by contacting us.
            </Body>

            <SectionHeading>Changes to these terms</SectionHeading>
            <Body>
              We may update these terms from time to time. When we make
              significant changes, we will update the &ldquo;Last updated&rdquo;
              date at the top of this page. Continued use of the platform after
              changes constitutes acceptance of the updated terms.
            </Body>

            <SectionHeading>Contact</SectionHeading>
            <Body>The Root Access Network</Body>
            <Body>
              <ContactEmail />
            </Body>
            <Body>
              <a
                href='https://scambank.ubuntubridgeinitiatives.org'
                className='text-brand hover:text-brand-dark transition-colors duration-150'
              >
                scambank.ubuntubridgeinitiatives.org
              </a>
            </Body>
          </div>
        </Container>
      </main>

      <Footer />
    </div>
  );
}
