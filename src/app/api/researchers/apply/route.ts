// src/app/api/researchers/apply/route.ts

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { createClient, createAdminClient } from '@/lib/supabase/server';

const ApplicationSchema = z.object({
  full_name: z.string().min(2).max(100),
  organisation: z.string().min(2).max(200),
  role: z.string().min(2).max(100),
  use_case: z
    .string()
    .min(50, 'Please describe your intended use in at least 50 characters')
    .max(2000),
  portfolio_url: z
    .union([
      z.string().url('Please enter a valid URL'),
      z.literal(''),
      z.null(),
    ])
    .optional()
    .transform((v) => v || null),
});

export async function POST(request: NextRequest) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const authClient = await createClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  if (!user) {
    return Response.json(
      { success: false, error: 'Authentication required.' },
      { status: 401 },
    );
  }

  // ── Guard: one application at a time ─────────────────────────────────────
  let admin;
  try {
    admin = createAdminClient();
  } catch (err) {
    console.error('[researchers/apply] createAdminClient failed:', err);
    return Response.json(
      { success: false, error: 'Server configuration error.' },
      { status: 500 },
    );
  }

  const { data: existing } = await admin
    .from('researcher_applications')
    .select('status')
    .eq('user_id', user.id)
    .in('status', ['pending', 'approved'])
    .maybeSingle();

  if (existing) {
    const msg =
      existing.status === 'approved'
        ? 'Your API access is already approved.'
        : 'You already have an application under review.';
    return Response.json({ success: false, error: msg }, { status: 409 });
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

  const parsed = ApplicationSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      {
        success: false,
        error: parsed.error.issues[0]?.message ?? 'Invalid input.',
      },
      { status: 400 },
    );
  }

  const { full_name, organisation, role, use_case, portfolio_url } =
    parsed.data;

  // ── Insert ────────────────────────────────────────────────────────────────
  const { error } = await admin.from('researcher_applications').insert({
    user_id: user.id,
    full_name,
    organisation,
    role,
    use_case,
    portfolio_url: portfolio_url ?? null,
    status: 'pending',
  });

  if (error) {
    console.error('[researchers/apply] Insert failed:', error);
    return Response.json(
      { success: false, error: 'Submission failed. Please try again.' },
      { status: 500 },
    );
  }

  return Response.json({ success: true });
}
