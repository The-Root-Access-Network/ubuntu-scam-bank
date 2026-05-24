// src/lib/countries.ts

/**
 * This module provides utilities for working with country names and ISO codes.
 * It uses the 'i18n-iso-countries' library to get country names and codes.
 * Single source of truth for country data across the app.
 * Replaces the hardcoded COUNTRIES array in SubmissionForm.tsx
 * and the COUNTRY_CODES map in /api/submit/route.ts
 */

import countries from 'i18n-iso-countries';
import enLocale from 'i18n-iso-countries/langs/en.json';

countries.registerLocale(enLocale);

// { NG: 'Nigeria', GB: 'United Kingdom', ... }
const codeToName = countries.getNames('en', { select: 'official' });

// Sorted alphabetically by display name
export const COUNTRY_OPTIONS: { code: string; name: string }[] = Object.entries(
  codeToName,
)
  .map(([code, name]) => ({ code, name }))
  .sort((a, b) => a.name.localeCompare(b.name));

// Look up ISO code by display name — used in submit route
// e.g. nameToCode('Nigeria') → 'NG'
export function nameToCode(name: string): string | null {
  const match = COUNTRY_OPTIONS.find((c) => c.name === name);
  return match?.code ?? null;
}

// Look up display name by ISO code — used in UI where needed
// e.g. codeToDisplayName('NG') → 'Nigeria'
export function codeToDisplayName(code: string): string | null {
  return codeToName[code] ?? null;
}

// Detect country from browser locale — falls back to empty string if unavailable
// navigator.language returns e.g. 'en-GB', 'en-NG', 'fr-FR'
// The second segment is the ISO country code
export function detectCountryFromLocale(): string {
  if (typeof navigator === 'undefined') return '';
  const parts = navigator.language?.split('-');
  if (!parts || parts.length < 2) return '';
  const code = parts[parts.length - 1].toUpperCase();
  return codeToName[code] ? codeToName[code] : '';
}
