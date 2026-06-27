// src/components/auth/AuthModal.tsx

'use client';

import { useState } from 'react';
import { IconX, IconShieldCheck } from '@tabler/icons-react';
import { createClient } from '@/lib/supabase/client';

interface AuthModalProps {
  onClose: () => void;
}

type Mode = 'signin' | 'signup';

const GoogleIcon = () => (
  <svg className='h-5 w-5' viewBox='0 0 24 24'>
    <path
      d='M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z'
      fill='#4285F4'
    />
    <path
      d='M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z'
      fill='#34A853'
    />
    <path
      d='M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z'
      fill='#FBBC05'
    />
    <path
      d='M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z'
      fill='#EA4335'
    />
  </svg>
);

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
          <GoogleIcon />
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
