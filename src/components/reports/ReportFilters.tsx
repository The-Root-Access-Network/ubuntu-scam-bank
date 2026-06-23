// src/components/reports/ReportFilters.tsx

'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import countryData from '@/lib/countries-data.json';

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
      <select
        value={currentCountry}
        onChange={(e) => router.push(buildUrl({ country: e.target.value }))}
        aria-label='Filter by country'
        className='text-body-xs border border-stroke rounded-md px-3 py-1.5 bg-canvas text-fg focus:border-brand focus:outline-none transition-colors duration-150 cursor-pointer'
      >
        <option value=''>All countries</option>
        {countryData.map(({ code, name }) => (
          <option key={code} value={code}>
            {name}
          </option>
        ))}
      </select>

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
