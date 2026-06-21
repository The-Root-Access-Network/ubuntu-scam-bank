// src/app/ops/layout.tsx

/**
 * Ops layout — second security layer after middleware.
 * Layer 2 of 5 security checks: independently verifies session AND is_moderator = true.
 * Redirects to / if either check fails — never trusts middleware alone.
 *
 * Renders a stripped-down two-column layout: fixed sidebar + scrollable content.
 * Deliberately distinct from the public UI — internal tool aesthetic.
 */

import { redirect } from 'next/navigation';
import Link from 'next/link';
import { IconShieldCheck, IconUsers, IconFileText, IconLayoutDashboard } from '@tabler/icons-react';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: { default: 'Ops', template: '%s | Ops — UbuntuScamBank' },
};

const NAV_LINKS = [
  { href: '/ops', label: 'Overview', icon: IconLayoutDashboard, exact: true },
  { href: '/ops/users', label: 'Users', icon: IconUsers, exact: false },
  {
    href: '/ops/applications',
    label: 'Applications',
    icon: IconFileText,
    exact: false,
  },
];

export default async function OpsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // ── Auth check ────────────────────────────────────────────────────────────
  const authClient = await createClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  if (!user) redirect('/');

  // ── Moderator check ───────────────────────────────────────────────────────
  let admin;
  try {
    admin = createAdminClient();
  } catch {
    redirect('/');
  }

  const { data: profile } = await admin
    .from('users')
    .select('is_moderator, username')
    .eq('id', user.id)
    .single();

  if (!profile?.is_moderator) redirect('/');

  return (
    <div className='min-h-dvh bg-canvas-subtle flex'>
      {/* ── Sidebar ──────────────────────────────────────────────────────── */}
      <aside className='w-52 shrink-0 bg-canvas border-r border-stroke-faint flex flex-col'>
        {/* Brand */}
        <div className='px-4 py-4 border-b border-stroke-faint'>
          <div className='flex items-center gap-2 mb-0.5'>
            <div className='w-6 h-6 bg-brand rounded flex items-center justify-center shrink-0'>
              <IconShieldCheck size={14} color='white' strokeWidth={2.5} aria-hidden='true' />
            </div>
            <span className='text-body-sm font-bold text-fg'>UbuntuScamBank</span>
          </div>
          <p className='text-caption text-fg-subtle ml-8'>Ops console</p>
        </div>

        {/* Nav */}
        <nav className='flex-1 py-3 px-2'>
          <ul className='flex flex-col gap-0.5 list-none'>
            {NAV_LINKS.map(({ href, label, icon: Icon }) => (
              <li key={href}>
                <Link
                  href={href}
                  className='flex items-center gap-2.5 px-3 py-2 rounded-md text-body-xs text-fg-muted hover:bg-canvas-subtle hover:text-fg transition-colors duration-150'
                >
                  <Icon size={15} aria-hidden='true' />
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* Footer */}
        <div className='px-4 py-3 border-t border-stroke-faint'>
          <p className='text-caption-sm text-fg-subtle truncate'>{profile.username}</p>
          <Link
            href='/'
            className='text-caption text-fg-muted hover:text-fg transition-colors duration-150'
          >
            ← Back to site
          </Link>
        </div>
      </aside>

      {/* ── Main content ─────────────────────────────────────────────────── */}
      <main className='flex-1 overflow-auto'>
        {children}
      </main>
    </div>
  );
}