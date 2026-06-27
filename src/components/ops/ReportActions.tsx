// src/components/ops/ReportActions.tsx

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { IconLoader2, IconX } from '@tabler/icons-react';

interface ReportActionsProps {
  reportId: string;
}

type Modal = 'publish' | 'reject' | null;
type ActionState = 'idle' | 'loading' | 'error';

export default function ReportActions({ reportId }: ReportActionsProps) {
  const router = useRouter();
  const [modal, setModal] = useState<Modal>(null);
  const [state, setState] = useState<ActionState>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function callRoute(action: 'publish' | 'reject') {
    setState('loading');
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/ops/reports/${reportId}/${action}`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMsg(data.error ?? 'Action failed.');
        setState('error');
        return;
      }
      setModal(null);
      setState('idle');
      router.refresh();
    } catch {
      setErrorMsg('Network error. Please try again.');
      setState('error');
    }
  }

  const loading = state === 'loading';

  return (
    <>
      {/* Trigger buttons */}
      <div className='flex items-center gap-2'>
        <button
          type='button'
          onClick={() => setModal('publish')}
          className='text-caption-sm font-medium px-3 py-1.5 bg-brand text-white rounded-md hover:bg-brand-dark transition-colors duration-150 cursor-pointer'
        >
          Publish
        </button>
        <button
          type='button'
          onClick={() => setModal('reject')}
          className='text-caption-sm font-medium px-3 py-1.5 border border-danger/40 text-danger-text bg-danger-bg rounded-md hover:bg-danger hover:text-white hover:border-danger transition-colors duration-150 cursor-pointer'
        >
          Reject
        </button>
      </div>

      {/* Modal */}
      {modal && (
        <div className='fixed inset-0 z-50 bg-neutral-900/50 flex items-center justify-center p-4'>
          <div className='w-full max-w-md bg-canvas border border-stroke-faint rounded-lg shadow-raised p-6'>
            {/* Header */}
            <div className='flex items-start justify-between mb-4'>
              <h2 className='text-body font-medium text-fg'>
                {modal === 'publish' ? 'Publish report' : 'Reject report'}
              </h2>
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

            {/* Body */}
            <p className='text-body-xs text-fg-muted leading-relaxed mb-5'>
              {modal === 'publish'
                ? 'This will make the report publicly visible in the feed and searchable by researchers via the API. Confirm?'
                : 'This will permanently reject the report. It will not appear in the public feed. This cannot be undone.'}
            </p>

            {/* Error */}
            {state === 'error' && errorMsg && (
              <p className='text-caption text-danger-text bg-danger-bg border border-danger/30 rounded-md px-3 py-2 mb-4'>
                {errorMsg}
              </p>
            )}

            {/* Confirm button */}
            <button
              type='button'
              disabled={loading}
              onClick={() => callRoute(modal)}
              className={[
                'w-full py-2.5 rounded-md text-body-xs font-medium transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2',
                modal === 'publish'
                  ? 'bg-brand text-white hover:bg-brand-dark'
                  : 'bg-danger text-white hover:opacity-90',
              ].join(' ')}
            >
              {loading && (
                <IconLoader2
                  size={13}
                  className='animate-spin'
                  aria-hidden='true'
                />
              )}
              {modal === 'publish' ? 'Publish report' : 'Reject report'}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
