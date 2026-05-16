// src/components/layout/Nav.tsx

import { IconShieldCheck } from '@tabler/icons-react'
import Link from 'next/link'

export default function Nav() {
  return (
    <nav
      className="flex items-center justify-between px-5 py-3.5 border-b border-stroke-faint bg-canvas"
      aria-label="Main navigation"
    >
      {/* Logo */}
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 bg-brand rounded-lg flex items-center justify-center shrink-0">
          <IconShieldCheck size={15} color="white" strokeWidth={2.5} aria-hidden="true" />
        </div>
        <span className="text-[15px] font-medium text-fg">ScamVault</span>
        <span className="text-[11px] px-2 py-0.5 bg-brand-light text-brand-dark rounded-full">
          by Ubuntu Bridge
        </span>
      </div>

      {/* Nav links + Sign in */}
      <div className="flex items-center gap-5 text-[13px] text-fg-muted">
        <Link
          href="#feed"
          className="hover:text-fg transition-colors duration-150"
        >
          Feed
        </Link>
        <Link
          href="#leaderboard"
          className="hover:text-fg transition-colors duration-150"
        >
          Leaderboard
        </Link>
        <Link
          href="#researchers"
          className="hover:text-fg transition-colors duration-150"
        >
          For researchers
        </Link>
        <button
          type="button"
          className="text-[12px] px-3.5 py-1.5 border border-stroke rounded-md bg-transparent text-fg hover:bg-canvas-subtle transition-colors duration-150 cursor-pointer"
        >
          Sign in
        </button>
      </div>
    </nav>
  )
}
