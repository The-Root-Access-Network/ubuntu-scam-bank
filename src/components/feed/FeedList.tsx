// src/components/feed/FeedList.tsx

'use client';

import { useState } from 'react';
import { IconCheck, IconEye } from '@tabler/icons-react';
import { relativeTime, SEVERITY_LABELS, TYPE_META } from '@/lib/utils';
import type { Tables } from '@/types/database';

type FeedReport = Pick<
  Tables<'reports'>,
  | 'id'
  | 'type'
  | 'severity'
  | 'country_code'
  | 'summary'
  | 'confirm_count'
  | 'view_count'
  | 'submitted_at'
>;

const TABS: { label: string; filter: string | string[] | null }[] = [
  { label: 'All', filter: null },
  { label: 'Phishing', filter: 'phishing_email' },
  { label: 'Smishing', filter: 'smishing' },
  {
    label: 'Fraud',
    filter: ['investment_fraud', 'crypto_fraud', 'romance_scam'],
  },
];

export default function FeedList({ reports }: { reports: FeedReport[] }) {
  const [activeTab, setActiveTab] = useState('All');

  const filtered = reports.filter((r) => {
    const tab = TABS.find((t) => t.label === activeTab);
    if (!tab || tab.filter === null) return true;
    if (Array.isArray(tab.filter)) return tab.filter.includes(r.type);
    return r.type === tab.filter;
  });

  return (
    <>
      {/* Tabs */}
      <div className='flex gap-1 mb-3.5'>
        {TABS.map(({ label }) => (
          <button
            key={label}
            type='button'
            onClick={() => setActiveTab(label)}
            className={[
              'text-[12px] px-3 py-1.5 rounded-md border transition-colors duration-150 cursor-pointer',
              activeTab === label
                ? 'bg-canvas-subtle border-stroke text-fg'
                : 'bg-transparent border-transparent text-fg-muted hover:text-fg',
            ].join(' ')}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Empty state */}
      {filtered.length === 0 ? (
        <p className='text-body-xs text-fg-muted text-center py-8'>
          No reports yet — be the first to submit one.
        </p>
      ) : (
        <div>
          {filtered.map((report, i) => {
            const meta = TYPE_META[report.type] ?? TYPE_META.other;
            const timeStr = relativeTime(report.submitted_at);
            const loc = report.country_code ? ` · ${report.country_code}` : '';

            return (
              <div
                key={report.id}
                className={[
                  'py-3',
                  i < filtered.length - 1 ? 'border-b border-stroke-faint' : '',
                ].join(' ')}
              >
                {/* Top row */}
                <div className='flex items-center justify-between mb-1.5'>
                  <span
                    className={`text-caption font-medium px-2 py-0.5 rounded-full ${meta.classes}`}
                  >
                    {meta.label}
                  </span>
                  <span className='text-caption text-fg-subtle'>
                    {timeStr}
                    {loc}
                  </span>
                </div>

                {/* Summary */}
                <p className='text-body-xs text-fg leading-[1.5] mb-1.5'>
                  {report.summary ?? 'No summary available.'}
                </p>

                {/* Meta row */}
                <div className='flex items-center gap-3 text-caption text-fg-muted'>
                  <span className='flex items-center gap-1'>
                    <IconEye size={12} aria-hidden='true' />
                    {report.view_count.toLocaleString()} views
                  </span>
                  <span className='flex items-center gap-1'>
                    <IconCheck size={12} aria-hidden='true' />
                    {report.confirm_count} confirmed
                  </span>
                  <span>
                    Severity: {SEVERITY_LABELS[report.severity] ?? '—'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
