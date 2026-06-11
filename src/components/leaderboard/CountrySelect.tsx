// src/components/leaderboard/CountrySelect.tsx

'use client';

import { useRouter } from 'next/navigation';
import countryData from '@/lib/countries-data.json';

interface Props {
  // The current tab value from searchParams — a 2-char country code,
  // 'global', 'monthly', or undefined. Used to set the selected option.
  currentTab: string;
}

export default function CountrySelect({ currentTab }: Props) {
  const router = useRouter();

  // Determine selected value: a 2-char code that isn't a reserved tab = country filter.
  // Everything else (global, monthly, or absent) = empty string = "All countries".
  const isCountryTab =
    currentTab.length === 2 &&
    currentTab !== 'global' &&
    currentTab !== 'monthly';
  const selected = isCountryTab ? currentTab.toUpperCase() : '';

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const value = e.target.value;
    if (!value) {
      router.push('/leaderboard');
    } else {
      router.push(`/leaderboard?tab=${value}`);
    }
  }

  return (
    <select
      value={selected}
      onChange={handleChange}
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
  );
}
