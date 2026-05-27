// src/app/api/reports/[id]/vote/route.ts

/**
 * API route for casting a vote on a report. Accepts POST requests with a JSON body:
 * {
 *   vote: 'confirm' | 'dispute'
 * }
 * The route performs the following steps:
 * 1. Authenticates the user. Only signed-in users can vote.
 * 2. Validates the request body to ensure it contains a valid 'vote' value.
 * 3. Checks that the report exists and is published.
 * 4. Ensures the user is not voting on their own report.
 * 5. Inserts a new row into the 'votes' table with the user's vote.
 *    - The (report_id, user_id) combination is unique, preventing duplicate votes.
 *    - A database trigger updates the report's confirm_count or dispute_count accordingly.
 *
 * Returns a JSON response indicating success or failure, along with appropriate error messages and HTTP status codes.
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { createClient, createAdminClient } from '@/lib/supabase/server';

const VoteSchema = z.object({
  vote: z.enum(['confirm', 'dispute']),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: reportId } = await params;

  // ── Auth ──────────────────────────────────────────────────────────────────
  const authClient = await createClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  if (!user) {
    return Response.json(
      { success: false, error: 'You must be signed in to vote.' },
      { status: 401 },
    );
  }

  // ── Validate body ─────────────────────────────────────────────────────────
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { success: false, error: 'Invalid request body.' },
      { status: 400 },
    );
  }

  const parsed = VoteSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { success: false, error: 'Vote must be "confirm" or "dispute".' },
      { status: 400 },
    );
  }

  const { vote } = parsed.data;

  // ── Guard: report must exist and be published ─────────────────────────────
  const { data: report } = await authClient
    .from('reports')
    .select('id, submitted_by')
    .eq('id', reportId)
    .eq('status', 'published')
    .single();

  if (!report) {
    return Response.json(
      { success: false, error: 'Report not found.' },
      { status: 404 },
    );
  }

  // ── Guard: cannot vote on own report ──────────────────────────────────────
  if (report.submitted_by === user.id) {
    return Response.json(
      { success: false, error: 'You cannot vote on your own report.' },
      { status: 403 },
    );
  }

  // ── Insert vote ───────────────────────────────────────────────────────────
  // The unique (report_id, user_id) constraint handles duplicate votes.
  // The sync_vote_counts trigger handles confirm_count / dispute_count.
  let admin;
  try {
    admin = createAdminClient();
  } catch (err) {
    console.error('[vote] createAdminClient failed:', err);
    return Response.json(
      { success: false, error: 'Server configuration error.' },
      { status: 500 },
    );
  }

  const { error } = await admin
    .from('votes')
    .insert({ report_id: reportId, user_id: user.id, vote });

  if (error) {
    // Unique constraint violation — user already voted
    if (error.code === '23505') {
      return Response.json(
        { success: false, error: 'You have already voted on this report.' },
        { status: 409 },
      );
    }
    console.error('[vote] Insert failed:', error);
    return Response.json(
      { success: false, error: 'Vote failed. Please try again.' },
      { status: 500 },
    );
  }

  return Response.json({ success: true, vote });
}
