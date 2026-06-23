// src/components/feed/FeedSection.tsx

import Link from 'next/link';
import FeedList from './FeedList';
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

export default function FeedSection({ reports }: { reports: FeedReport[] }) {
  return (
    <div
      className='bg-canvas border border-stroke-faint rounded-lg p-5'
      id='feed'
    >
      <p className='text-label text-fg-muted uppercase tracking-label mb-3.5'>
        Latest reports
      </p>
      <FeedList reports={reports} />
      {reports.length > 0 && (
        <div className='mt-4 pt-3.5 border-t border-stroke-faint'>
          <Link
            href='/reports'
            className='text-body-xs font-medium text-brand hover:text-brand-dark transition-colors duration-150'
          >
            View all reports →
          </Link>
        </div>
      )}
    </div>
  );
}
