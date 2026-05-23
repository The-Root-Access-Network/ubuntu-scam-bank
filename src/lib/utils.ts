// src/lib/utils.ts

/**
 * Utility functions and constants used across the app, including:
 * - cn: a helper for merging Tailwind class names conditionally
 * - relativeTime: formats timestamps into human-readable relative time labels
 * - SEVERITY_LABELS: maps report severity levels to display labels
 * - TYPE_META: maps report types to display labels and badge classes
 * - BADGE_META: maps user badge tiers to display labels and pill classes
 * - getInitials: derives user initials from their display name or username
 *
 * These utilities are imported and used in various components:
 * @see src/components/layout/NavAuthButton.tsx for how getInitials is used to show the user's initials in the nav when authenticated
 * @see src/components/layout/Sidebar.tsx for how getInitials and BADGE_META are used to render the leaderboard sidebar with user badges and initials
 * @see src/components/profile/ProfileForm.tsx for how BADGE_META is used to show the user's badge on their profile page
 * @see src/app/(public)/profile/page.tsx for how getInitials is used to show the user's initials on their profile page
 */

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Formats a date string into a human-readable relative time label.
// Used on feed items and anywhere a timestamp needs to read naturally.
export function relativeTime(dateString: string): string {
  const diff = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hr ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)} days ago`;
  return new Date(dateString).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
  });
}

// Display label for each severity level (1–5).
export const SEVERITY_LABELS: Record<number, string> = {
  1: 'Low',
  2: 'Mild',
  3: 'Moderate',
  4: 'High',
  5: 'Critical',
};

// Maps every report type value → display label + Tailwind badge colour classes.
export const TYPE_META: Record<string, { label: string; classes: string }> = {
  phishing_email: {
    label: 'Phishing email',
    classes: 'bg-phishing-bg text-phishing',
  },
  smishing: { label: 'Smishing', classes: 'bg-smishing-bg text-smishing' },
  investment_fraud: {
    label: 'Investment fraud',
    classes: 'bg-fraud-bg text-fraud',
  },
  romance_scam: { label: 'Romance scam', classes: 'bg-fraud-bg text-fraud' },
  business_email_compromise: {
    label: 'Business email',
    classes: 'bg-bec-bg text-bec',
  },
  tech_support: {
    label: 'Tech support',
    classes: 'bg-neutral-100 text-neutral-600',
  },
  crypto_fraud: { label: 'Crypto fraud', classes: 'bg-fraud-bg text-fraud' },
  vishing: { label: 'Vishing', classes: 'bg-neutral-100 text-neutral-600' },
  other: { label: 'Other', classes: 'bg-neutral-100 text-neutral-600' },
};

// Maps badge tier values → display label + Tailwind pill colour classes.
export const BADGE_META: Record<string, { label: string; classes: string }> = {
  watcher: { label: 'Watcher', classes: 'bg-watcher-bg text-watcher' },
  guardian: { label: 'Guardian', classes: 'bg-guardian-bg text-guardian' },
  sentinel: { label: 'Sentinel', classes: 'bg-sentinel-bg text-sentinel' },
  elite_sentinel: {
    label: 'Elite Sentinel',
    classes: 'bg-elite-bg text-elite',
  },
  sage: { label: 'Sage', classes: 'bg-elite-bg text-elite' },
};

// Derives initials from display_name (two-word aware) or falls back to username.
// Used in nav avatar, leaderboard sidebar, and profile page.
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
