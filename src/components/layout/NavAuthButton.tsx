// src/components/layout/NavAuthButton.tsx

'use client';

import { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import AuthModal from '@/components/auth/AuthModal';

// NavAuthButton is a client component island dropped into the server-rendered Nav.
// It owns auth state for the nav — everything else in Nav stays as a server component.
export default function NavAuthButton() {
  const [user, setUser] = useState<User | null>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    // Hydrate auth state immediately from the current session
    supabase.auth.getUser().then(({ data }) => setUser(data.user));

    // Keep state in sync across tab focus, sign-in redirects, etc.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) =>
      setUser(session?.user ?? null),
    );

    return () => subscription.unsubscribe();
  }, []);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
  }

  if (user) {
    return (
      <div className='flex items-center gap-2.5'>
        {/* Avatar derived from email initials */}
        <div className='w-7 h-7 rounded-full bg-brand-light flex items-center justify-center text-caption text-brand-dark shrink-0'>
          {user.email?.slice(0, 2).toUpperCase()}
        </div>
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
