// src/components/layout/ShieldScoreCard.tsx

/**
 * ShieldScoreCard is a client component because it includes the auth prompt and progress bar animation, both of which require interactivity and state.
 * 
 * It receives the current user's profile as a prop from the parent page, which
 * is a server component. This way we avoid any client-side fetching or waterfall
 * data loading — all data is ready on first render.
 * 
 * The progress bar animates smoothly to the new width whenever the points or badge change, creating a dynamic and rewarding user experience as they contribute more.
 * 
 * The badge thresholds and next tier labels are defined in constants at the top of the file, making it easy to adjust the gamification mechanics without digging through the rendering logic.
 */

'use client';

import { useState } from 'react';
import AuthModal from '@/components/auth/AuthModal';
import { BADGE_META } from '@/lib/utils';

interface UserProfile {
  username: string;
  display_name: string | null;
  points: number;
  badge: string;
}

// Mirrors the updated badge thresholds from DEV_NOTES
const TIER_BOUNDS = [
  { badge: 'watcher', min: 0, next: 2500 },
  { badge: 'guardian', min: 2500, next: 5000 },
  { badge: 'sentinel', min: 5000, next: 10000 },
  { badge: 'elite_sentinel', min: 10000, next: 20000 },
  { badge: 'sage', min: 20000, next: null },
];

const NEXT_TIER_LABEL: Record<string, string> = {
  watcher: 'Guardian',
  guardian: 'Sentinel',
  sentinel: 'Elite Sentinel',
  elite_sentinel: 'Sage',
};

function getProgress(points: number, badge: string) {
  const tier = TIER_BOUNDS.find((t) => t.badge === badge) ?? TIER_BOUNDS[0];
  if (!tier.next) return { pct: 100, label: 'Maximum tier — Sage' };
  const pct = Math.min(
    100,
    ((points - tier.min) / (tier.next - tier.min)) * 100,
  );
  const ptsLeft = tier.next - points;
  return {
    pct,
    label: `${ptsLeft.toLocaleString()} pts to ${NEXT_TIER_LABEL[badge] ?? 'next tier'}`,
  };
}

export default function ShieldScoreCard({
  user,
}: {
  user: UserProfile | null;
}) {
  const [showModal, setShowModal] = useState(false);

  // ── Unauthenticated state ──────────────────────────────────────────────────
  if (!user) {
    return (
      <div className='bg-canvas border border-stroke-faint rounded-lg p-5'>
        <p className='text-label text-fg-muted uppercase tracking-label mb-3'>
          Your shield score
        </p>
        <div className='text-center py-3'>
          <p className='text-body-sm text-fg-muted leading-relaxed'>
            Sign in to track your score and see how you rank against other
            contributors.
          </p>
          <button
            type='button'
            onClick={() => setShowModal(true)}
            className='mt-3 inline-flex items-center gap-2 bg-brand text-white px-4 py-2 rounded-md text-body-xs font-medium hover:bg-brand-dark transition-colors duration-150 cursor-pointer'
          >
            Sign in
          </button>
        </div>
        {showModal && <AuthModal onClose={() => setShowModal(false)} />}
      </div>
    );
  }

  // ── Authenticated state ────────────────────────────────────────────────────
  const badge = BADGE_META[user.badge] ?? BADGE_META.watcher;
  const { pct, label } = getProgress(user.points, user.badge);
  const name = user.display_name ?? user.username;

  return (
    <div className='bg-canvas border border-stroke-faint rounded-lg p-5'>
      <p className='text-label text-fg-muted uppercase tracking-label mb-3'>
        Your shield score
      </p>
      <div className='text-center'>
        <div className='text-title font-medium text-brand leading-none mb-1.5'>
          {user.points.toLocaleString()}
        </div>
        <p className='text-body-xs font-medium text-fg-muted mb-2'>{name}</p>
        <span
          className={`inline-block text-caption font-medium px-2.5 py-0.5 rounded-full mb-4 ${badge.classes}`}
        >
          {badge.label}
        </span>

        {/* Progress bar to next tier */}
        <div className='w-full bg-canvas-subtle rounded-full h-1.5 overflow-hidden mb-1.5'>
          <div
            className='h-full bg-brand rounded-full transition-all duration-500'
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className='text-caption text-fg-subtle'>{label}</p>
      </div>
    </div>
  );
}
