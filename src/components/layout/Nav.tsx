// src/components/layout/Nav.tsx

import { IconShieldCheck } from '@tabler/icons-react';
import Link from 'next/link';
import Container from './Container';
import NavAuthButton from './NavAuthButton';

// Nav is a server component. NavAuthButton is a client island — only that
// slice of the nav re-renders when auth state changes.
export default function Nav() {
  return (
    // Border and bg span full viewport width — only the content inside is constrained
    <nav
      className='border-b border-stroke-faint bg-canvas'
      aria-label='Main navigation'
    >
      <Container className='py-3.5 flex items-center justify-between'>
        {/* Logo */}
        <div className='flex items-center gap-2'>
          <div className='w-7 h-7 bg-brand rounded-lg flex items-center justify-center shrink-0'>
            <IconShieldCheck
              size={18}
              color='white'
              strokeWidth={2.5}
              aria-hidden='true'
            />
          </div>
          <span className='text-[16px] font-bold text-fg'>UbuntuScamBank</span>
          {/* Pill hidden on mobile — too cramped alongside the logo text */}
          <span className='hidden md:inline text-[11px] font-medium px-2 py-0.5 bg-brand-light text-brand-dark rounded-full'>
            by Ubuntu Bridge
          </span>
        </div>

        {/* Right side */}
        <div className='flex items-center gap-3 md:gap-5'>
          {/* Nav links — hidden on mobile, visible on tablet+ */}
          <div className='hidden md:flex items-center gap-5 text-body-xs text-fg-muted'>
            <Link
              href='#feed'
              className='hover:text-fg transition-colors duration-150'
            >
              Feed
            </Link>
            <Link
              href='#leaderboard'
              className='hover:text-fg transition-colors duration-150'
            >
              Leaderboard
            </Link>
            <Link
              href='#researchers'
              className='hover:text-fg transition-colors duration-150'
            >
              For researchers
            </Link>
          </div>
          {/* Client island (Sign in always visible) — auth state lives here, rest of Nav is static */}
          <NavAuthButton />
        </div>
      </Container>
    </nav>
  );
}
