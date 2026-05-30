// src/components/layout/Sidebar.tsx

/**
 * Sidebar is a server component that receives all necessary data as props from its parent page. This allows it to render the leaderboard and shield score without any client-side fetching, ensuring fast load times and a seamless user experience.
 * 
 * The leaderboard section displays the top contributors with their rank, avatar, name, badge, country, and points. The avatar colors are generated deterministically based on the username to maintain consistency across renders without needing additional data.
 * 
 * The shield score card is a client component nested within the sidebar. It receives the current user's profile as a prop and handles the display of their points and badge, as well as the progress towards the next tier. This separation allows for dynamic updates to the shield score without affecting the static leaderboard content.
 * 
 * The researcher access section provides information and a call-to-action for users interested in accessing the API, encouraging engagement from the security research community.
 */

import Link from 'next/link';
import { IconCode, IconTrophy } from '@tabler/icons-react';
import { BADGE_META, getInitials } from '@/lib/utils';
import ShieldScoreCard from '@/components/layout/ShieldScoreCard';
import type { Tables } from '@/types/database';

type LeaderboardUser = Pick<
  Tables<'users'>,
  'id' | 'username' | 'display_name' | 'points' | 'badge' | 'country_code'
>;

type CurrentUser = Pick<
  Tables<'users'>,
  'username' | 'display_name' | 'points' | 'badge'
> | null;

// Deterministic avatar colour derived from first character of username.
// Keeps avatars consistent across renders without needing stored preferences.
const AVATAR_PALETTE = [
  { bg: '#E1F5EE', fg: '#085041' },
  { bg: '#E6F1FB', fg: '#0C447C' },
  { bg: '#FAEEDA', fg: '#633806' },
  { bg: '#FAECE7', fg: '#712B13' },
  { bg: '#EEEDFE', fg: '#3C3489' },
  { bg: '#F1EFE8', fg: '#5F5E5A' },
];

function avatarStyle(username: string) {
  return AVATAR_PALETTE[username.charCodeAt(0) % AVATAR_PALETTE.length];
}

// function initials(username: string) {
//   return username.slice(0, 2).toUpperCase();
// }

// Rank number colours matching the mockup
const RANK_COLOR: Record<number, string> = {
  1: '#BA7517', // gold
  2: '#888780', // silver
  3: '#993C1D', // bronze
};

export default function Sidebar({
  topUsers,
  currentUser,
}: {
  topUsers: LeaderboardUser[];
  currentUser: CurrentUser;
}) {
  return (
    <>
      {/* ── Leaderboard ──────────────────────────────────────────────── */}
      <div className='bg-canvas border border-stroke-faint rounded-lg p-5'>
        {/* Title */}
        <div className='flex items-center gap-1.5 mb-3.5'>
          <IconTrophy size={16} className='text-fg-muted' aria-hidden='true' />
          <p className='text-label text-fg-muted uppercase tracking-label'>
            Leaderboard
          </p>
        </div>

        {/* Tab strip — UK/NG filtering is Phase 2; Global is active for MVP */}
        <div className='flex gap-1 mb-3'>
          {['Global', 'UK', 'NG'].map((tab) => (
            <span
              key={tab}
              className={[
                'text-body-xs px-3 py-1 rounded-md border',
                tab === 'Global'
                  ? 'bg-canvas-subtle border-stroke text-fg'
                  : 'border-transparent text-fg-muted cursor-not-allowed opacity-60',
              ].join(' ')}
            >
              {tab}
            </span>
          ))}
        </div>

        {/* Entries */}
        {topUsers.length === 0 ? (
          <p className='text-body-sm text-fg-muted text-center py-6'>
            No contributors yet.
          </p>
        ) : (
          <div>
            {topUsers.map((user, i) => {
              const rank = i + 1;
              const av = avatarStyle(user.username);
              const badge = BADGE_META[user.badge] ?? BADGE_META.watcher;

              return (
                <div
                  key={user.id}
                  className={[
                    'flex items-center gap-2.5 py-2',
                    i < topUsers.length - 1
                      ? 'border-b border-stroke-faint'
                      : '',
                  ].join(' ')}
                >
                  {/* Rank */}
                  <span
                    className='text-[13px] font-medium w-5 text-center shrink-0'
                    style={{ color: RANK_COLOR[rank] ?? 'var(--fg-muted)' }}
                  >
                    {rank}
                  </span>

                  {/* Avatar */}
                  <div
                    className='w-7.5 h-7.5 rounded-full flex items-center justify-center text-caption font-medium shrink-0'
                    style={{ background: av.bg, color: av.fg }}
                  >
                    {getInitials(user.display_name ?? null, user.username)}
                  </div>

                  {/* Name + sub */}
                  <div className='flex-1 min-w-0'>
                    <p className='text-body-sm font-medium text-fg truncate'>
                      {user.display_name ?? user.username ?? 'Unnamed'}
                    </p>
                    <p className='text-caption text-fg-muted truncate'>
                      {badge.label}
                      {user.country_code ? ` · ${user.country_code}` : ''}
                    </p>
                  </div>

                  {/* Points */}
                  <span className='text-body-xs font-medium text-brand shrink-0'>
                    {user.points.toLocaleString()}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* Now a Link, not a button */}
        <Link
          href='/leaderboard'
          className='block w-full mt-3 text-body-xs font-medium px-3.5 py-1.5 border border-stroke rounded-md text-center text-fg hover:bg-canvas-subtle transition-colors duration-150 cursor-pointer'
        >
          View full leaderboard ↗
        </Link>
      </div>

      {/* ── Shield score — client island ──────────────────────────────── */}
      <ShieldScoreCard user={currentUser} />

      {/* ── Researcher access ─────────────────────────────────────────── */}
      <div
        className='bg-canvas border border-stroke-faint rounded-lg p-5'
        id='researchers'
      >
        <div className='flex items-center gap-1.5 mb-2'>
          <IconCode size={16} className='text-fg-muted' aria-hidden='true' />
          <p className='text-label text-fg-muted uppercase tracking-label'>
            Researcher access
          </p>
        </div>
        <p className='text-body-sm text-fg-muted leading-relaxed mb-3'>
          Free API access for verified security researchers, NGOs, and
          academics.
        </p>
        <div className='bg-canvas-subtle border border-stroke-faint rounded-md px-3 py-2.5 font-mono text-caption text-fg-muted mb-3 overflow-x-auto'>
          GET /api/v1/reports?type=phishing&amp;country=NG&amp;limit=50
        </div>
        <Link
          href='researchers/apply'
          className='w-full block text-body-xs font-medium px-3.5 py-1.5 border border-stroke rounded-md text-center text-fg hover:bg-canvas-subtle transition-colors duration-150'
        >
          Request API key ↗
        </Link>
      </div>
    </>
  );
}
