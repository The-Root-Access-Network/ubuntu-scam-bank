// src/app/api/feedback/route.ts

/**
 * POST /api/feedback
 *
 * Open endpoint — no authentication required.
 * Accepts feedback from any visitor: general users, researchers, press, NGOs, etc.
 *
 * Steps:
 * 1. Validate request body via Zod
 * 2. Insert a row into the feedback table via admin client
 * 3. Optionally send a Resend notification email to the TRAN team
 *    — silently skipped if RESEND_API_KEY is absent (safe for local dev)
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/server';

// ── Validation schema ─────────────────────────────────────────────────────────

const FeedbackSchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100)
    .transform((s) => s.trim()),
  email: z
    .string()
    .email('Please enter a valid email address')
    .max(254)
    .transform((s) => s.trim().toLowerCase()),
  role: z.enum(
    [
      'General user',
      'Security researcher',
      'Journalist / Press',
      'NGO / Civil society',
      'Software Engineer',
      'Other',
    ],
    { error: 'Please select a role' },
  ),
  organisation: z
    .string()
    .max(200)
    .transform((s) => s.trim())
    .optional()
    .or(z.literal('')),
  message: z
    .string()
    .min(10, 'Message must be at least 10 characters')
    .max(5000)
    .transform((s) => s.trim()),
});

// ── POST handler ──────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  // ── 1. Parse and validate ─────────────────────────────────────────────────
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { success: false, error: 'Invalid request body.' },
      { status: 400 },
    );
  }

  const parsed = FeedbackSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      {
        success: false,
        error: parsed.error.issues[0]?.message ?? 'Invalid input.',
      },
      { status: 400 },
    );
  }

  const { name, email, role, organisation, message } = parsed.data;

  // ── 2. Insert into Supabase ───────────────────────────────────────────────
  // Admin client bypasses RLS — anon users have no INSERT on feedback table.
  let admin;
  try {
    admin = createAdminClient();
  } catch (err) {
    console.error('[feedback] createAdminClient failed:', err);
    return Response.json(
      { success: false, error: 'Server configuration error.' },
      { status: 500 },
    );
  }

  const { error: insertError } = await admin.from('feedback').insert({
    name,
    email,
    role,
    organisation: organisation || null,
    message,
  });

  if (insertError) {
    console.error('[feedback] Insert failed:', insertError);
    return Response.json(
      { success: false, error: 'Submission failed. Please try again.' },
      { status: 500 },
    );
  }

  // ── 3. Resend notification — optional, gated on env var ───────────────────
  // If RESEND_API_KEY is absent (local dev, early deploy), skip silently.
  // The insert above is the source of truth — email is best-effort only.
  if (process.env.RESEND_API_KEY) {
    try {
      const timestamp = new Date().toLocaleString('en-GB', {
        dateStyle: 'full',
        timeStyle: 'short',
        timeZone: 'Africa/Lagos',
      });

      const emailBody = [
        `Name: ${name}`,
        `Email: ${email}`,
        `Role: ${role}`,
        `Organisation: ${organisation || '—'}`,
        ``,
        `Message:`,
        message,
        ``,
        `Received: ${timestamp} (WAT)`,
      ].join('\n');

      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'UbuntuScamBank <noreply@therootaccessnetwork.com>',
          to: ['therootaccessnetwork@africybercore.com'],
          subject: `New UbuntuScamBank feedback — ${role}`,
          text: emailBody,
        }),
      });
    } catch (emailErr) {
      // Non-fatal — log for ops visibility, do not surface to user
      console.error('[feedback] Resend notification failed (non-fatal):', emailErr);
    }
  }

  return Response.json({ success: true });
}
