// src/app/api/ops/users/[id]/unban/route.ts

import { createAdminClient } from '@/lib/supabase/server';
import { requireModerator } from '@/lib/ops/requireModerator';
import { unbanEmail } from '@/lib/email/templates';
import { sendEmail } from '@/lib/email/send';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(
  _request: Request,
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

  const { error } = await admin.auth.admin.updateUserById(id, {
    ban_duration: 'none',
  });

  if (error) {
    console.error('[ops/users/unban] updateUserById failed:', error);
    return Response.json(
      { success: false, error: 'Unban failed.' },
      { status: 500 },
    );
  }

  if (target.email) {
    await sendEmail({
      to: target.email,
      subject: 'Your UbuntuScamBank access has been restored',
      text: unbanEmail(target.username),
    });
  }

  return Response.json({ success: true });
}
