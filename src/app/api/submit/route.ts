// src/app/api/submit/route.ts

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { nameToCode } from '@/lib/countries';
import { uploadSubmissionFile, UploadError } from '@/lib/storage/upload';
import { triageSubmission, hashContent } from '@/lib/ai/triage';
import { calculatePoints, welcomeBonus } from '@/lib/points/calculate';
import type { PointsLineItem } from '@/lib/points/calculate';

// ── FormData validation schema ────────────────────────────────────────────────
const SubmitSchema = z.object({
  content: z.string().default(''),
  type: z.enum([
    'phishing_email',
    'smishing',
    'vishing',
    'investment_fraud',
    'romance_scam',
    'business_email_compromise',
    'tech_support',
    'crypto_fraud',
    'other',
  ]),
  severity: z.coerce.number().int().min(1).max(5),
  country: z.string().min(1),
  context: z.string().default(''),
});

// ── POST /api/submit ──────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  // ── 1. Verify authentication ──────────────────────────────────────────────
  // Use the session-aware client to check the user's cookie.
  // All subsequent DB writes use the admin client.
  const authClient = await createClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  if (!user) {
    return Response.json(
      { success: false, error: 'You must be signed in to submit a report.' },
      { status: 401 },
    );
  }

  const admin = createAdminClient();

  // ── 2. Parse FormData ─────────────────────────────────────────────────────
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return Response.json(
      { success: false, error: 'Could not read form data.' },
      { status: 400 },
    );
  }

  const parsed = SubmitSchema.safeParse({
    content: formData.get('content'),
    type: formData.get('type'),
    severity: formData.get('severity'),
    country: formData.get('country'),
    context: formData.get('context'),
  });

  if (!parsed.success) {
    return Response.json(
      {
        success: false,
        error: 'Invalid submission.',
        details: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  const {
    content: pastedText,
    type: formType,
    severity: formSeverity,
    country,
    context,
  } = parsed.data;

  // File is optional — present only when the user selected one
  const rawFile = formData.get('file');
  const file = rawFile instanceof File && rawFile.size > 0 ? rawFile : null;

  // ── 3. Require at least one source of text ────────────────────────────────
  // Images and PDFs don't yield extractable text in this runtime,
  // so we can't triage them alone. Paste + image is fine.
  if (!pastedText.trim() && !file) {
    return Response.json(
      {
        success: false,
        error: 'Please paste the scam message or upload a file.',
      },
      { status: 400 },
    );
  }

  // ── 4. Generate report ID early (used for the storage path) ──────────────
  const reportId = crypto.randomUUID();

  // ── 5. Upload file if present ─────────────────────────────────────────────
  let fileResult: Awaited<ReturnType<typeof uploadSubmissionFile>> | null =
    null;

  if (file) {
    try {
      fileResult = await uploadSubmissionFile(file, user.id, reportId);
    } catch (err) {
      if (err instanceof UploadError) {
        return Response.json(
          { success: false, error: err.message, code: err.code },
          { status: 400 },
        );
      }
      console.error('[submit] Unexpected upload error:', err);
      return Response.json(
        { success: false, error: 'File upload failed. Please try again.' },
        { status: 500 },
      );
    }
  }

  // ── 6. Build full content string for triage ───────────────────────────────
  // Pasted text + file-extracted text (EML/TXT only) + user context note.
  // Context goes last so it doesn't pollute the IOC extraction.
  const coreContent = [pastedText.trim(), (fileResult?.text ?? '').trim()]
    .filter(Boolean)
    .join('\n\n');

  if (!coreContent) {
    return Response.json(
      { success: false, error: 'No readable content found...' },
      { status: 400 },
    );
  }

  // ── 7. Deduplication — hash check ─────────────────────────────────────────
  const contentHash = await hashContent(coreContent);

  const { data: existing } = await admin
    .from('reports')
    .select('id, campaign_id')
    .eq('content_hash', contentHash)
    .maybeSingle();

  const isDuplicate = !!existing;

  // Build full triage content — context appended after hash check
  const fullContent = [
    coreContent,
    context.trim() ? `Submitter note: ${context.trim()}` : '',
  ]
    .filter(Boolean)
    .join('\n\n');

  // ── 8. AI triage ──────────────────────────────────────────────────────────
  // Never throws — returns triage_failed: true on any Claude API failure.
  // triage_failed reports are stored with status='under_review' for manual
  // moderation; points are still awarded using the user's own type/severity.
  const triage = await triageSubmission(fullContent);

  // ── 9. Check for first-ever submission (welcome bonus) ────────────────────
  const { count: submissionCount } = await admin
    .from('submissions')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id);

  const isFirstSubmission = (submissionCount ?? 0) === 0;

  // ── 10. Calculate points ──────────────────────────────────────────────────
  // Full metadata bonus requires both a file AND a written context note.
  const hasMetadata = !!(fileResult && context.trim().length > 10);

  const pointsResult = calculatePoints(
    {
      severity: triage.triage_failed ? formSeverity : triage.severity,
      is_novel: triage.is_novel,
      has_metadata: hasMetadata,
    },
    isDuplicate,
  );

  const welcomeItem = isFirstSubmission ? welcomeBonus() : null;
  const totalDelta = pointsResult.total + (welcomeItem?.delta ?? 0);

  // ── 11. Insert report ─────────────────────────────────────────────────────
  // Status: 'published' for successfully triaged reports (MVP auto-publish);
  //         'under_review' if triage failed — requires manual moderation.
  // TODO: switch to 'pending' + moderation queue in Phase 3.
  if (!isDuplicate) {
    const { error: reportError } = await admin.from('reports').insert({
      id: reportId,
      submitted_by: user.id,
      type: triage.triage_failed ? formType : triage.type,
      severity: triage.triage_failed ? formSeverity : triage.severity,
      status: triage.triage_failed ? 'under_review' : 'published',
      country_code: nameToCode(country),
      summary: triage.summary || null,
      raw_content: fullContent,
      content_hash: contentHash,
      ai_category: triage.triage_failed ? null : triage.type,
      ai_confidence: triage.triage_failed ? null : triage.confidence,
      ai_tags: triage.triage_failed ? [] : triage.ai_tags,
      file_path: fileResult?.path ?? null,
      file_type: fileResult?.file_type ?? null,
      is_novel: triage.is_novel,
      // campaign_id: isDuplicate ? (existing?.campaign_id ?? null) : null,
      campaign_id: null,
      published_at: triage.triage_failed ? null : new Date().toISOString(),
    });

    if (reportError) {
      console.error('[submit] Report insert failed:', reportError);
      return Response.json(
        { success: false, error: 'Submission failed. Please try again.' },
        { status: 500 },
      );
    }
  }

  // ── 12. Insert indicators ─────────────────────────────────────────────────
  // Non-fatal if this fails — the report is already stored.
  if (!isDuplicate && !triage.triage_failed && triage.indicators.length > 0) {
    const { error: indicatorsError } = await admin.from('indicators').insert(
      triage.indicators.map((ind) => ({
        report_id: reportId,
        type: ind.type,
        value: ind.value,
      })),
    );

    if (indicatorsError) {
      console.error(
        '[submit] Indicators insert failed (non-fatal):',
        indicatorsError,
      );
    }
  }

  // ── 13. Insert submission row ─────────────────────────────────────────────
  // For duplicates, link to the existing report — not the generated reportId
  const submissionReportId = isDuplicate
    ? (existing?.id ?? reportId)
    : reportId;

  const { error: submissionError } = await admin.from('submissions').insert({
    user_id: user.id,
    report_id: submissionReportId,
    points_awarded: totalDelta,
    bonus_reason: pointsResult.ledger_reason,
  });

  if (submissionError) {
    console.error('[submit] Submission insert failed:', submissionError);
    return Response.json(
      { success: false, error: 'Submission failed. Please try again.' },
      { status: 500 },
    );
  }

  // ── 14. Insert points ledger ──────────────────────────────────────────────
  // Two rows at most: one for the submission points (base + bonuses combined),
  // one for the welcome bonus if this is the user's first report.
  // Separating welcome bonus makes the ledger audit trail readable.
  const ledgerRows: Array<{
    user_id: string;
    delta: number;
    reason: string;
    ref_id: string;
  }> = [
    {
      user_id: user.id,
      delta: pointsResult.total,
      reason: pointsResult.ledger_reason,
      ref_id: submissionReportId, // was: reportId
    },
  ];

  if (welcomeItem) {
    ledgerRows.push({
      user_id: user.id,
      delta: welcomeItem.delta,
      reason: welcomeItem.reason,
      ref_id: submissionReportId, // was: reportId
    });
  }

  const { error: ledgerError } = await admin
    .from('points_ledger')
    .insert(ledgerRows);

  if (ledgerError) {
    // Non-fatal — audit gap is preferable to blocking the submission response
    console.error('[submit] Ledger insert failed (non-fatal):', ledgerError);
  }

  // ── 15. Increment user points ─────────────────────────────────────────────
  // Read-then-write is safe at MVP scale. The badge trigger on users.points
  // fires automatically on the UPDATE, so no badge logic needed here.
  const { data: currentUser } = await admin
    .from('users')
    .select('points')
    .eq('id', user.id)
    .single();

  const { error: pointsError } = await admin
    .from('users')
    .update({ points: (currentUser?.points ?? 0) + totalDelta })
    .eq('id', user.id);

  if (pointsError) {
    // Non-fatal — ledger is written; points can be recalculated from ledger
    console.error('[submit] Points update failed (non-fatal):', pointsError);
  }

  // ── 16. Return structured response ────────────────────────────────────────
  const breakdown: PointsLineItem[] = [
    ...pointsResult.breakdown,
    ...(welcomeItem ? [welcomeItem] : []),
  ];

  return Response.json({
    success: true,
    report_id: reportId,
    is_duplicate: isDuplicate,
    is_novel: triage.is_novel,
    triage_failed: triage.triage_failed,
    status: triage.triage_failed ? 'under_review' : 'published',
    summary: triage.summary || null,
    points: {
      total: totalDelta,
      breakdown,
    },
  });
}
