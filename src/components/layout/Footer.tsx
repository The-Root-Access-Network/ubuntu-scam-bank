// src/components/layout/Footer.tsx

import Link from 'next/link';
import { IconShieldCheck } from '@tabler/icons-react';
import Container from './Container';

interface LinkItem {
  label: string;
  href: string;
  external?: boolean;
}

interface FooterSection {
  heading: string;
  links: LinkItem[];
}

const FOOTER_LINKS: FooterSection[] = [
  {
    heading: 'Platform',
    links: [
      { label: 'Report a scam', href: '/#report' },
      { label: 'Browse feed', href: '/#feed' },
      { label: 'Leaderboard', href: '/leaderboard' },
    ],
  },
  {
    heading: 'Researchers',
    links: [
      { label: 'Apply for API access', href: '/researchers/apply' },
      // { label: 'API reference', href: '/researchers/apply#api' },
    ],
  },
  {
    heading: 'Organisation',
    links: [
      { label: 'Contact', href: '/feedback' },
      {
        label: 'Ubuntu Bridge Initiative',
        href: 'https://ubuntubridgeinitiatives.org',
        external: true,
      },
      {
        label: 'The Root Access Network',
        href: 'https://therootaccessnetwork.com',
        external: true,
      },
      { label: 'Terms', href: '#' },
      { label: 'Privacy', href: '#' },
    ],
  },
];

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className='border-t border-stroke-faint bg-canvas mt-auto'>
      <Container className='py-10 md:py-12'>
        {/* Main grid */}
        <div className='grid grid-cols-2 md:grid-cols-[2fr_1fr_1fr_1fr] gap-8 md:gap-6'>
          {/* Brand column — full width on mobile */}
          <div className='col-span-2 md:col-span-1'>
            <Link
              href='/'
              className='inline-flex items-center gap-2 hover:opacity-80 transition-opacity duration-150 mb-3'
            >
              <div className='w-6 h-6 bg-brand rounded flex items-center justify-center shrink-0'>
                <IconShieldCheck
                  size={14}
                  color='white'
                  strokeWidth={2.5}
                  aria-hidden='true'
                />
              </div>
              <span className='text-[16px] font-bold text-fg'>
                UbuntuScamBank
              </span>
            </Link>
            <p className='text-body-xs text-fg-muted leading-relaxed max-w-56'>
              A community-powered scam intelligence platform by the Ubuntu
              Bridge Initiative. Report scams. Protect others.
            </p>
          </div>

          {/* Link columns */}
          {FOOTER_LINKS.map(({ heading, links }) => (
            <div key={heading}>
              <p className='text-caption text-fg-muted uppercase tracking-label mb-3'>
                {heading}
              </p>
              <ul className='flex flex-col gap-2.5 list-none p-0 m-0'>
                {links.map(({ label, href, external }) => (
                  <li key={label}>
                    {external ? (
                      <a
                        href={href}
                        target='_blank'
                        rel='noopener noreferrer'
                        className='text-body-xs text-fg-muted hover:text-fg transition-colors duration-150'
                      >
                        {label}
                      </a>
                    ) : (
                      <Link
                        href={href}
                        className='text-body-xs text-fg-muted hover:text-fg transition-colors duration-150'
                      >
                        {label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className='border-t border-stroke-faint mt-8 pt-5 flex flex-col sm:flex-row items-center justify-between gap-2'>
          <p className='text-caption text-fg-subtle'>
            © {year} The Root Access Network. Built under the Ubuntu Bridge
            Initiative.
          </p>
          <p className='text-caption text-fg-subtle'>
            Open data. Community first.
          </p>
        </div>
      </Container>
    </footer>
  );
}
