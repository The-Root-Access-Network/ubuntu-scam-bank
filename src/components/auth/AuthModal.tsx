// src/components/auth/AuthModal.tsx

'use client';

import { useState } from 'react';
import { IconX, IconBrandGoogle, IconShieldCheck } from '@tabler/icons-react';
import { createClient } from '@/lib/supabase/client';

interface AuthModalProps {
  onClose: () => void;
}

type Mode = 'signin' | 'signup';

export default function AuthModal({ onClose }: AuthModalProps) {
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const supabase = createClient();

  async function handleGoogleSignIn() {
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) {
      setError(error.message);
      setLoading(false);
    }
    // On success the browser navigates away — no need to close the modal
  }

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    if (mode === 'signin') {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        setError(error.message);
      } else {
        onClose();
      }
    } else {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) {
        setError(error.message);
      } else {
        setSuccess('Check your email to confirm your account.');
      }
    }

    setLoading(false);
  }

  function switchMode() {
    setMode((m) => (m === 'signin' ? 'signup' : 'signin'));
    setError(null);
    setSuccess(null);
  }

  return (
    // Backdrop — clicking outside closes the modal
    <div
      className='fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm'
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className='bg-canvas rounded-xl border border-stroke-faint shadow-raised w-full max-w-sm p-6 relative'>
        {/* Close button */}
        <button
          type='button'
          onClick={onClose}
          aria-label='Close'
          className='absolute top-4 right-4 text-fg-muted hover:text-fg transition-colors duration-150 cursor-pointer'
        >
          <IconX size={18} />
        </button>

        {/* Logo + heading */}
        <div className='flex flex-col items-center mb-6'>
          <div className='w-10 h-10 bg-brand rounded-xl flex items-center justify-center mb-3'>
            <IconShieldCheck size={22} color='white' strokeWidth={2.5} />
          </div>
          <h2 className='text-body-lg font-medium text-fg'>
            {mode === 'signin' ? 'Welcome back' : 'Join UbuntuScamBank'}
          </h2>
          <p className='text-body-sm text-fg-muted mt-1 text-center leading-relaxed'>
            {mode === 'signin'
              ? 'Sign in to track your score and submit reports'
              : 'Start reporting scams and protecting your community'}
          </p>
        </div>

        {/* Google OAuth — primary action */}
        <button
          type='button'
          onClick={handleGoogleSignIn}
          disabled={loading}
          className='w-full flex items-center justify-center gap-2.5 border border-stroke rounded-md py-2.5 text-body-sm font-medium text-fg hover:bg-canvas-subtle transition-colors duration-150 cursor-pointer disabled:opacity-60 mb-4'
        >
          <IconBrandGoogle size={18} />
          Continue with Google
        </button>

        {/* Divider */}
        <div className='flex items-center gap-3 mb-4'>
          <div className='flex-1 h-px bg-stroke-faint' />
          <span className='text-caption text-fg-subtle'>or</span>
          <div className='flex-1 h-px bg-stroke-faint' />
        </div>

        {/* Email + password form */}
        <form onSubmit={handleEmailSubmit} className='flex flex-col gap-3'>
          <div>
            <label
              htmlFor='auth-email'
              className='text-body-sm text-fg-muted block mb-1'
            >
              Email
            </label>
            <input
              id='auth-email'
              type='email'
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder='you@example.com'
              className='w-full border border-stroke rounded-md px-3 py-2 text-body-xs bg-canvas text-fg placeholder:text-fg-subtle focus:border-brand focus:outline-none transition-colors duration-150'
            />
          </div>
          <div>
            <label
              htmlFor='auth-password'
              className='text-body-xs text-fg-muted block mb-1'
            >
              Password
            </label>
            <input
              id='auth-password'
              type='password'
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder='••••••••'
              minLength={6}
              className='w-full border border-stroke rounded-md px-3 py-2 text-body-xs bg-canvas text-fg placeholder:text-fg-subtle focus:border-brand focus:outline-none transition-colors duration-150'
            />
          </div>

          {error && (
            <p className='text-body-xs font-medium text-danger-text bg-danger-bg rounded-md px-3 py-2'>
              {error}
            </p>
          )}
          {success && (
            <p className='text-body-xs font-medium text-success-text bg-success-bg rounded-md px-3 py-2'>
              {success}
            </p>
          )}

          <button
            type='submit'
            disabled={loading}
            className='w-full bg-brand text-white py-2.5 rounded-md text-body-sm font-medium hover:bg-brand-dark transition-colors duration-150 cursor-pointer disabled:opacity-60'
          >
            {loading
              ? 'Please wait…'
              : mode === 'signin'
                ? 'Sign in'
                : 'Create account'}
          </button>
        </form>

        {/* Mode toggle */}
        <p className='text-body-xs font-medium text-fg-muted text-center mt-4'>
          {mode === 'signin'
            ? "Don't have an account? "
            : 'Already have an account? '}
          <button
            type='button'
            onClick={switchMode}
            className='text-brand hover:text-brand-dark transition-colors duration-150 cursor-pointer'
          >
            {mode === 'signin' ? 'Create one' : 'Sign in'}
          </button>
        </p>
      </div>
    </div>
  );
}
