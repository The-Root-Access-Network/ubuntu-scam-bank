// src/app/(public)/privacy/page.tsx

import Nav from '@/components/layout/Nav';
import Container from '@/components/layout/Container';
import Footer from '@/components/layout/Footer';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description:
    'How The Root Access Network collects, uses, and protects your data on UbuntuScamBank.',
};

// ── Shared prose components ───────────────────────────────────────────────────
// Defined inline — used only in this file. If a terms component is extracted
// later, these would move to a shared location.

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

export default function PrivacyPage() {
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
              Privacy Policy
            </h1>
            <p className='text-body-xs text-fg-subtle'>
              Last updated: July 2026
            </p>
          </div>

          {/* Content */}
          <div>
            <SectionHeading>Who we are</SectionHeading>
            <Body>
              UbuntuScamBank is operated by The Root Access Network
              (&ldquo;TRAN&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;,
              &ldquo;our&rdquo;), a cybersecurity education organisation and the
              parent body of the Ubuntu Bridge Initiative. We are based in the
              United Kingdom.
            </Body>
            <Body>
              If you have questions about this policy, contact us at{' '}
              <ContactEmail />.
            </Body>

            <SectionHeading>Who this policy applies to</SectionHeading>
            <Body>
              This policy applies to anyone who uses UbuntuScamBank at{' '}
              <a
                href='https://scambank.ubuntubridgeinitiatives.org'
                className='text-brand hover:text-brand-dark transition-colors duration-150'
              >
                scambank.ubuntubridgeinitiatives.org
              </a>{' '}
              — whether you submit reports, browse the public feed, use the
              researcher API, or simply visit the site.
            </Body>
            <Body>
              You must be at least 16 years old to create an account. By
              registering, you confirm that you meet this requirement.
            </Body>

            <SectionHeading>What information we collect</SectionHeading>

            <h3 className='text-body-sm font-medium text-fg mb-2 mt-5'>
              Information you give us directly
            </h3>
            <Body>
              When you create an account, we collect your email address and a
              username. You may optionally provide a display name, biography,
              and country. If you apply for researcher API access, we collect
              your name, organisation, role, and intended use case.
            </Body>
            <Body>
              When you submit a scam report, we collect the content of the
              report — which may include text you paste, files you upload, and
              contextual notes you provide. We also collect the scam type,
              severity rating, and country you select.
            </Body>
            <Body>
              When you use the feedback form, we collect your name, email, role,
              and message.
            </Body>

            <h3 className='text-body-sm font-medium text-fg mb-2 mt-5'>
              Information collected automatically
            </h3>
            <Body>
              When you sign in with Google, we receive your name and email
              address from Google as part of the authentication process. We do
              not receive your Google password.
            </Body>
            <Body>
              We collect information about how you interact with the platform,
              including which reports you view and vote on. We do not use
              third-party analytics or advertising trackers.
            </Body>

            <h3 className='text-body-sm font-medium text-fg mb-2 mt-5'>
              Information in submitted reports
            </h3>
            <Body>
              Scam reports often contain information about scammers — phone
              numbers, email addresses, domain names, URLs, and sender names.
              Our AI triage system is designed to extract this threat
              intelligence and strip personal information about the victim
              before storing the report. However, automated stripping is not
              perfect. If you include your own personal information in a
              submission (for example, your name in a message you paste), it may
              be stored.
            </Body>
            <Body>
              We recommend reviewing what you submit before sending. You can use
              the optional context note field to describe what happened in your
              own words rather than pasting content verbatim.
            </Body>

            <SectionHeading>How we use your information</SectionHeading>
            <Body>We use your information to:</Body>
            <BulletList
              items={[
                'Operate and improve the platform',
                'Authenticate your account and maintain your session',
                'Calculate and display your points and badge tier',
                'Process and publish scam reports',
                'Respond to feedback and researcher applications',
                'Send the fortnightly community digest email (you can unsubscribe at any time)',
                'Deliver your researcher API key if your application is approved',
                'Take moderation actions where necessary (including suspending or removing accounts that violate our terms)',
              ]}
            />
            <Body>
              We do not sell your data. We do not use your data for advertising.
              We do not share your data with third parties except as described
              below.
            </Body>

            <SectionHeading>Who we share your information with</SectionHeading>
            <Body>
              <strong className='font-medium text-fg'>Supabase</strong> — our
              database and authentication provider. Your account data and
              submitted reports are stored on Supabase&lsquo;s infrastructure.
              Supabase is SOC 2 Type II certified and stores data in the
              European Union.
            </Body>
            <Body>
              <strong className='font-medium text-fg'>Anthropic</strong> — when
              you submit a report, the content is sent to Anthropic&lsquo;s
              Claude API for AI triage analysis. Anthropic processes this data
              as a service provider and does not use it to train their models by
              default. See Anthropic&lsquo;s privacy policy at{' '}
              <a
                href='https://anthropic.com/privacy'
                target='_blank'
                rel='noopener noreferrer'
                className='text-brand hover:text-brand-dark transition-colors duration-150'
              >
                anthropic.com/privacy
              </a>
              .
            </Body>
            <Body>
              <strong className='font-medium text-fg'>Resend</strong> — we use
              Resend to send transactional emails (API key delivery, account
              notifications) and the community digest. Resend stores your email
              address as part of the mailing list. You can unsubscribe from the
              digest at any time using the link in any digest email.
            </Body>
            <Body>
              <strong className='font-medium text-fg'>Vercel</strong> — the
              platform is hosted on Vercel&lsquo;s infrastructure. Vercel may
              process request metadata (IP addresses, request logs) as part of
              serving the application.
            </Body>
            <Body>
              We do not share your data with any other third parties. We do not
              sell or rent your information.
            </Body>

            <SectionHeading>Your rights</SectionHeading>
            <Body>
              Under UK data protection law (UK GDPR), you have the right to:
            </Body>
            <BulletList
              items={[
                'Access the personal data we hold about you',
                'Correct inaccurate data — you can update your display name, bio, and country from your profile page at any time',
                <>
                  Delete your account and associated personal data — contact us
                  at <ContactEmail /> and we will process your request within 30
                  days. Note that scam reports you have submitted will remain in
                  the platform anonymised (your name and account will be
                  removed, but the threat intelligence data remains to protect
                  others)
                </>,
                'Object to or restrict processing of your data in certain circumstances',
                'Withdraw consent for the digest email by unsubscribing at any time',
              ]}
            />
            <Body>
              To exercise any of these rights, contact us at <ContactEmail />.
              We will respond within 30 days.
            </Body>
            <Body>
              If you are unhappy with how we handle your data, you have the
              right to lodge a complaint with the UK Information
              Commissioner&lsquo;s Office (ICO) at{' '}
              <a
                href='https://ico.org.uk'
                target='_blank'
                rel='noopener noreferrer'
                className='text-brand hover:text-brand-dark transition-colors duration-150'
              >
                ico.org.uk
              </a>
              .
            </Body>

            <SectionHeading>How long we keep your data</SectionHeading>
            <Body>
              We keep your account data for as long as your account is active.
              If you request deletion, we will remove your personal data within
              30 days.
            </Body>
            <Body>
              Submitted scam reports are retained indefinitely as threat
              intelligence data. When an account is deleted, the reports are
              anonymised — the link between the report and your identity is
              removed.
            </Body>
            <Body>
              Feedback form submissions are retained for 12 months and then
              deleted.
            </Body>

            <SectionHeading>Cookies and storage</SectionHeading>
            <Body>
              We use cookies only for authentication — to maintain your
              signed-in session. We do not use advertising cookies, tracking
              pixels, or any third-party analytics cookies. You can clear
              cookies at any time through your browser settings, which will sign
              you out of the platform.
            </Body>

            <SectionHeading>Changes to this policy</SectionHeading>
            <Body>
              We may update this policy from time to time. When we make
              significant changes, we will update the &ldquo;Last updated&rdquo;
              date at the top of this page. Continued use of the platform after
              changes constitutes acceptance of the updated policy.
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
