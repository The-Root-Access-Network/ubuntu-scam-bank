// src/components/reports/OriginalSubmission.tsx

'use client';

import { useState } from 'react';
import {
  IconChevronDown,
  IconChevronUp,
  IconAlertTriangle,
} from '@tabler/icons-react';
import Image from 'next/image';

interface OriginalSubmissionProps {
  rawContent: string | null;
  fileSignedUrl: string | null;
  fileType: string | null;
  canViewOriginal: boolean; // Always true, preserved for consistency with parent
  canDownloadFile: boolean; // Governs raw file/PDF links
}

export default function OriginalSubmission({
  rawContent,
  fileSignedUrl,
  fileType,
  canViewOriginal,
  canDownloadFile,
}: OriginalSubmissionProps) {
  const [open, setOpen] = useState(false);

  // Fallback structural check
  if (!canViewOriginal) return null;

  // Nothing to show guard
  if (!rawContent && !fileSignedUrl) return null;

  const isImage = fileType?.startsWith('image/') ?? false;
  const isPdf = fileType === 'application/pdf';

  return (
    <div className='border border-stroke rounded-lg overflow-hidden mb-4'>
      {/* Toggle button */}
      <button
        type='button'
        onClick={() => setOpen((v) => !v)}
        className='w-full flex items-center justify-between px-4 py-3 bg-canvas-subtle hover:bg-neutral-100 transition-colors duration-150 cursor-pointer'
        aria-expanded={open}
      >
        <span className='text-body-xs font-medium text-fg-muted'>
          View original submission
        </span>
        {open ? (
          <IconChevronUp
            size={15}
            className='text-fg-muted shrink-0'
            aria-hidden='true'
          />
        ) : (
          <IconChevronDown
            size={15}
            className='text-fg-muted shrink-0'
            aria-hidden='true'
          />
        )}
      </button>

      {/* Content — only rendered when open */}
      {open && (
        <div className='px-4 pb-4 pt-3 bg-canvas-subtle border-t border-stroke-faint'>
          {/* Raw text content */}
          {rawContent && (
            <div className='mb-3'>
              <p className='text-caption text-fg-muted uppercase tracking-label mb-2'>
                Submitted text
              </p>
              <pre className='font-mono text-[12px] text-fg leading-relaxed bg-canvas border border-stroke-faint rounded-md p-3 overflow-y-auto max-h-75 whitespace-pre-wrap wrap-break-word'>
                {rawContent}
              </pre>
            </div>
          )}

          {/* File content */}
          {fileSignedUrl && (
            <div className='mb-3'>
              <p className='text-caption text-fg-muted uppercase tracking-label mb-2'>
                Uploaded file
              </p>

              {/* Images: Render inline for everyone, add context menu soft-deterrent */}
              {isImage && (
                <Image
                  src={fileSignedUrl}
                  alt='Submitted scam screenshot'
                  width={800}
                  height={400}
                  className='max-w-full h-auto rounded-md border border-stroke-faint block object-contain'
                  style={{ maxHeight: '400px' }}
                  unoptimized
                  onContextMenu={(e) => e.preventDefault()}
                />
              )}

              {/* PDFs: Conditional link rendering */}
              {isPdf &&
                (canDownloadFile ? (
                  <a
                    href={fileSignedUrl}
                    target='_blank'
                    rel='noopener noreferrer'
                    className='inline-flex items-center gap-2 text-body-xs text-brand hover:text-brand-dark transition-colors duration-150'
                  >
                    Download PDF ↗
                  </a>
                ) : (
                  <p className='text-body-xs text-fg-muted italic'>
                    Download available to the original submitter and moderators
                    only.
                  </p>
                ))}

              {/* General Binary Attachments: Conditional link rendering */}
              {!isImage &&
                !isPdf &&
                (canDownloadFile ? (
                  <a
                    href={fileSignedUrl}
                    target='_blank'
                    rel='noopener noreferrer'
                    className='inline-flex items-center gap-2 text-body-xs text-brand hover:text-brand-dark transition-colors duration-150'
                  >
                    Download file ↗
                  </a>
                ) : (
                  <p className='text-body-xs text-fg-muted italic'>
                    Download available to the original submitter and moderators
                    only.
                  </p>
                ))}
            </div>
          )}

          {/* Privacy disclaimer */}
          <div className='flex items-start gap-2 bg-warning-bg border border-warning rounded-md px-3 py-2.5 mt-2'>
            <IconAlertTriangle
              size={14}
              className='text-warning-text shrink-0 mt-0.5'
              aria-hidden='true'
            />
            <p className='text-caption text-warning-text leading-relaxed'>
              This is the original submission. Personal information may be
              present. Do not share this content.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
