// src/components/layout/NavAuthButton.tsx

/**
 * NavAuthButton is a client component that manages authentication state for the navigation bar. It displays the user's initials and a sign-out button when authenticated, and a sign-in button that triggers an AuthModal when not authenticated.
 *
 * It uses the Supabase client to check the current authentication state on mount and listens for auth state changes to keep the UI in sync. When the user is authenticated, it fetches their display name from the database to show in the nav.
 *
 * @see src/app/api/profile/route.ts for how profile updates are handled server-side
 * @see src/app/(public)/profile/page.tsx for how the profile page is rendered and how data is fetched server-side
 * @see src/components/profile/ProfileForm.tsx for how the user's display name is edited and updated
 */

'use client';

import { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import AuthModal from '@/components/auth/AuthModal';
import { getInitials } from '@/components/profile/ProfileForm';

// NavAuthButton is a client component island dropped into the server-rendered Nav.
// It owns auth state for the nav — everything else in Nav stays as a server component.
export default function NavAuthButton() {
  const [user, setUser] = useState<User | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    // Hydrate auth state immediately from the current session
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      if (data.user) fetchDisplayName(data.user.id);
    });

    // Keep state in sync across tab focus, sign-in redirects, etc.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchDisplayName(session.user.id);
      else setDisplayName(null);
    });

    async function fetchDisplayName(userId: string) {
      const { data } = await supabase
        .from('users')
        .select('display_name')
        .eq('id', userId)
        .single();
      setDisplayName(data?.display_name ?? null);
    }

    return () => subscription.unsubscribe();
  }, []);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
  }

  if (user) {
    const initials = getInitials(displayName, user.email ?? 'U');
    return (
      <div className='flex items-center gap-2.5'>
        <a
          href='/profile'
          className='w-7 h-7 rounded-full bg-brand-light flex items-center justify-center text-caption font-medium text-brand-dark shrink-0 hover:opacity-80 transition-opacity'
          aria-label='Your profile'
        >
          {initials}
        </a>
        <button
          type='button'
          onClick={handleSignOut}
          className='text-body-xs font-medium px-3.5 py-1.5 border border-stroke rounded-md bg-transparent text-fg hover:bg-canvas-subtle transition-colors duration-150 cursor-pointer'
        >
          Sign out
        </button>
      </div>
    );
  }

  return (
    <>
      <button
        type='button'
        onClick={() => setShowModal(true)}
        className='text-body-xs font-medium px-3.5 py-1.5 border border-stroke rounded-md bg-transparent text-fg hover:bg-canvas-subtle transition-colors duration-150 cursor-pointer'
      >
        Sign in
      </button>
      {showModal && <AuthModal onClose={() => setShowModal(false)} />}
    </>
  );
}
