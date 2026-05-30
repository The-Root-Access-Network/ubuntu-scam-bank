// src/app/api/v1/reports/route.ts

import { NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

// ── API key validation ────────────────────────────────────────────────────────

async function validateApiKey(authHeader: string | null) {
  if (!authHeader?.startsWith('Bearer ')) {
    return {
      valid: false as const,
      rateLimit: 0,
      error:
        'Missing or invalid Authorization header. Expected: Authorization: Bearer <key>',
    };
  }

  const rawKey = authHeader.slice(7).trim();
  if (!rawKey)
    return { valid: false as const, rateLimit: 0, error: 'API key is empty.' };

  // Hash the provided key for lookup
  const encoded = new TextEncoder().encode(rawKey);
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoded);
  const keyHash = Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return {
      valid: false as const,
      rateLimit: 0,
      error: 'Server configuration error.',
    };
  }

  const { data: apiKey } = await admin
    .from('api_keys')
    .select('id, rate_limit_rpm, revoked_at')
    .eq('key_hash', keyHash)
    .maybeSingle();

  if (!apiKey)
    return { valid: false as const, rateLimit: 0, error: 'Invalid API key.' };
  if (apiKey.revoked_at)
    return {
      valid: false as const,
      rateLimit: 0,
      error: 'This API key has been revoked.',
    };

  // Update last_used_at — non-blocking, non-fatal, awaited directly.
  // Supabase query builders return PromiseLike, not Promise, so .catch() isn't
  // available without wrapping. Awaiting is simpler and safe on Workers.
  try {
    await admin
      .from('api_keys')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', apiKey.id);
  } catch {
    // Non-fatal — last_used_at is an audit field only
  }

  return { valid: true as const, rateLimit: apiKey.rate_limit_rpm };
}

// ── CORS — this API is called from external tools and scripts ─────────────────

const CORS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type, Accept',
  'Content-Type': 'application/json',
};

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}

// ── GET /api/v1/reports ───────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  // ── 1. Validate key ───────────────────────────────────────────────────────
  const auth = await validateApiKey(request.headers.get('authorization'));
  if (!auth.valid) {
    return Response.json({ error: auth.error }, { status: 401, headers: CORS });
  }

  // ── 2. Query parameters ───────────────────────────────────────────────────
  const sp = new URL(request.url).searchParams;
  const type = sp.get('type');
  const country = sp.get('country');
  const sev = sp.get('severity');
  const from = sp.get('from');
  const to = sp.get('to');
  const novel = sp.get('is_novel');
  const rawLim = parseInt(sp.get('limit') ?? '50', 10);
  const limit = Math.max(1, Math.min(200, isNaN(rawLim) ? 50 : rawLim));
  const cursor = sp.get('cursor');

  // ── 3. Build reports query ────────────────────────────────────────────────
  const admin = createAdminClient();

  let query = admin
    .from('reports')
    .select(
      'id, type, severity, country_code, summary, ai_tags, is_novel, confirm_count, published_at',
    )
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .limit(limit);

  if (type) query = query.eq('type', type);
  if (country) query = query.eq('country_code', country);
  if (sev) query = query.gte('severity', parseInt(sev, 10));
  if (from) query = query.gte('published_at', from);
  if (to) query = query.lte('published_at', to);
  if (novel === 'true') query = query.eq('is_novel', true);

  // Cursor pagination — cursor is base64-encoded published_at timestamp.
  // TODO: if two reports share identical published_at values, this cursor may
  // skip or repeat entries. At current volume this is unlikely; fix with
  // a composite (published_at, id) cursor when it matters.
  if (cursor) {
    try {
      query = query.lt('published_at', atob(cursor));
    } catch {
      // Invalid cursor — ignore, return from start
    }
  }

  const { data: reports, error } = await query;
  if (error) {
    console.error('[api/v1/reports]', error);
    return Response.json(
      { error: 'Internal server error.' },
      { status: 500, headers: CORS },
    );
  }

  // ── 4. Batch-fetch indicators ─────────────────────────────────────────────
  const ids = reports?.map((r) => r.id) ?? [];
  const indicatorsMap: Record<
    string,
    Array<{ type: string; value: string }>
  > = {};

  if (ids.length > 0) {
    const { data: indicators } = await admin
      .from('indicators')
      .select('report_id, type, value')
      .in('report_id', ids);

    indicators?.forEach((ind) => {
      if (!indicatorsMap[ind.report_id]) indicatorsMap[ind.report_id] = [];
      indicatorsMap[ind.report_id].push({ type: ind.type, value: ind.value });
    });
  }

  // ── 5. Assemble and return ────────────────────────────────────────────────
  const data = (reports ?? []).map((r) => ({
    id: r.id,
    type: r.type,
    severity: r.severity,
    country_code: r.country_code,
    summary: r.summary,
    ai_tags: r.ai_tags ?? [],
    indicators: indicatorsMap[r.id] ?? [],
    confirm_count: r.confirm_count,
    is_novel: r.is_novel,
    published_at: r.published_at,
  }));

  const last = reports?.[reports.length - 1];
  const nextCursor =
    last && reports?.length === limit && last.published_at
      ? btoa(last.published_at)
      : null;

  return Response.json(
    { data, meta: { total: data.length, limit, next_cursor: nextCursor } },
    {
      headers: {
        ...CORS,
        'X-RateLimit-Limit': String(auth.rateLimit),
        // TODO Phase 4: enforce rate_limit_rpm using Cloudflare rate limiting
        // rules or an Upstash Redis counter. Currently the header informs
        // clients of their limit but nothing blocks them from exceeding it.
      },
    },
  );
}
