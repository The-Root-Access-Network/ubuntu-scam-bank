// src/components/researchers/ApplicationForm.tsx

'use client';

import { useState } from 'react';
import {
  IconArrowRight,
  IconLoader2,
  IconCircleCheck,
} from '@tabler/icons-react';

const ROLES = [
  'Security researcher',
  'Academic / student',
  'NGO / civil society',
  'Journalist / reporter',
  'Law enforcement',
  'Financial institution',
  'Government / regulator',
  'Other',
];

export default function ApplicationForm() {
  const [fullName, setFullName] = useState('');
  const [organisation, setOrganisation] = useState('');
  const [role, setRole] = useState('');
  const [useCase, setUseCase] = useState('');
  const [portfolioUrl, setPortfolioUrl] = useState('');
  const [agreed, setAgreed] = useState(false);

  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!agreed) {
      setError('You must agree to the terms of use.');
      return;
    }

    setLoading(true);
    setError(null);

    const res = await fetch('/api/researchers/apply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        full_name: fullName,
        organisation,
        role,
        use_case: useCase,
        portfolio_url: portfolioUrl || null,
      }),
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      setError(data.error ?? 'Submission failed. Please try again.');
      setLoading(false);
      return;
    }

    setSubmitted(true);
    setLoading(false);
  }

  if (submitted) {
    return (
      <div className='text-center py-10'>
        <div className='w-14 h-14 bg-brand-light rounded-full flex items-center justify-center mx-auto mb-4'>
          <IconCircleCheck
            size={26}
            className='text-brand'
            aria-hidden='true'
          />
        </div>
        <h2 className='text-[18px] font-medium text-fg mb-2'>
          Application received
        </h2>
        <p className='text-body-sm text-fg-muted leading-relaxed max-w-md mx-auto mb-2'>
          The TRAN team will review your application and get back to you within
          5 working days.
        </p>
        <p className='text-[12px] text-fg-subtle'>
          Questions? Email{' '}
          <a
            href='mailto:info@therootaccessnetwork.com'
            className='text-brand hover:text-brand-dark transition-colors'
          >
            info@therootaccessnetwork.com
          </a>
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className='flex flex-col gap-5'>
      {/* Full name + Organisation */}
      <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
        <div>
          <label
            htmlFor='full-name'
            className='text-body-xs text-fg-muted block mb-1.5'
          >
            Full name <span className='text-danger'>*</span>
          </label>
          <input
            id='full-name'
            type='text'
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            maxLength={100}
            placeholder='Dr. Jane Kenneths'
            className='w-full border border-stroke rounded-md px-3 py-2 text-body-xs bg-canvas text-fg placeholder:text-fg-subtle focus:border-brand focus:outline-none transition-colors duration-150'
          />
        </div>
        <div>
          <label
            htmlFor='organisation'
            className='text-body-xs text-fg-muted block mb-1.5'
          >
            Organisation <span className='text-danger'>*</span>
          </label>
          <input
            id='organisation'
            type='text'
            value={organisation}
            onChange={(e) => setOrganisation(e.target.value)}
            required
            maxLength={200}
            placeholder='University of Lagos / NCSC / Action Fraud'
            className='w-full border border-stroke rounded-md px-3 py-2 text-body-xs bg-canvas text-fg placeholder:text-fg-subtle focus:border-brand focus:outline-none transition-colors duration-150'
          />
        </div>
      </div>

      {/* Role */}
      <div>
        <label
          htmlFor='role'
          className='text-body-xs text-fg-muted block mb-1.5'
        >
          Your role <span className='text-danger'>*</span>
        </label>
        <select
          id='role'
          value={role}
          onChange={(e) => setRole(e.target.value)}
          required
          className='w-full border border-stroke rounded-md px-3 py-2 text-body-xs bg-canvas text-fg focus:border-brand focus:outline-none transition-colors duration-150 cursor-pointer'
        >
          <option value='' disabled>
            Select your role
          </option>
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </div>

      {/* Use case */}
      <div>
        <label
          htmlFor='use-case'
          className='text-body-xs text-fg-muted block mb-1.5'
        >
          Intended use <span className='text-danger'>*</span>
          <span className='text-fg-subtle ml-2'>
            — describe how you will use this data
          </span>
        </label>
        <textarea
          id='use-case'
          value={useCase}
          onChange={(e) => setUseCase(e.target.value)}
          required
          rows={4}
          minLength={50}
          maxLength={2000}
          placeholder='e.g. I am researching phishing campaign patterns across West Africa as part of my PhD thesis at the University of Lagos. This data will inform...'
          className='w-full border border-stroke rounded-md px-3 py-2 text-body-xs bg-canvas text-fg placeholder:text-fg-subtle focus:border-brand focus:outline-none transition-colors duration-150 resize-none'
        />
        <p className='text-[11px] text-fg-subtle mt-1'>
          {useCase.length}/2000 · minimum 50 characters
        </p>
      </div>

      {/* Portfolio URL */}
      <div>
        <label
          htmlFor='portfolio-url'
          className='text-body-xs text-fg-muted block mb-1.5'
        >
          Website or portfolio
          <span className='text-fg-subtle ml-2'>(optional)</span>
        </label>
        <input
          id='portfolio-url'
          type='url'
          value={portfolioUrl}
          onChange={(e) => setPortfolioUrl(e.target.value)}
          placeholder='https://your-organisation.org'
          className='w-full border border-stroke rounded-md px-3 py-2 text-body-xs bg-canvas text-fg placeholder:text-fg-subtle focus:border-brand focus:outline-none transition-colors duration-150'
        />
      </div>

      {/* Terms */}
      <div className='flex items-start gap-3 bg-canvas-subtle rounded-lg p-4 border border-stroke-faint'>
        <input
          id='terms'
          type='checkbox'
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
          className='mt-0.5 w-4 h-4 accent-brand cursor-pointer shrink-0'
        />
        <label
          htmlFor='terms'
          className='text-body-xs text-fg-muted leading-relaxed cursor-pointer'
        >
          I agree to use this data solely for legitimate research, journalism,
          or protective purposes. I will not sell, redistribute, or use this
          data to facilitate harm or for commercial gain. I accept the
          UbuntuScamBank API Terms of Use and understand that access may be
          revoked for misuse.
        </label>
      </div>

      {/* Error */}
      {error && (
        <p className='text-body-xs text-danger-text bg-danger-bg rounded-md px-3 py-2.5'>
          {error}
        </p>
      )}

      {/* Submit */}
      <div className='flex items-center justify-between pt-1'>
        <p className='text-caption text-fg-subtle'>
          Fields marked <span className='text-danger'>*</span> are required
        </p>
        <button
          type='submit'
          disabled={loading || !agreed}
          className='inline-flex items-center gap-2 bg-brand text-white px-6 py-2.5 rounded-md text-[14px] font-medium hover:bg-brand-dark transition-colors duration-150 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed'
        >
          {loading ? (
            <>
              <IconLoader2
                size={15}
                className='animate-spin'
                aria-hidden='true'
              />
              Submitting…
            </>
          ) : (
            <>
              Submit application
              <IconArrowRight size={15} aria-hidden='true' />
            </>
          )}
        </button>
      </div>
    </form>
  );
}
