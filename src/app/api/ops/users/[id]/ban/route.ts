// src/app/api/ops/users/[id]/ban/route.ts

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/server';
import { requireModerator } from '@/lib/ops/requireModerator';
import { permanentBanEmail, temporaryBanEmail } from '@/lib/email/templates';
import { sendEmail } from '@/lib/email/send';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const BanSchema = z.object({
  duration: z.enum(['24h', '168h', '720h', '2160h', '876000h']),
});

function durationToDate(duration: string): Date {
  const hours = Number.parseInt(duration.replace('h', ''), 10);
  return new Date(Date.now() + hours * 60 * 60 * 1000);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const moderator = await requireModerator();
  if (moderator instanceof Response) return moderator;

  const { id } = await params;
  if (!UUID_RE.test(id)) {
    return Response.json(
      { success: false, error: 'Invalid user ID.' },
      { status: 400 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { success: false, error: 'Invalid request body.' },
      { status: 400 },
    );
  }

  const parsed = BanSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { success: false, error: 'Invalid ban duration.' },
      { status: 400 },
    );
  }

  const admin = createAdminClient();

  const { data: target } = await admin
    .from('users')
    .select('username, email, is_moderator')
    .eq('id', id)
    .single();

  if (!target) {
    return Response.json(
      { success: false, error: 'User not found.' },
      { status: 404 },
    );
  }

  if (target.is_moderator) {
    return Response.json(
      { success: false, error: 'Moderators cannot be actioned.' },
      { status: 403 },
    );
  }

  if (id === moderator.user.id) {
    return Response.json(
      { success: false, error: 'You cannot action your own account.' },
      { status: 403 },
    );
  }

  const { duration } = parsed.data;
  const { error } = await admin.auth.admin.updateUserById(id, {
    ban_duration: duration,
  });

  if (error) {
    console.error('[ops/users/ban] updateUserById failed:', error);
    return Response.json(
      { success: false, error: 'Ban failed.' },
      { status: 500 },
    );
  }

  if (target.email) {
    const permanent = duration === '876000h';
    const until = durationToDate(duration).toLocaleString('en-GB', {
      dateStyle: 'full',
      timeStyle: 'short',
      timeZone: 'Africa/Lagos',
    });

    await sendEmail({
      to: target.email,
      subject: permanent
        ? 'Your UbuntuScamBank account has been suspended'
        : 'Your UbuntuScamBank account has been temporarily suspended',
      text: permanent
        ? permanentBanEmail(target.username)
        : temporaryBanEmail(target.username, until),
    });
  }

  return Response.json({ success: true });
}
