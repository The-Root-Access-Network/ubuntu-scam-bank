// src/app/api/v1/reports/[id]/route.ts

/**
 * GET /api/v1/reports/:id
 *
 * Returns a single published report with its full indicators.
 * Requires a valid Bearer token in the Authorization header.
 *
 * Only published reports are accessible. raw_content and submitted_by
 * are intentionally excluded — raw content may contain victim PII that
 * wasn't fully stripped, and submitted_by is an internal user ID.
 */

import { NextRequest } from 'next/server';
import { validateApiKey } from '@/lib/api/validateApiKey';
import { createAdminClient } from '@/lib/supabase/server';

// ── CORS ──────────────────────────────────────────────────────────────────────

const CORS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type, Accept',
  'Content-Type': 'application/json',
};

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}

// ── GET /api/v1/reports/:id ───────────────────────────────────────────────────

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  // ── 1. Validate API key ───────────────────────────────────────────────────
  const auth = await validateApiKey(request.headers.get('authorization'));
  if (!auth.valid) {
    return Response.json({ error: auth.error }, { status: 401, headers: CORS });
  }

  // ── 2. Validate ID format — must be a valid UUID ──────────────────────────
  // Guards against SQL injection via the query param and returns a clean
  // 400 rather than letting Postgres reject a malformed UUID with a 500.
  const { id } = await params;
  const UUID_RE =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!UUID_RE.test(id)) {
    return Response.json(
      { error: 'Invalid report ID. Must be a valid UUID.' },
      { status: 400, headers: CORS },
    );
  }

  // ── 3. Fetch report ───────────────────────────────────────────────────────
  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return Response.json(
      { error: 'Server configuration error.' },
      { status: 500, headers: CORS },
    );
  }

  const { data: report, error } = await admin
    .from('reports')
    .select(
      'id, type, severity, country_code, summary, ai_tags, ai_confidence, is_novel, campaign_id, confirm_count, dispute_count, published_at',
    )
    .eq('id', id)
    .eq('status', 'published')
    .maybeSingle();

  if (error) {
    console.error('[api/v1/reports/:id]', error);
    return Response.json(
      { error: 'Internal server error.' },
      { status: 500, headers: CORS },
    );
  }

  if (!report) {
    return Response.json(
      { error: 'Report not found.' },
      { status: 404, headers: CORS },
    );
  }

  // ── 4. Fetch indicators ───────────────────────────────────────────────────
  const { data: indicators } = await admin
    .from('indicators')
    .select('type, value')
    .eq('report_id', id);

  // ── 5. Return ─────────────────────────────────────────────────────────────
  // raw_content excluded — may contain residual victim PII.
  // submitted_by excluded — internal user ID, not relevant to researchers.
  return Response.json(
    {
      data: {
        id: report.id,
        type: report.type,
        severity: report.severity,
        country_code: report.country_code,
        summary: report.summary,
        ai_tags: report.ai_tags ?? [],
        ai_confidence: report.ai_confidence,
        is_novel: report.is_novel,
        campaign_id: report.campaign_id,
        confirm_count: report.confirm_count,
        dispute_count: report.dispute_count,
        published_at: report.published_at,
        indicators: (indicators ?? []).map((ind) => ({
          type: ind.type,
          value: ind.value,
        })),
      },
    },
    {
      headers: {
        ...CORS,
        'X-RateLimit-Limit': String(auth.rateLimit),
      },
    },
  );
}
