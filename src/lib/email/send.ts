// src/lib/email/send.ts

/**
 * Shared Resend email utility for all ops routes.
 * Gated on RESEND_API_KEY — if absent, logs and returns silently.
 * All sends CC therootaccessnetwork@africybercore.com so TRAN has
 * a record of every admin action taken.
 *
 * Use this for all email sends in /api/ops routes — never inline fetch calls.
 */

const FROM = 'UbuntuScamBank <noreply@scambank.ubuntubridgeinitiatives.org>';
const OPS_CC = 'therootaccessnetwork@africybercore.com';

interface SendEmailOptions {
  to: string; // recipient email address
  subject: string;
  text: string; // plain text body
}

export async function sendEmail({
  to,
  subject,
  text,
}: SendEmailOptions): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    // Skip silently in local dev — insert succeeds, email is skipped.
    console.log('[email] RESEND_API_KEY not set — skipping email to', to);
    return;
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM,
        to: [to], // array
        cc: [OPS_CC], // array
        subject,
        text,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error('[email] Resend error:', res.status, body);
    }
  } catch (err) {
    // Non-fatal — log for ops visibility, never surface to caller
    console.error('[email] Send failed (non-fatal):', err);
  }
}
