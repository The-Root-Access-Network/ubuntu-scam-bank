// src/components/ops/UserActions.tsx

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { IconLoader2, IconX } from '@tabler/icons-react';

interface UserActionsProps {
  userId: string;
  username: string;
  isBanned: boolean;
  isModerator: boolean;
}

type ModalType = 'temp-ban' | 'perm-ban' | 'delete' | null;
type ActionState = 'idle' | 'loading' | 'error';

const BAN_DURATIONS = [
  { label: '1 day', value: '24h' },
  { label: '7 days', value: '168h' },
  { label: '30 days', value: '720h' },
  { label: '90 days', value: '2160h' },
];

export default function UserActions({
  userId,
  username,
  isBanned,
  isModerator,
}: UserActionsProps) {
  const router = useRouter();
  const [modal, setModal] = useState<ModalType>(null);
  const [state, setState] = useState<ActionState>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  if (isModerator) {
    return (
      <span className='text-caption text-fg-subtle italic px-2 py-1 border border-stroke-faint rounded-md bg-canvas-subtle'>
        Moderator
      </span>
    );
  }

  if (done) {
    return (
      <span className='text-caption text-brand px-2 py-1 border border-brand/30 rounded-md bg-brand-light'>
        Done ✓
      </span>
    );
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
      setModal(null);
      setState('idle');
      setDone(true);
      router.refresh();
    } catch {
      setErrorMsg('Network error. Please try again.');
      setState('error');
    }
  }

  const loading = state === 'loading';

  return (
    <>
      {/* ── Trigger buttons — vertical stack ──────────────────────────── */}
      {isBanned ? (
        <div className='flex flex-col items-center gap-1.5'>
          <span className='text-caption-sm font-medium text-danger-text bg-danger-bg border border-danger/30 px-2 py-0.5 rounded-full'>
            Banned
          </span>
          <button
            type='button'
            onClick={() => callRoute('unban')}
            disabled={loading}
            className='text-caption-sm px-2.5 py-1 rounded-md border border-brand/40 text-brand bg-brand-light hover:bg-brand hover:text-white transition-colors duration-150 cursor-pointer disabled:opacity-50'
          >
            {loading ? (
              <IconLoader2 size={11} className='animate-spin inline' />
            ) : (
              'Unban'
            )}
          </button>
        </div>
      ) : (
        <div className='flex flex-col items-center gap-1.5'>
          <button
            type='button'
            onClick={() => setModal('temp-ban')}
            className='w-full text-caption-sm font-medium px-2.5 py-1 rounded-md border border-warning/40 text-warning-text bg-warning-bg hover:bg-warning hover:text-white hover:border-warning transition-colors duration-150 cursor-pointer'
          >
            Temp ban
          </button>
          <button
            type='button'
            onClick={() => setModal('perm-ban')}
            className='w-full text-caption-sm font-medium px-2.5 py-1 rounded-md border border-danger/40 text-danger-text bg-danger-bg hover:bg-danger hover:text-white hover:border-danger transition-colors duration-150 cursor-pointer'
          >
            Perm ban
          </button>
          <button
            type='button'
            onClick={() => setModal('delete')}
            className='w-full text-caption-sm font-medium px-2.5 py-1 rounded-md border border-stroke text-fg-muted bg-canvas hover:border-danger/40 hover:text-danger-text hover:bg-danger-bg transition-colors duration-150 cursor-pointer'
          >
            Delete
          </button>
        </div>
      )}

      {/* ── Modal ───────────────────────────────────────────────────────── */}
      {modal && (
        <div className='fixed inset-0 z-50 bg-neutral-900/50 flex items-center justify-center p-4'>
          <div className='w-full max-w-md bg-canvas border border-stroke-faint rounded-lg shadow-raised p-6'>
            {/* Header */}
            <div className='flex items-start justify-between mb-4'>
              <div>
                <h2 className='text-body font-medium text-fg'>
                  {modal === 'temp-ban' && 'Temporarily ban user'}
                  {modal === 'perm-ban' && 'Permanently ban user'}
                  {modal === 'delete' && 'Delete account'}
                </h2>
                <p className='text-body-xs text-fg-muted mt-0.5'>@{username}</p>
              </div>
              <button
                type='button'
                onClick={() => {
                  setModal(null);
                  setErrorMsg(null);
                  setState('idle');
                }}
                className='text-fg-muted hover:text-fg transition-colors cursor-pointer p-1 rounded-md hover:bg-canvas-subtle'
                aria-label='Close'
              >
                <IconX size={16} aria-hidden='true' />
              </button>
            </div>

            {/* Temp ban — duration grid */}
            {modal === 'temp-ban' && (
              <div>
                <p className='text-body-xs text-fg-muted mb-4'>
                  Select how long to suspend{' '}
                  <strong className='text-fg'>@{username}</strong>. They will
                  receive an email notification and cannot sign in during the
                  suspension. This can be reversed with the Unban action.
                </p>
                <div className='grid grid-cols-2 gap-2'>
                  {BAN_DURATIONS.map(({ label, value }) => (
                    <button
                      key={value}
                      type='button'
                      disabled={loading}
                      onClick={() => callRoute('ban', { duration: value })}
                      className='py-2.5 rounded-md border border-stroke text-body-xs text-fg hover:bg-canvas-subtle hover:border-brand hover:text-brand transition-colors duration-150 cursor-pointer disabled:opacity-50'
                    >
                      {loading ? (
                        <IconLoader2
                          size={13}
                          className='animate-spin inline'
                        />
                      ) : (
                        label
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Perm ban */}
            {modal === 'perm-ban' && (
              <div>
                <p className='text-body-xs text-fg-muted mb-4'>
                  <strong className='text-fg'>@{username}</strong> will be
                  permanently blocked from signing in. Their contributions
                  remain in the platform. They will receive an email
                  notification. This can be undone with the Unban action.
                </p>
                <button
                  type='button'
                  disabled={loading}
                  onClick={() => callRoute('ban', { duration: '876000h' })}
                  className='w-full py-2.5 rounded-md bg-danger text-white text-body-xs font-medium hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2'
                >
                  {loading && (
                    <IconLoader2 size={13} className='animate-spin' />
                  )}
                  Confirm permanent ban
                </button>
              </div>
            )}

            {/* Delete */}
            {modal === 'delete' && (
              <div>
                <p className='text-body-xs text-fg-muted mb-3'>
                  This will permanently delete{' '}
                  <strong className='text-fg'>@{username}&apos;s</strong>{' '}
                  account.
                </p>
                <ul className='text-body-xs text-fg-muted mb-4 space-y-1.5 list-disc list-inside bg-canvas-subtle border border-stroke-faint rounded-md px-4 py-3'>
                  <li>Their scam reports remain, anonymised</li>
                  <li>Their votes and points history are removed</li>
                  <li>They will receive an email notification</li>
                  <li className='text-danger-text font-medium'>
                    This cannot be undone
                  </li>
                </ul>
                <button
                  type='button'
                  disabled={loading}
                  onClick={() => callRoute('delete')}
                  className='w-full py-2.5 rounded-md bg-danger text-white text-body-xs font-medium hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2'
                >
                  {loading && (
                    <IconLoader2 size={13} className='animate-spin' />
                  )}
                  Delete account permanently
                </button>
              </div>
            )}

            {/* Error */}
            {state === 'error' && (
              <p className='text-caption text-danger-text bg-danger-bg border border-danger/30 rounded-md px-3 py-2 mt-3'>
                {errorMsg}
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
