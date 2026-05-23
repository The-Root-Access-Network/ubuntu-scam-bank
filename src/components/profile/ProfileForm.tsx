// src/components/profile/ProfileForm.tsx

/**
 * ProfileForm is a client component that renders the editable form on the /profile page.
 * It receives the user's profile data as props from the server-rendered page component.
 * On save, it sends a PATCH request to /api/profile to update the user's info in the database.
 * After a successful update, it triggers a refresh of the parent server component to show the updated data.
 * The form includes client-side validation and shows loading, success, and error states.
 * @param user - the user's profile data fetched from the database, passed down from the server component
 * @returns JSX.Element
 * @see src/app/(public)/profile/page.tsx for how this component is used and how data is fetched server-side
 * @see src/app/api/profile/route.ts for the API route that handles profile updates
 * @see src/components/layout/NavAuthButton.tsx for how the user's display name is fetched and used in the nav
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { IconCheck, IconLoader2 } from '@tabler/icons-react';
import { COUNTRY_OPTIONS } from '@/lib/countries';
import { BADGE_META } from '@/lib/utils';
import type { Database } from '@/types/database';

type UserRow = Pick<
  Database['public']['Tables']['users']['Row'],
  'username' | 'display_name' | 'bio' | 'country_code' | 'points' | 'badge'
>;

// Derives initials from display_name (two-word aware) or falls back to username.
export function getInitials(
  displayName: string | null,
  username: string,
): string {
  const source = displayName?.trim() || username;
  const parts = source.split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
}

export default function ProfileForm({ user }: { user: UserRow }) {
  const router = useRouter();

  const [displayName, setDisplayName] = useState(user.display_name ?? '');
  const [bio, setBio] = useState(user.bio ?? '');
  const [country, setCountry] = useState<string>(() => {
    // Resolve stored country_code back to a display name for the select
    const match = COUNTRY_OPTIONS.find((c) => c.code === user.country_code);
    return match?.name ?? '';
  });

  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initials = getInitials(displayName || user.display_name, user.username);
  const badge = BADGE_META[user.badge] ?? BADGE_META.watcher;

  async function handleSave() {
    setLoading(true);
    setError(null);
    setSaved(false);

    const res = await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        display_name: displayName,
        bio,
        country,
      }),
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      setError(data.error ?? 'Update failed. Please try again.');
    } else {
      setSaved(true);
      router.refresh(); // re-fetches server component data
      setTimeout(() => setSaved(false), 3000);
    }

    setLoading(false);
  }

  return (
    <div className='grid grid-cols-1 lg:grid-cols-[auto_1fr] gap-8 lg:gap-12'>
      {/* ── Left — avatar + stats ───────────────────────────────────────── */}
      <div className='flex flex-col items-center lg:items-start gap-4 lg:w-48'>
        {/* Avatar */}
        <div className='w-20 h-20 rounded-full bg-brand-light flex items-center justify-center text-[28px] font-medium text-brand-dark'>
          {initials}
        </div>

        {/* Username — not editable */}
        <div className='text-center lg:text-left'>
          <p className='text-body-sm font-medium text-fg'>{user.username}</p>
          <span
            className={`inline-block mt-1 text-caption font-medium px-2.5 py-0.5 rounded-full ${badge.classes}`}
          >
            {badge.label}
          </span>
        </div>

        {/* Points */}
        <div className='bg-canvas-subtle border border-stroke-faint rounded-lg p-3 w-full text-center'>
          <p className='text-[24px] font-medium text-brand'>
            {user.points.toLocaleString()}
          </p>
          <p className='text-caption text-fg-muted mt-0.5'>shield points</p>
        </div>
      </div>

      {/* ── Right — edit form ───────────────────────────────────────────── */}
      <div className='flex flex-col gap-5'>
        {/* Display name */}
        <div>
          <label
            htmlFor='display-name'
            className='text-[13px] text-fg-muted block mb-1.5'
          >
            Display name
            <span className='text-fg-subtle ml-2'>(shown on leaderboard)</span>
          </label>
          <input
            id='display-name'
            type='text'
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            maxLength={50}
            placeholder='Your name'
            className='w-full border border-stroke rounded-md px-3 py-2 text-body-xs bg-canvas text-fg placeholder:text-fg-subtle focus:border-brand focus:outline-none transition-colors duration-150'
          />
          <p className='text-caption text-fg-subtle mt-1'>
            {displayName.length}/50 characters
          </p>
        </div>

        {/* Bio */}
        <div>
          <label
            htmlFor='bio'
            className='text-[13px] text-fg-muted block mb-1.5'
          >
            Bio
            <span className='text-fg-subtle ml-2'>(optional)</span>
          </label>
          <textarea
            id='bio'
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            maxLength={300}
            rows={3}
            placeholder='A short description — your role, why you report scams, where you work…'
            className='w-full border border-stroke rounded-md px-3 py-2 text-body-xs bg-canvas text-fg placeholder:text-fg-subtle focus:border-brand focus:outline-none transition-colors duration-150 resize-none'
          />
          <p className='text-caption text-fg-subtle mt-1'>
            {bio.length}/300 characters
          </p>
        </div>

        {/* Country */}
        <div>
          <label
            htmlFor='profile-country'
            className='text-[13px] text-fg-muted block mb-1.5'
          >
            Country
          </label>
          <select
            id='profile-country'
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className='w-full border border-stroke rounded-md px-3 py-2 text-body-xs bg-canvas text-fg focus:border-brand focus:outline-none transition-colors duration-150 cursor-pointer'
          >
            <option value=''>Select your country</option>
            {COUNTRY_OPTIONS.map(({ code, name }) => (
              <option key={code} value={name}>
                {name}
              </option>
            ))}
          </select>
        </div>

        {/* Username note */}
        <div className='bg-canvas-subtle border border-stroke-faint rounded-md px-3.5 py-3'>
          <p className='text-[13px] text-fg-muted leading-relaxed'>
            <span className='font-medium text-fg'>Username: </span>
            {user.username}
            <span className='text-fg-subtle ml-2'>
              — set automatically on first sign-in, not editable
            </span>
          </p>
        </div>

        {/* Error */}
        {error && (
          <p className='text-[13px] text-danger-text bg-danger-bg rounded-md px-3 py-2'>
            {error}
          </p>
        )}

        {/* Save button */}
        <div className='flex items-center gap-3'>
          <button
            type='button'
            onClick={handleSave}
            disabled={loading}
            className='inline-flex items-center gap-2 bg-brand text-white px-5 py-2.5 rounded-md text-[14px] font-medium hover:bg-brand-dark transition-colors duration-150 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed'
          >
            {loading ? (
              <>
                <IconLoader2
                  size={15}
                  className='animate-spin'
                  aria-hidden='true'
                />
                Saving…
              </>
            ) : saved ? (
              <>
                <IconCheck size={15} aria-hidden='true' />
                Saved
              </>
            ) : (
              'Save changes'
            )}
          </button>
          {saved && <p className='text-[13px] text-brand'>Profile updated.</p>}
        </div>
      </div>
    </div>
  );
}
