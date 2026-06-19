// src/components/forms/SubmissionForm.tsx

'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { COUNTRY_OPTIONS, detectCountryFromLocale } from '@/lib/countries';
import {
  IconAlertCircle,
  IconArrowRight,
  IconCircleCheck,
  IconCloudUpload,
  IconLoader2,
  IconMapPin,
  IconStar,
} from '@tabler/icons-react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface PointsLineItem {
  reason: string;
  delta: number;
}

interface SubmitSuccess {
  success: true;
  report_id: string;
  is_duplicate: boolean;
  is_novel: boolean;
  triage_failed: boolean;
  status: 'published' | 'under_review';
  summary: string | null;
  points: {
    total: number;
    breakdown: PointsLineItem[];
  };
}

// ── Static data ──────────────────────────────────────────────────────────────

const SCAM_TYPES = [
  { label: 'Phishing email', value: 'phishing_email' },
  { label: 'Smishing (text)', value: 'smishing' },
  { label: 'Investment fraud', value: 'investment_fraud' },
  { label: 'Romance scam', value: 'romance_scam' },
  { label: 'Tech support', value: 'tech_support' },
  { label: 'Business email', value: 'business_email_compromise' },
  { label: 'Other', value: 'other' },
] as const;

const SEVERITY_LEVELS = [
  { level: 1, label: 'Low', color: '#C0DD97' },
  { level: 2, label: 'Mild', color: '#EF9F27' },
  { level: 3, label: 'Moderate', color: '#D85A30' },
  { level: 4, label: 'High', color: '#E24B4A' },
  { level: 5, label: 'Critical', color: '#A32D2D' },
] as const;

// ── Component ─────────────────────────────────────────────────────────────────

export default function SubmissionForm() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // ── Form state ───────────────────────────────────────────────────────────
  const [content, setContent] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('phishing_email');
  const [severity, setSeverity] = useState<number>(1);
  const [country, setCountry] = useState<string>(
    () => detectCountryFromLocale() || 'Nigeria',
  );
  const [context, setContext] = useState<string>('');
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  // ── Submission state ─────────────────────────────────────────────────────
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SubmitSuccess | null>(null);

  const severityLabel =
    SEVERITY_LEVELS.find((s) => s.level === severity)?.label ?? 'Low';

  // ── File handling ────────────────────────────────────────────────────────
  function handleFileSelect(selected: File | null) {
    setFile(selected);
    setError(null);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const dropped = e.dataTransfer.files[0] ?? null;
    handleFileSelect(dropped);
  }

  // ── Submit ───────────────────────────────────────────────────────────────
  async function handleSubmit() {
    setError(null);
    setResult(null);

    // Client-side guard — at least some content required
    if (!content.trim() && !file) {
      setError('Please paste the scam message or upload a file.');
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('content', content);
      formData.append('type', selectedType);
      formData.append('severity', String(severity));
      formData.append('country', country);
      formData.append('context', context);
      if (file) formData.append('file', file);

      const res = await fetch('/api/submit', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error ?? 'Submission failed. Please try again.');
        return;
      }

      // Success — store result and reset form
      setResult(data as SubmitSuccess);
      setTimeout(() => router.refresh(), 500); // triggers server component re-fetch
      setContent('');
      setContext('');
      setFile(null);
      setSeverity(1);
      setSelectedType('phishing_email');
      setCountry('Nigeria');
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch {
      setError(
        'Something went wrong. Please check your connection and try again.',
      );
    } finally {
      setLoading(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className='bg-canvas border border-stroke-faint rounded-lg p-4'>
      {/* Card title */}
      <p className='text-label text-fg-muted uppercase tracking-label mb-3'>
        Report a scam
      </p>

      {/* Upload zone */}
      <div
        role='button'
        tabIndex={0}
        aria-label='Upload scam content — click or drag a file here'
        onClick={() => fileInputRef.current?.click()}
        onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={[
          'border-[1.5px] border-dashed rounded-lg px-4 py-7 text-center cursor-pointer',
          'transition-colors duration-150',
          isDragging
            ? 'border-brand bg-brand-light'
            : file
              ? 'border-brand bg-brand-light'
              : 'border-stroke hover:bg-canvas-subtle',
        ].join(' ')}
      >
        <input
          ref={fileInputRef}
          type='file'
          className='hidden'
          accept='image/jpeg,image/png,image/webp,text/plain,message/rfc822,application/pdf'
          aria-hidden='true'
          onChange={(e) => handleFileSelect(e.target.files?.[0] ?? null)}
        />
        <IconCloudUpload
          size={28}
          className='text-brand mx-auto mb-2'
          aria-hidden='true'
        />
        {file ? (
          <>
            <p className='text-body-sm font-medium text-brand-dark'>
              {file.name}
            </p>
            <p className='text-caption text-fg-muted mt-1'>
              {(file.size / 1024).toFixed(0)} KB ·{' '}
              <button
                type='button'
                className='underline cursor-pointer'
                onClick={(e) => {
                  e.stopPropagation();
                  handleFileSelect(null);
                }}
              >
                Remove
              </button>
            </p>
          </>
        ) : (
          <>
            <p className='text-body-sm font-medium text-fg leading-relaxed'>
              Drag &amp; drop, paste, or tap to upload
            </p>
            <p className='text-body-xs text-fg-muted mt-1.5'>
              Screenshot · Email file (.eml) · Text message · Document
            </p>
            <p className='text-caption text-fg-subtle mt-1'>
              Your personal info is automatically removed before storing
            </p>
          </>
        )}
      </div>

      {/* Paste text area — shown below upload zone */}
      <div className='mt-3'>
        <label
          htmlFor='paste-content'
          className='text-label text-fg-muted block mb-1'
        >
          Or paste the scam message here
        </label>
        <textarea
          id='paste-content'
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={4}
          placeholder='Paste the full scam email, text message, or any other content...'
          className={[
            'w-full border rounded-md px-2.5 py-2 text-body-sm resize-none',
            'bg-canvas text-fg placeholder:text-fg-subtle',
            'border-stroke focus:border-brand focus:outline-none',
            'transition-colors duration-150',
          ].join(' ')}
        />
      </div>

      {/* Scam type chips */}
      <div className='mt-3.5'>
        <p className='text-label tracking-label text-fg-muted mb-1.5'>
          What type of scam is this?
        </p>
        <div className='flex flex-wrap gap-1.5'>
          {SCAM_TYPES.map(({ label, value }) => (
            <button
              key={value}
              type='button'
              onClick={() => setSelectedType(value)}
              className={[
                'text-[13px] px-3 py-1 rounded-full border transition-all duration-150 cursor-pointer',
                selectedType === value
                  ? 'bg-brand-light text-brand-dark border-brand'
                  : 'bg-transparent text-fg-muted border-stroke hover:border-brand hover:bg-brand-light hover:text-brand-dark',
              ].join(' ')}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Severity selector */}
      <div className='flex items-center gap-1.5 mt-3'>
        <span className='text-body-xs text-fg-muted'>Severity:</span>
        {SEVERITY_LEVELS.map(({ level, label, color }) => (
          <button
            key={level}
            type='button'
            title={label}
            aria-label={`Severity: ${label}`}
            onClick={() => setSeverity(level)}
            className='w-3 h-3 rounded-full cursor-pointer border-[1.5px] transition-all duration-150'
            style={{
              backgroundColor: color,
              borderColor: severity === level ? 'var(--fg)' : 'transparent',
            }}
          />
        ))}
        <span className='text-body-xs text-fg-muted ml-1'>{severityLabel}</span>
      </div>

      {/* Country received in */}
      {/* On mobile: label row on top, select full-width below.
          From sm (640px) up: single inline row as before. */}
      <div className='flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-2 text-body-xs text-fg-muted mt-2'>
        <div className='flex items-center gap-1.5'>
          <IconMapPin size={14} aria-hidden='true' className='shrink-0' />
          <label htmlFor='country-select'>Country received in:</label>
        </div>
        <select
          id='country-select'
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          className='w-full sm:w-auto text-body-xs border border-stroke rounded-md px-2 py-1 bg-canvas text-fg cursor-pointer'
        >
          {COUNTRY_OPTIONS.map(({ code, name }) => (
            <option key={code} value={name}>
              {name}
            </option>
          ))}
        </select>
      </div>

      {/* Context textarea */}
      <div className='mt-3'>
        <label
          htmlFor='context'
          className='text-label text-fg-muted block mb-1'
        >
          Add context (optional) — what made it look convincing?
        </label>
        <textarea
          id='context'
          value={context}
          onChange={(e) => setContext(e.target.value)}
          rows={3}
          placeholder='e.g. It claimed to be from HMRC, had my name on it, and had a real-looking gov.uk link...'
          className={[
            'w-full border rounded-md px-2.5 py-2 text-body-sm resize-none',
            'bg-canvas text-fg placeholder:text-fg-subtle',
            'border-stroke focus:border-brand focus:outline-none',
            'transition-colors duration-150',
          ].join(' ')}
        />
      </div>

      {/* Error banner */}
      {error && (
        <div className='flex items-start gap-2.5 bg-danger-bg border border-danger rounded-md px-3.5 py-3 mt-3.5'>
          <IconAlertCircle
            size={18}
            className='text-danger shrink-0 mt-0.5'
            aria-hidden='true'
          />
          <p className='text-body-xs text-danger-text'>{error}</p>
        </div>
      )}

      {/* Submit row */}
      {!result && (
        <div className='flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between mt-3.5'>
          <div className='flex items-center gap-1 text-body-xs text-brand'>
            <IconStar size={14} aria-hidden='true' />
            Earn points for every report
          </div>
          <button
            type='button'
            onClick={handleSubmit}
            disabled={loading}
            className='inline-flex items-center justify-center gap-2 bg-brand text-white px-5.5 py-2.5 rounded-md text-body-sm font-medium hover:bg-brand-dark transition-colors duration-150 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed'
          >
            {loading ? (
              <>
                <IconLoader2
                  size={15}
                  className='animate-spin'
                  aria-hidden='true'
                />
                Analysing...
              </>
            ) : (
              <>
                Submit report
                <IconArrowRight size={15} aria-hidden='true' />
              </>
            )}
          </button>
        </div>
      )}

      {/* Success banner */}
      {result && (
        <div className='bg-brand-light border border-brand-medium rounded-md px-3.5 py-3 mt-3.5'>
          {/* Header row */}
          <div className='flex items-start gap-2.5 mb-2.5'>
            <IconCircleCheck
              size={18}
              className='text-brand-dark shrink-0 mt-0.5'
              aria-hidden='true'
            />
            <div>
              <p className='text-body-sm font-medium text-brand-dark'>
                Report submitted!
                {result.is_duplicate && (
                  <span className='font-normal'>
                    {' '}
                    This matches a known campaign — thanks for confirming it.
                  </span>
                )}
                {result.is_novel && (
                  <span className='font-normal'>
                    {' '}
                    New campaign detected — great catch.
                  </span>
                )}
              </p>
              {result.triage_failed && (
                <p className='text-caption text-brand-dark mt-0.5 opacity-80'>
                  Our AI is under heavy load — your report is queued for manual
                  review.
                </p>
              )}
            </div>
          </div>

          {/* Points breakdown */}
          <div className='bg-canvas rounded-md px-3 py-2.5 flex flex-col gap-1'>
            {result.points.breakdown.map((item, i) => (
              <div key={i} className='flex items-center justify-between'>
                <span className='text-body-xs text-fg-muted'>
                  {item.reason}
                </span>
                <span className='text-body-xs font-medium text-brand'>
                  +{item.delta} pts
                </span>
              </div>
            ))}
            <div className='border-t border-stroke-faint mt-1 pt-1 flex items-center justify-between'>
              <span className='text-body-xs font-medium text-fg'>
                Total earned
              </span>
              <span className='text-body-sm font-medium text-brand'>
                +{result.points.total} pts
              </span>
            </div>
          </div>

          {/* Submit another */}
          <button
            type='button'
            onClick={() => setResult(null)}
            className='mt-2.5 text-body-xs text-brand-dark underline cursor-pointer'
          >
            Submit another report
          </button>
        </div>
      )}
    </div>
  );
}
