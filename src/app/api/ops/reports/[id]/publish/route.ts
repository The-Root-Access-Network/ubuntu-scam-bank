// src/app/api/ops/reports/[id]/publish/route.ts

/**
 * Ops moderation queue — publish report route.
 * Layer 3: independent moderator check.
 * Publishes a report with status 'pending' or 'under_review' via admin client.
 * Returns JSON response with success or error message.
 */

import { NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { requireModerator } from '@/lib/ops/requireModerator';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const moderator = await requireModerator();
  if (moderator instanceof Response) return moderator;

  const { id } = await params;
  if (!UUID_RE.test(id)) {
    return Response.json(
      { success: false, error: 'Invalid report ID.' },
      { status: 400 },
    );
  }

  const admin = createAdminClient();

  const { data: report } = await admin
    .from('reports')
    .select('id, status')
    .eq('id', id)
    .in('status', ['pending', 'under_review'])
    .single();

  if (!report) {
    return Response.json(
      { success: false, error: 'Report not found or not in queue.' },
      { status: 404 },
    );
  }

  const now = new Date().toISOString();

  const { error } = await admin
    .from('reports')
    .update({
      status: 'published',
      published_at: now,
      moderated_by: moderator.user.id,
      moderated_at: now,
    })
    .eq('id', id);

  if (error) {
    console.error('[ops/reports/publish] update failed:', error);
    return Response.json(
      { success: false, error: 'Publish failed.' },
      { status: 500 },
    );
  }

  return Response.json({ success: true });
}
