// src/app/api/ops/applications/[id]/reject/route.ts

import { createAdminClient } from '@/lib/supabase/server';
import { requireModerator } from '@/lib/ops/requireModerator';
import { researcherRejectedEmail } from '@/lib/email/templates';
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
      { success: false, error: 'Invalid application ID.' },
      { status: 400 },
    );
  }

  const admin = createAdminClient();

  const { data: application } = await admin
    .from('researcher_applications')
    .select('full_name, status, users!researcher_applications_user_id_fkey(email)')
    .eq('id', id)
    .single();

  if (!application) {
    return Response.json(
      { success: false, error: 'Application not found.' },
      { status: 404 },
    );
  }

  if (application.status !== 'pending') {
    return Response.json(
      { success: false, error: 'Application is not pending.' },
      { status: 409 },
    );
  }

  const { error } = await admin.rpc('reject_researcher_application', {
    p_application_id: id,
  });

  if (error) {
    console.error('[ops/applications/reject] RPC failed:', error);
    return Response.json(
      { success: false, error: 'Rejection failed.' },
      { status: 500 },
    );
  }

  const joinedUser = Array.isArray(application.users)
    ? application.users[0]
    : application.users;

  if (joinedUser?.email) {
    await sendEmail({
      to: joinedUser.email,
      subject: 'Your UbuntuScamBank researcher API application',
      text: researcherRejectedEmail(application.full_name),
    });
  }

  return Response.json({ success: true });
}
