// src/components/leaderboard/MonthSelect.tsx

'use client';

import { useRouter } from 'next/navigation';

interface Props {
  // Current selected month in YYYY-MM format. Defaults to current month
  // when the month searchParam is absent.
  selectedMonth: string;
}

// Launch month — the earliest selectable option.
const LAUNCH_MONTH = '2026-05';

// Generate all months from launch through the current month, descending
// (most recent first so the default sits at the top of the list).
function generateMonthOptions(): { value: string; label: string }[] {
  const options: { value: string; label: string }[] = [];

  const now = new Date();
  // Clamp to the first of the current month in UTC to avoid timezone edge cases.
  let cursor = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const [launchYear, launchMonth] = LAUNCH_MONTH.split('-').map(Number);
  const launch = new Date(Date.UTC(launchYear, launchMonth - 1, 1));

  while (cursor >= launch) {
    const year = cursor.getUTCFullYear();
    const month = cursor.getUTCMonth(); // 0-indexed
    const value = `${year}-${String(month + 1).padStart(2, '0')}`;
    const label = cursor.toLocaleDateString('en-GB', {
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    });
    options.push({ value, label });
    // Step back one month
    cursor = new Date(Date.UTC(year, month - 1, 1));
  }

  return options;
}

const MONTH_OPTIONS = generateMonthOptions();

export default function MonthSelect({ selectedMonth }: Props) {
  const router = useRouter();

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    router.push(`/leaderboard?tab=monthly&month=${e.target.value}`);
  }

  return (
    <select
      value={selectedMonth}
      onChange={handleChange}
      aria-label='Select month'
      className='text-body-xs border border-stroke rounded-md px-3 py-1.5 bg-canvas text-fg focus:border-brand focus:outline-none transition-colors duration-150 cursor-pointer'
    >
      {MONTH_OPTIONS.map(({ value, label }) => (
        <option key={value} value={value}>
          {label}
        </option>
      ))}
    </select>
  );
}
