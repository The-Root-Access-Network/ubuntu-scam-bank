// src/lib/utils.ts
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
};
