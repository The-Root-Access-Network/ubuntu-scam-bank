// src/components/ops/UserActions.tsx

'use client';

import { useState } from 'react';
import { IconLoader2 } from '@tabler/icons-react';

interface UserActionsProps {
  userId: string;
  username: string;
  email: string;
  isBanned: boolean;
  isModerator: boolean;
}

type ActionState = 'idle' | 'loading' | 'done' | 'error';

// ── Ban duration picker ───────────────────────────────────────────────────────

const BAN_DURATIONS = [
  { label: '1 day', value: '24h' },
  { label: '7 days', value: '168h' },
  { label: '30 days', value: '720h' },
  { label: '90 days', value: '2160h' },
];

// ── Component ─────────────────────────────────────────────────────────────────

export default function UserActions({
  userId,
  username,
  isBanned,
  isModerator,
}: UserActionsProps) {
  const [state, setState] = useState<ActionState>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showBanPicker, setShowBanPicker] = useState(false);
  const [showPermaBanConfirm, setShowPermaBanConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [done, setDone] = useState(false);

  // Moderators cannot be actioned
  if (isModerator) {
    return (
      <span className='text-caption text-fg-subtle italic'>Moderator</span>
    );
  }

  if (done) {
    return <span className='text-caption text-brand'>Done</span>;
  }

  async function callRoute(path: string, body?: object) {
    setState('loading');
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/ops/users/${userId}/${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMsg(data.error ?? 'Action failed.');
        setState('error');
        return;
      }
      setState('done');
      setDone(true);
    } catch {
      setErrorMsg('Network error. Please try again.');
      setState('error');
    }
  }

  const loading = state === 'loading';

  // ── Banned state — show unban only ────────────────────────────────────────
  if (isBanned) {
    return (
      <div className='flex items-center gap-2'>
        <span className='text-caption text-danger-text bg-danger-bg px-2 py-0.5 rounded-full'>
          Banned
        </span>
        <button
          type='button'
          disabled={loading}
          onClick={() => callRoute('unban')}
          className='text-caption text-brand hover:text-brand-dark transition-colors disabled:opacity-50 cursor-pointer'
        >
          {loading ? (
            <IconLoader2 size={12} className='animate-spin inline' />
          ) : (
            'Unban'
          )}
        </button>
        {state === 'error' && (
          <span className='text-caption text-danger-text'>{errorMsg}</span>
        )}
      </div>
    );
  }

  // ── Normal state ──────────────────────────────────────────────────────────
  return (
    <div className='flex flex-col gap-1.5'>
      <div className='flex items-center gap-3'>
        {/* Temp ban */}
        {!showBanPicker && !showPermaBanConfirm && !showDeleteConfirm && (
          <>
            <button
              type='button'
              onClick={() => setShowBanPicker(true)}
              className='text-caption text-warning-text hover:text-fg transition-colors cursor-pointer'
            >
              Temp ban
            </button>
            <button
              type='button'
              onClick={() => setShowPermaBanConfirm(true)}
              className='text-caption text-danger-text hover:text-fg transition-colors cursor-pointer'
            >
              Perm ban
            </button>
            <button
              type='button'
              onClick={() => setShowDeleteConfirm(true)}
              className='text-caption text-fg-muted hover:text-danger-text transition-colors cursor-pointer'
            >
              Delete
            </button>
          </>
        )}
      </div>

      {/* Temp ban duration picker */}
      {showBanPicker && (
        <div className='flex flex-wrap items-center gap-1.5 bg-warning-bg border border-warning rounded-md px-2.5 py-2'>
          <span className='text-caption text-warning-text mr-1'>Ban for:</span>
          {BAN_DURATIONS.map(({ label, value }) => (
            <button
              key={value}
              type='button'
              disabled={loading}
              onClick={() => callRoute('ban', { duration: value })}
              className='text-caption px-2 py-0.5 rounded border border-warning text-warning-text hover:bg-warning hover:text-white transition-colors cursor-pointer disabled:opacity-50'
            >
              {loading ? (
                <IconLoader2 size={11} className='animate-spin inline' />
              ) : (
                label
              )}
            </button>
          ))}
          <button
            type='button'
            onClick={() => setShowBanPicker(false)}
            className='text-caption text-fg-muted hover:text-fg ml-1 cursor-pointer'
          >
            Cancel
          </button>
        </div>
      )}

      {/* Permanent ban confirm */}
      {showPermaBanConfirm && (
        <div className='bg-danger-bg border border-danger rounded-md px-2.5 py-2'>
          <p className='text-caption text-danger-text mb-1.5'>
            This will permanently block <strong>{username}</strong> from signing
            in. Are you sure?
          </p>
          <div className='flex gap-2'>
            <button
              type='button'
              disabled={loading}
              onClick={() => callRoute('ban', { duration: '876000h' })}
              className='text-caption bg-danger text-white px-2.5 py-1 rounded cursor-pointer disabled:opacity-50'
            >
              {loading ? (
                <IconLoader2 size={11} className='animate-spin inline' />
              ) : (
                'Confirm permanent ban'
              )}
            </button>
            <button
              type='button'
              onClick={() => setShowPermaBanConfirm(false)}
              className='text-caption text-fg-muted hover:text-fg cursor-pointer'
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Delete account confirm */}
      {showDeleteConfirm && (
        <div className='bg-danger-bg border border-danger rounded-md px-2.5 py-2'>
          <p className='text-caption text-danger-text mb-1.5'>
            This will permanently delete <strong>{username}&apos;s</strong>{' '}
            account. Their contributions will remain anonymised. This cannot be
            undone.
          </p>
          <div className='flex gap-2'>
            <button
              type='button'
              disabled={loading}
              onClick={() => callRoute('delete')}
              className='text-caption bg-danger text-white px-2.5 py-1 rounded cursor-pointer disabled:opacity-50'
            >
              {loading ? (
                <IconLoader2 size={11} className='animate-spin inline' />
              ) : (
                'Delete account'
              )}
            </button>
            <button
              type='button'
              onClick={() => setShowDeleteConfirm(false)}
              className='text-caption text-fg-muted hover:text-fg cursor-pointer'
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {state === 'error' && (
        <p className='text-caption text-danger-text'>{errorMsg}</p>
      )}
    </div>
  );
}
