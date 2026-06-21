// src/components/ops/ApplicationActions.tsx

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { IconClipboard, IconLoader2 } from '@tabler/icons-react';

interface ApplicationActionsProps {
  applicationId: string;
  status: string;
}

type ActionState = 'idle' | 'loading' | 'error';

export default function ApplicationActions({
  applicationId,
  status,
}: ApplicationActionsProps) {
  const router = useRouter();
  const [state, setState] = useState<ActionState>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [closeWarning, setCloseWarning] = useState(false);

  if (status !== 'pending') {
    return <span className='text-caption text-fg-subtle'>Reviewed</span>;
  }

  async function callRoute(action: 'approve' | 'reject') {
    setState('loading');
    setErrorMsg(null);

    try {
      const res = await fetch(
        `/api/ops/applications/${applicationId}/${action}`,
        {
          method: 'POST',
        },
      );
      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorMsg(data.error ?? 'Action failed.');
        setState('error');
        return;
      }

      if (action === 'approve') {
        setApiKey(data.apiKey);
        setCopied(false);
        setCloseWarning(false);
      } else {
        router.refresh();
      }

      setState('idle');
    } catch {
      setErrorMsg('Network error. Please try again.');
      setState('error');
    }
  }

  async function copyKey() {
    if (!apiKey) return;
    await navigator.clipboard.writeText(apiKey);
    setCopied(true);
    setCloseWarning(false);
  }

  function closeModal() {
    if (!copied && !closeWarning) {
      setCloseWarning(true);
      return;
    }
    setApiKey(null);
    router.refresh();
  }

  const loading = state === 'loading';

  return (
    <>
      <div className='flex flex-col gap-1.5'>
        <div className='flex items-center gap-2'>
          <button
            type='button'
            disabled={loading}
            onClick={() => callRoute('approve')}
            className='text-caption text-brand hover:text-brand-dark transition-colors disabled:opacity-50 cursor-pointer'
          >
            {loading ? (
              <IconLoader2 size={12} className='animate-spin inline' />
            ) : (
              'Approve'
            )}
          </button>
          <button
            type='button'
            disabled={loading}
            onClick={() => callRoute('reject')}
            className='text-caption text-danger-text hover:text-fg transition-colors disabled:opacity-50 cursor-pointer'
          >
            Reject
          </button>
        </div>
        {state === 'error' && (
          <p className='text-caption text-danger-text'>{errorMsg}</p>
        )}
      </div>

      {apiKey && (
        <div className='fixed inset-0 z-50 bg-neutral-900/40 flex items-center justify-center p-4'>
          <div className='w-full max-w-lg bg-canvas border border-stroke-faint rounded-lg shadow-raised p-5'>
            <h2 className='text-[16px] font-medium text-fg mb-2'>
              API key generated
            </h2>
            <p className='text-body-xs text-fg-muted mb-4'>
              Copy it now — it cannot be recovered.
            </p>
            <div className='bg-canvas-subtle border border-stroke-faint rounded-md p-3 mb-4'>
              <code className='block text-caption text-fg break-all font-mono'>
                {apiKey}
              </code>
            </div>
            {closeWarning && (
              <p className='text-body-xs text-warning-text bg-warning-bg border border-warning rounded-md px-3 py-2 mb-4'>
                Have you copied your key? It will not be shown again.
              </p>
            )}
            <div className='flex items-center justify-end gap-2'>
              <button
                type='button'
                onClick={copyKey}
                className='inline-flex items-center gap-2 bg-brand text-white px-3.5 py-2 rounded-md text-body-xs font-medium hover:bg-brand-dark transition-colors cursor-pointer'
              >
                <IconClipboard size={14} aria-hidden='true' />
                {copied ? 'Copied' : 'Copy key'}
              </button>
              <button
                type='button'
                onClick={closeModal}
                className='text-body-xs font-medium px-3.5 py-2 border border-stroke rounded-md bg-transparent text-fg hover:bg-canvas-subtle transition-colors cursor-pointer'
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
