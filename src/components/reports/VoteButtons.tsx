// src/components/reports/VoteButtons.tsx

'use client';

import { useState } from 'react';
import { IconCheck, IconX, IconLoader2 } from '@tabler/icons-react';

interface VoteButtonsProps {
  reportId: string;
  confirmCount: number;
  disputeCount: number;
  isOwnReport: boolean; // passed from server — prevents voting on own report
  isSignedIn: boolean; // passed from server — shows sign-in prompt if false
}

type VoteState = 'idle' | 'loading' | 'confirmed' | 'disputed' | 'error';

export default function VoteButtons({
  reportId,
  confirmCount,
  disputeCount,
  isOwnReport,
  isSignedIn,
}: VoteButtonsProps) {
  const [state, setState] = useState<VoteState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [localConfirm, setLocalConfirm] = useState(confirmCount);
  const [localDispute, setLocalDispute] = useState(disputeCount);

  const hasVoted = state === 'confirmed' || state === 'disputed';

  async function castVote(vote: 'confirm' | 'dispute') {
    if (hasVoted || state === 'loading') return;

    setState('loading');
    setError(null);

    const res = await fetch(`/api/reports/${reportId}/vote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vote }),
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      setState('error');
      setError(data.error ?? 'Vote failed. Please try again.');
      return;
    }

    // Optimistic count update — trigger already updated DB counts server-side
    if (vote === 'confirm') {
      setState('confirmed');
      setLocalConfirm((n) => n + 1);
    } else {
      setState('disputed');
      setLocalDispute((n) => n + 1);
    }
  }

  // Not signed in — passive prompt, no buttons
  if (!isSignedIn) {
    return (
      <div className='border-t border-stroke-faint pt-4 mb-4'>
        <p className='text-body-xs text-fg-muted'>
          Sign in to confirm or dispute this report.
        </p>
      </div>
    );
  }

  // Own report — read-only counts, no buttons
  if (isOwnReport) {
    return (
      <div className='border-t border-stroke-faint pt-4 mb-4'>
        <p className='text-body-xs text-fg-muted'>
          You submitted this report.
          <span className='ml-3 text-fg-subtle'>
            {localConfirm} confirmed · {localDispute} disputed
          </span>
        </p>
      </div>
    );
  }

  return (
    <div className='border-t border-stroke-faint pt-4 mb-4'>
      <p className='text-body-sm text-fg-muted mb-3'>
        Have you seen this scam? Help others by confirming or disputing it.
      </p>

      <div className='flex items-center gap-2.5'>
        {/* Confirm button */}
        <button
          type='button'
          onClick={() => castVote('confirm')}
          disabled={hasVoted || state === 'loading'}
          className={[
            'inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-body-xs font-medium',
            'border transition-all duration-150',
            state === 'confirmed'
              ? 'bg-brand-light border-brand text-brand-dark'
              : 'bg-canvas border-stroke text-fg hover:border-brand hover:bg-brand-light hover:text-brand-dark',
            hasVoted || state === 'loading'
              ? 'cursor-not-allowed opacity-70'
              : 'cursor-pointer',
          ].join(' ')}
        >
          {state === 'loading' ? (
            <IconLoader2
              size={14}
              className='animate-spin'
              aria-hidden='true'
            />
          ) : (
            <IconCheck size={14} aria-hidden='true' />
          )}
          Confirm
          <span className='text-caption opacity-75 ml-0.5'>
            ({localConfirm})
          </span>
        </button>

        {/* Dispute button */}
        <button
          type='button'
          onClick={() => castVote('dispute')}
          disabled={hasVoted || state === 'loading'}
          className={[
            'inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-body-xs font-medium',
            'border transition-all duration-150',
            state === 'disputed'
              ? 'bg-danger-bg border-danger text-danger-text'
              : 'bg-canvas border-stroke text-fg hover:border-danger hover:bg-danger-bg hover:text-danger-text',
            hasVoted || state === 'loading'
              ? 'cursor-not-allowed opacity-70'
              : 'cursor-pointer',
          ].join(' ')}
        >
          <IconX size={14} aria-hidden='true' />
          Dispute
          <span className='text-caption opacity-75 ml-0.5'>
            ({localDispute})
          </span>
        </button>
      </div>

      {/* Voted confirmation message */}
      {state === 'confirmed' && (
        <p className='text-body-xs font-medium text-brand mt-2.5'>
          Thanks — you confirmed this report. Your vote helps protect others.
        </p>
      )}
      {state === 'disputed' && (
        <p className='text-body-xs font-medium text-fg-muted mt-2.5'>
          Thanks — you disputed this report. Our moderators will review it.
        </p>
      )}

      {/* Error */}
      {state === 'error' && error && (
        <p className='text-body-xs text-danger-text mt-2.5'>{error}</p>
      )}
    </div>
  );
}
