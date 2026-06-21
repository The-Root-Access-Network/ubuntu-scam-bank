// src/app/api/ops/applications/[id]/approve/route.ts

import { createAdminClient } from '@/lib/supabase/server';
import { requireModerator } from '@/lib/ops/requireModerator';
import { researcherApprovedEmail } from '@/lib/email/templates';
import { sendEmail } from '@/lib/email/send';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type ApproveRpcResult =
  | string
  | { raw_key?: string | null }
  | Array<{ raw_key?: string | null }>;

function extractApiKey(data: ApproveRpcResult | null): string | null {
  if (typeof data === 'string') return data;
  if (Array.isArray(data)) return data[0]?.raw_key ?? null;
  return data?.raw_key ?? null;
}

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
    .select(
      'full_name, status, users!researcher_applications_user_id_fkey(email)',
    )
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

  const { data, error } = await admin.rpc('approve_researcher_application', {
    p_application_id: id,
  });

  if (error) {
    console.error('[ops/applications/approve] RPC failed:', error);
    return Response.json(
      { success: false, error: 'Approval failed.' },
      { status: 500 },
    );
  }

  const apiKey = extractApiKey(data as ApproveRpcResult | null);
  if (!apiKey) {
    console.error('[ops/applications/approve] RPC returned no API key:', data);
    return Response.json(
      { success: false, error: 'Approval did not return an API key.' },
      { status: 500 },
    );
  }

  const joinedUser = Array.isArray(application.users)
    ? application.users[0]
    : application.users;

  if (joinedUser?.email) {
    await sendEmail({
      to: joinedUser.email,
      subject: 'Your UbuntuScamBank researcher API access is approved',
      text: researcherApprovedEmail(application.full_name, apiKey),
    });
  }

  return Response.json({ success: true, apiKey });
}
