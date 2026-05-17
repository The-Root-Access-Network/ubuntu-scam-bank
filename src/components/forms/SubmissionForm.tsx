// src/components/forms/SubmissionForm.tsx

'use client';

import { useRef, useState } from 'react';
import {
  IconArrowRight,
  IconCircleCheck,
  IconCloudUpload,
  IconMapPin,
  IconStar,
} from '@tabler/icons-react';

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

const COUNTRIES = [
  'Nigeria',
  'United Kingdom',
  'Ghana',
  'South Africa',
  'Kenya',
  'United States',
  'Other',
];

// ── Component ─────────────────────────────────────────────────────────────────

export default function SubmissionForm() {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedType, setSelectedType] = useState<string>('phishing_email');
  const [severity, setSeverity] = useState<number>(1);
  const [country, setCountry] = useState<string>('Nigeria');
  const [context, setContext] = useState<string>('');
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [submitted, setSubmitted] = useState<boolean>(false);

  const severityLabel =
    SEVERITY_LEVELS.find((s) => s.level === severity)?.label ?? 'Low';

  function handleSubmit() {
    // TODO: POST to /api/submit → triage pipeline wired in Phase 2
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 5000);
  }

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
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
        }}
        className={[
          'border-[1.5px] border-dashed rounded-lg px-4 py-7 text-center cursor-pointer',
          'transition-colors duration-150',
          isDragging
            ? 'border-brand bg-brand-light'
            : 'border-stroke hover:bg-canvas-subtle',
        ].join(' ')}
      >
        <input
          ref={fileInputRef}
          type='file'
          className='hidden'
          accept='image/*,.eml,.pdf,.txt'
          aria-hidden='true'
        />
        <IconCloudUpload
          size={28}
          className='text-brand mx-auto mb-2'
          aria-hidden='true'
        />
        <p className='text-body-sm font-medium text-fg leading-relaxed'>
          Drag &amp; drop, paste, or tap to upload
        </p>
        <p className='text-body-xs text-fg-muted mt-1.5'>
          Screenshot · Email file (.eml) · Text message · Document
        </p>
        <p className='text-caption text-fg-subtle mt-1'>
          Your personal info is automatically removed before storing
        </p>
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
      <div className='flex items-center gap-2 text-body-xs text-fg-muted mt-2'>
        <IconMapPin size={14} aria-hidden='true' className='shrink-0' />
        <label htmlFor='country-select'>Country received in:</label>
        <select
          id='country-select'
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          className='text-body-xs border border-stroke rounded-md px-2 py-1 bg-canvas text-fg cursor-pointer'
        >
          {COUNTRIES.map((c) => (
            <option key={c} value={c}>
              {c}
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

      {/* Submit row */}
      <div className='flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between mt-3.5'>
        <div className='flex items-center gap-1 text-body-xs text-brand'>
          <IconStar size={14} aria-hidden='true' />
          +10 pts on submission
        </div>
        <button
          type='button'
          onClick={handleSubmit}
          className='inline-flex items-center justify-center gap-2 bg-brand text-white px-5.5 py-2.5 rounded-md text-body-sm font-medium hover:bg-brand-dark transition-colors duration-150 cursor-pointer'
        >
          Submit report
          <IconArrowRight size={15} aria-hidden='true' />
        </button>
      </div>

      {/* Success banner */}
      {submitted && (
        <div className='flex items-start gap-2.5 bg-brand-light border border-brand-medium rounded-md px-3.5 py-3 mt-3.5'>
          <IconCircleCheck
            size={18}
            className='text-brand-dark shrink-0 mt-0.5'
            aria-hidden='true'
          />
          <p className='text-body-sm text-brand-dark'>
            Report submitted!{' '}
            <span className='font-medium'>
              +10 points added to your account.
            </span>{' '}
            Thank you for helping protect others.
          </p>
        </div>
      )}
    </div>
  );
}
