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
  cc?: string; // additional CC — OPS_CC is always included
}

export async function sendEmail(options: SendEmailOptions): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    // Silent skip in local dev and early deploys — Supabase write is the source of truth
    console.warn(
      '[email] RESEND_API_KEY not set — skipping email send:',
      options.subject,
    );
    return;
  }

  const ccAddresses = [OPS_CC];
  if (options.cc && options.cc !== OPS_CC) {
    ccAddresses.push(options.cc);
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
        to: [options.to],
        cc: ccAddresses,
        subject: options.subject,
        text: options.text,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error('[email] Resend send failed:', res.status, body);
    }
  } catch (err) {
    // Non-fatal — email delivery is best-effort; the DB action is already complete
    console.error('[email] Resend fetch error (non-fatal):', err);
  }
}
