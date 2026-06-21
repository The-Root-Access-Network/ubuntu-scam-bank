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
    return <span className='text-caption text-fg-subtle italic'>Moderator</span>;
  }

  if (done) {
    return <span className='text-caption text-brand'>Done — refresh to confirm</span>;
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
      {/* ── Action triggers ─────────────────────────────────────────────── */}
      {isBanned ? (
        <div className='flex items-center gap-2'>
          <span className='text-caption text-danger-text bg-danger-bg px-2 py-0.5 rounded-full'>
            Banned
          </span>
          <button
            type='button'
            onClick={() => callRoute('unban')}
            disabled={loading}
            className='text-caption text-brand hover:text-brand-dark transition-colors disabled:opacity-50 cursor-pointer'
          >
            {loading
              ? <IconLoader2 size={12} className='animate-spin inline' />
              : 'Unban'
            }
          </button>
        </div>
      ) : (
        <div className='flex items-center gap-3'>
          <button
            type='button'
            onClick={() => setModal('temp-ban')}
            className='text-caption text-warning-text hover:text-fg transition-colors cursor-pointer'
          >
            Temp ban
          </button>
          <button
            type='button'
            onClick={() => setModal('perm-ban')}
            className='text-caption text-danger-text hover:text-fg transition-colors cursor-pointer'
          >
            Perm ban
          </button>
          <button
            type='button'
            onClick={() => setModal('delete')}
            className='text-caption text-fg-muted hover:text-danger-text transition-colors cursor-pointer'
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
                <h2 className='text-[16px] font-medium text-fg'>
                  {modal === 'temp-ban' && 'Temporarily ban user'}
                  {modal === 'perm-ban' && 'Permanently ban user'}
                  {modal === 'delete' && 'Delete account'}
                </h2>
                <p className='text-body-xs text-fg-muted mt-0.5'>
                  @{username}
                </p>
              </div>
              <button
                type='button'
                onClick={() => { setModal(null); setErrorMsg(null); setState('idle'); }}
                className='text-fg-muted hover:text-fg transition-colors cursor-pointer'
              >
                <IconX size={16} aria-hidden='true' />
              </button>
            </div>

            {/* Body */}
            {modal === 'temp-ban' && (
              <div>
                <p className='text-body-xs text-fg-muted mb-4'>
                  Select how long to suspend <strong>@{username}</strong>. They
                  will receive an email notification and will not be able to sign
                  in during the suspension.
                </p>
                <div className='grid grid-cols-2 gap-2'>
                  {BAN_DURATIONS.map(({ label, value }) => (
                    <button
                      key={value}
                      type='button'
                      disabled={loading}
                      onClick={() => callRoute('ban', { duration: value })}
                      className='py-2.5 rounded-md border border-stroke text-body-xs text-fg hover:bg-canvas-subtle hover:border-brand transition-colors cursor-pointer disabled:opacity-50'
                    >
                      {loading
                        ? <IconLoader2 size={13} className='animate-spin inline' />
                        : label
                      }
                    </button>
                  ))}
                </div>
              </div>
            )}

            {modal === 'perm-ban' && (
              <div>
                <p className='text-body-xs text-fg-muted mb-4'>
                  <strong>@{username}</strong> will be permanently blocked from
                  signing in. Their contributions remain in the platform. They
                  will receive an email notification. This can be undone with
                  the Unban action.
                </p>
                <button
                  type='button'
                  disabled={loading}
                  onClick={() => callRoute('ban', { duration: '876000h' })}
                  className='w-full py-2.5 rounded-md bg-danger text-white text-body-xs font-medium hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50'
                >
                  {loading
                    ? <IconLoader2 size={13} className='animate-spin inline mr-1' />
                    : null
                  }
                  Confirm permanent ban
                </button>
              </div>
            )}

            {modal === 'delete' && (
              <div>
                <p className='text-body-xs text-fg-muted mb-2'>
                  This will permanently delete <strong>@{username}&apos;s</strong> account.
                </p>
                <ul className='text-body-xs text-fg-muted mb-4 space-y-1 list-disc list-inside'>
                  <li>Their scam reports remain, anonymised</li>
                  <li>Their votes and points history are removed</li>
                  <li>They will receive an email notification</li>
                  <li>This cannot be undone</li>
                </ul>
                <button
                  type='button'
                  disabled={loading}
                  onClick={() => callRoute('delete')}
                  className='w-full py-2.5 rounded-md bg-danger text-white text-body-xs font-medium hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50'
                >
                  {loading
                    ? <IconLoader2 size={13} className='animate-spin inline mr-1' />
                    : null
                  }
                  Delete account permanently
                </button>
              </div>
            )}

            {/* Error */}
            {state === 'error' && (
              <p className='text-caption text-danger-text mt-3'>{errorMsg}</p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
