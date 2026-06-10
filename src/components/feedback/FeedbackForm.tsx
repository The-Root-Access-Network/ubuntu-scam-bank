// src/components/feedback/FeedbackForm.tsx

'use client';

import { useState } from 'react';
import {
  IconArrowRight,
  IconCircleCheck,
  IconLoader2,
} from '@tabler/icons-react';

// ── Types ─────────────────────────────────────────────────────────────────────

type FormState = {
  name: string;
  email: string;
  role: string;
  organisation: string;
  message: string;
};

const ROLES = [
  'General user',
  'Security researcher',
  'Journalist / Press',
  'NGO / Civil society',
  'Software Engineer',
  'Other',
] as const;

const EMPTY: FormState = {
  name: '',
  email: '',
  role: '',
  organisation: '',
  message: '',
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function FeedbackForm() {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update(field: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (error) setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error ?? 'Submission failed. Please try again.');
        return;
      }

      setSubmitted(true);
      setForm(EMPTY);
    } catch {
      setError(
        'Something went wrong. Please check your connection and try again.',
      );
    } finally {
      setLoading(false);
    }
  }

  // ── Success state ──────────────────────────────────────────────────────────
  if (submitted) {
    return (
      <div className='flex flex-col items-center text-center py-10 px-4'>
        <div className='w-14 h-14 bg-brand-light rounded-full flex items-center justify-center mb-4'>
          <IconCircleCheck
            size={26}
            className='text-brand'
            aria-hidden='true'
          />
        </div>
        <h2 className='text-body-lg font-medium text-fg mb-2'>
          Message received
        </h2>
        <p className='text-body-sm text-fg-muted leading-relaxed max-w-md mb-2'>
          The TRAN team will read your message and get back to you if a response
          is needed. We typically respond within 3–5 working days.
        </p>
        <p className='text-caption text-fg-subtle'>
          Questions in the meantime?{' '}
          <a
            href='mailto:therootaccessnetwork@africybercore.com'
            className='text-brand hover:text-brand-dark transition-colors'
          >
            therootaccessnetwork@africybercore.com
          </a>
        </p>
      </div>
    );
  }

  // ── Form ───────────────────────────────────────────────────────────────────
  return (
    <form onSubmit={handleSubmit} className='flex flex-col gap-5'>
      {/* Name + Email */}
      <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
        <div>
          <label
            htmlFor='feedback-name'
            className='text-body-xs text-fg-muted block mb-1.5'
          >
            Full name <span className='text-danger'>*</span>
          </label>
          <input
            id='feedback-name'
            type='text'
            value={form.name}
            onChange={(e) => update('name', e.target.value)}
            required
            minLength={2}
            maxLength={100}
            placeholder='Your name'
            className='w-full border border-stroke rounded-md px-3 py-2 text-body-xs bg-canvas text-fg placeholder:text-fg-subtle focus:border-brand focus:outline-none transition-colors duration-150'
          />
        </div>
        <div>
          <label
            htmlFor='feedback-email'
            className='text-body-xs text-fg-muted block mb-1.5'
          >
            Email <span className='text-danger'>*</span>
          </label>
          <input
            id='feedback-email'
            type='email'
            value={form.email}
            onChange={(e) => update('email', e.target.value)}
            required
            maxLength={254}
            placeholder='you@example.com'
            className='w-full border border-stroke rounded-md px-3 py-2 text-body-xs bg-canvas text-fg placeholder:text-fg-subtle focus:border-brand focus:outline-none transition-colors duration-150'
          />
        </div>
      </div>

      {/* Role + Organisation */}
      <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
        <div>
          <label
            htmlFor='feedback-role'
            className='text-body-xs text-fg-muted block mb-1.5'
          >
            I am a… <span className='text-danger'>*</span>
          </label>
          <select
            id='feedback-role'
            value={form.role}
            onChange={(e) => update('role', e.target.value)}
            required
            className='w-full border border-stroke rounded-md px-3 py-2 text-body-xs bg-canvas text-fg focus:border-brand focus:outline-none transition-colors duration-150 cursor-pointer'
          >
            <option value='' disabled>
              Select…
            </option>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label
            htmlFor='feedback-org'
            className='text-body-xs text-fg-muted block mb-1.5'
          >
            Organisation
            <span className='text-fg-subtle ml-2'>(optional)</span>
          </label>
          <input
            id='feedback-org'
            type='text'
            value={form.organisation}
            onChange={(e) => update('organisation', e.target.value)}
            maxLength={200}
            placeholder='Your organisation or company'
            className='w-full border border-stroke rounded-md px-3 py-2 text-body-xs bg-canvas text-fg placeholder:text-fg-subtle focus:border-brand focus:outline-none transition-colors duration-150'
          />
        </div>
      </div>

      {/* Message */}
      <div>
        <label
          htmlFor='feedback-message'
          className='text-body-xs text-fg-muted block mb-1.5'
        >
          Message <span className='text-danger'>*</span>
        </label>
        <textarea
          id='feedback-message'
          value={form.message}
          onChange={(e) => update('message', e.target.value)}
          required
          rows={6}
          minLength={10}
          maxLength={5000}
          placeholder='Tell us who you are and why you are reaching out…'
          className='w-full border border-stroke rounded-md px-3 py-2 text-body-xs bg-canvas text-fg placeholder:text-fg-subtle focus:border-brand focus:outline-none transition-colors duration-150 resize-none'
        />
        <p className='text-caption text-fg-subtle mt-1'>
          {form.message.length}/5000
        </p>
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
          disabled={loading}
          className='inline-flex items-center gap-2 bg-brand text-white px-6 py-2.5 rounded-md text-[14px] font-medium hover:bg-brand-dark transition-colors duration-150 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed'
        >
          {loading ? (
            <>
              <IconLoader2
                size={15}
                className='animate-spin'
                aria-hidden='true'
              />
              Sending…
            </>
          ) : (
            <>
              Send message
              <IconArrowRight size={15} aria-hidden='true' />
            </>
          )}
        </button>
      </div>
    </form>
  );
}
