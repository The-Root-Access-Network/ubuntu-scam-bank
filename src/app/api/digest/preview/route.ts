// src/app/api/digest/preview/route.ts

/**
 * GET /api/digest/preview
 *
 * Generates digest content for the past N days (default 14 — fortnightly).
 * Returns top reports, community stats, and the period covered.
 * Moderator-only — used to populate the Resend Broadcast draft.
 *
 * Query params:
 *   days=14   — number of days to look back (default 14)
 */

import { NextRequest } from 'next/server';
import { requireModerator } from '@/lib/ops/requireModerator';
import { createAdminClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const moderator = await requireModerator();
  if (moderator instanceof Response) return moderator;

  const sp = new URL(request.url).searchParams;
  const days = Math.min(90, Math.max(1, parseInt(sp.get('days') ?? '14', 10)));
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const admin = createAdminClient();

  const [topReports, totalReports, totalConfirms, newUsers, countryResult] =
    await Promise.all([
      // Top 5 most confirmed reports in the period
      admin
        .from('reports')
        .select(
          'id, type, severity, summary, confirm_count, country_code, published_at',
        )
        .eq('status', 'published')
        .gte('published_at', since)
        .order('confirm_count', { ascending: false })
        .limit(5),

      // Total reports published in the period
      admin
        .from('reports')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'published')
        .gte('published_at', since),

      // Total confirm votes cast in the period
      admin
        .from('votes')
        .select('*', { count: 'exact', head: true })
        .eq('vote', 'confirm')
        .gte('voted_at', since),

      // New users in the period
      admin
        .from('users')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', since),

      // Countries represented in reports this period
      admin
        .from('reports')
        .select('country_code')
        .eq('status', 'published')
        .gte('published_at', since)
        .not('country_code', 'is', null),
    ]);

  const uniqueCountries = new Set(
    (countryResult.data ?? []).map((r) => r.country_code),
  ).size;

  const periodStart = new Date(since).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const periodEnd = new Date().toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return Response.json({
    period: { days, from: periodStart, to: periodEnd, since },
    stats: {
      reports_published: totalReports.count ?? 0,
      confirms_cast: totalConfirms.count ?? 0,
      new_users: newUsers.count ?? 0,
      countries_active: uniqueCountries,
    },
    top_reports: (topReports.data ?? []).map((r) => ({
      id: r.id,
      type: r.type,
      severity: r.severity,
      summary: r.summary,
      confirm_count: r.confirm_count,
      country_code: r.country_code,
      url: `https://scambank.ubuntubridgeinitiatives.org/reports/${r.id}`,
    })),
  });
}
