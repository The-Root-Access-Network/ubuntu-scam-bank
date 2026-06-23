// src/components/reports/ReportFilters.tsx

'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

const SCAM_TYPES = [
  { value: '', label: 'All types' },
  { value: 'phishing_email', label: 'Phishing email' },
  { value: 'smishing', label: 'Smishing' },
  { value: 'investment_fraud', label: 'Investment fraud' },
  { value: 'romance_scam', label: 'Romance scam' },
  { value: 'tech_support', label: 'Tech support' },
  { value: 'business_email_compromise', label: 'Business email' },
  { value: 'crypto_fraud', label: 'Crypto fraud' },
  { value: 'vishing', label: 'Vishing' },
  { value: 'other', label: 'Other' },
];

interface ReportFiltersProps {
  currentType: string;
  currentCountry: string;
}

export default function ReportFilters({
  currentType,
  currentCountry,
}: ReportFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function buildUrl(updates: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    // Reset to page 1 on any filter change
    params.delete('page');
    Object.entries(updates).forEach(([key, value]) => {
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    });
    return `/reports?${params.toString()}`;
  }

  const hasFilters = !!(currentType || currentCountry);

  return (
    <div className='flex flex-wrap items-center gap-2 mb-5'>
      {/* Type filter */}
      <select
        value={currentType}
        onChange={(e) => router.push(buildUrl({ type: e.target.value }))}
        aria-label='Filter by scam type'
        className='text-body-xs border border-stroke rounded-md px-3 py-1.5 bg-canvas text-fg focus:border-brand focus:outline-none transition-colors duration-150 cursor-pointer'
      >
        {SCAM_TYPES.map(({ value, label }) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>

      {/* Country filter */}
      <input
        type='text'
        value={currentCountry}
        onChange={(e) =>
          router.push(
            buildUrl({ country: e.target.value.toUpperCase().slice(0, 2) }),
          )
        }
        placeholder='Country (e.g. NG)'
        maxLength={2}
        aria-label='Filter by country code'
        className='text-body-xs border border-stroke rounded-md px-3 py-1.5 w-36 bg-canvas text-fg placeholder:text-fg-subtle focus:border-brand focus:outline-none transition-colors duration-150 uppercase'
      />

      {/* Clear filters */}
      {hasFilters && (
        <Link
          href='/reports'
          className='text-body-xs text-fg-muted hover:text-fg transition-colors duration-150'
        >
          Clear filters
        </Link>
      )}
    </div>
  );
}
