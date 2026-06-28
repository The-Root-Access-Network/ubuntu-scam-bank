// src/lib/email/audience.ts

/**
 * Resend Audience sync utility.
 * Called when a new user registers to add them to the digest audience.
 * Gated on RESEND_API_KEY and RESEND_AUDIENCE_ID — silent no-op if absent.
 * Non-fatal — audience sync failure never blocks registration.
 */

export async function addToDigestAudience(
  email: string,
  firstName: string,
): Promise<void> {
  if (!process.env.RESEND_API_KEY || !process.env.RESEND_AUDIENCE_ID) {
    console.log('[audience] Resend not configured — skipping audience sync');
    return;
  }

  try {
    const res = await fetch(
      `https://api.resend.com/audiences/${process.env.RESEND_AUDIENCE_ID}/contacts`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          first_name: firstName,
          unsubscribed: false,
        }),
      },
    );

    if (!res.ok) {
      const body = await res.text();
      console.error('[audience] Failed to add contact:', res.status, body);
    }
  } catch (err) {
    // Non-fatal — user is registered regardless
    console.error('[audience] Audience sync failed (non-fatal):', err);
  }
}
