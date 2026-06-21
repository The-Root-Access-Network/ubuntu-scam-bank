// src/components/ops/UserSearch.tsx

'use client';

import { useState, useMemo } from 'react';
import { IconSearch } from '@tabler/icons-react';
import UserActions from './UserActions';
import { BADGE_META } from '@/lib/utils';

export interface UserRow {
  id: string;
  username: string;
  display_name: string | null;
  badge: string;
  country_code: string | null;
  points: number;
  created_at: string;
  email: string | null;
  is_moderator: boolean;
  banned_until: string | null; // from auth.users
}

export default function UserSearch({ users }: { users: UserRow[] }) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return users;
    return users.filter(
      (u) =>
        u.username.toLowerCase().includes(q) ||
        (u.display_name ?? '').toLowerCase().includes(q) ||
        (u.email ?? '').toLowerCase().includes(q),
    );
  }, [users, query]);

  function isBanned(user: UserRow): boolean {
    if (!user.banned_until) return false;
    return new Date(user.banned_until) > new Date();
  }

  return (
    <>
      {/* Search */}
      <div className='relative mb-4'>
        <IconSearch
          size={14}
          className='absolute left-3 top-1/2 -translate-y-1/2 text-fg-muted'
          aria-hidden='true'
        />
        <input
          type='text'
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder='Search by username, display name, or email…'
          className='w-full pl-9 pr-3 py-2 border border-stroke rounded-md text-body-xs bg-canvas text-fg placeholder:text-fg-subtle focus:border-brand focus:outline-none transition-colors duration-150'
        />
      </div>

      {/* Table */}
      <div className='bg-canvas border border-stroke-faint rounded-lg overflow-hidden'>
        {/* Header */}
        <div className='grid grid-cols-[1fr_110px_70px_160px] gap-3 px-4 py-2.5 border-b border-stroke-faint bg-canvas-subtle'>
          <div className='text-caption-sm text-fg-muted uppercase tracking-label'>
            User
          </div>
          <div className='text-caption-sm text-fg-muted uppercase tracking-label'>
            Badge
          </div>
          <div className='text-caption-sm text-fg-muted uppercase tracking-label text-right'>
            Points
          </div>
          {/* <div className='text-caption-sm text-fg-muted uppercase tracking-label'>
            Country
          </div> */}
          <div className='text-caption-sm text-fg-muted uppercase tracking-label'>
            Actions
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className='py-10 text-center'>
            <p className='text-body-sm text-fg-muted'>
              No users match your search.
            </p>
          </div>
        ) : (
          filtered.map((user, i) => {
            const badge = BADGE_META[user.badge] ?? BADGE_META.watcher;
            const banned = isBanned(user);
            return (
              <div
                key={user.id}
                className={[
                  'grid grid-cols-[1fr_110px_70px_160px] gap-3 px-4 py-3 items-start',
                  i < filtered.length - 1 ? 'border-b border-stroke-faint' : '',
                ].join(' ')}
              >
                {/* User */}
                <div className='min-w-0'>
                  <p className='text-body-xs font-medium text-fg truncate'>
                    {user.display_name ?? user.username}
                  </p>
                  <p className='text-caption text-fg-muted truncate'>
                    @{user.username} {user.country_code ? `· ${user.country_code}` : ''}
                  </p>
                  {user.email && (
                    <p className='text-caption text-fg-subtle truncate'>
                      {user.email}
                    </p>
                  )}
                  <p className='text-[10px] text-fg-subtle mt-0.5'>
                    Joined{' '}
                    {new Date(user.created_at).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </p>
                </div>

                {/* Badge */}
                <div>
                  <span
                    className={`text-caption-sm font-medium px-2 py-0.5 rounded-full ${badge.classes}`}
                  >
                    {badge.label}
                  </span>
                </div>

                {/* Points */}
                <div className='text-body-xs text-fg text-right'>
                  {user.points.toLocaleString()}
                </div>

                {/* Country */}
                {/* <div className='text-body-xs text-fg-muted'>
                  {user.country_code ?? '—'}
                </div> */}

                {/* Actions */}
                <div>
                  <UserActions
                    userId={user.id}
                    username={user.username}
                    // email={user.email ?? ''}
                    isBanned={banned}
                    isModerator={user.is_moderator}
                  />
                </div>
              </div>
            );
          })
        )}
      </div>

      <p className='text-caption-sm text-fg-subtle text-center mt-3'>
        Showing {filtered.length} of {users.length} users
      </p>
    </>
  );
}
