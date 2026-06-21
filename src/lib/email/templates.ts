// src/lib/email/templates.ts

/**
 * Plain-text email templates for UbuntuScamBank admin actions.
 * Each function returns a plain text string ready to be passed to the send utility.
 * Keep copy human and warm — this is a community platform, not a corporation.
 */

export function temporaryBanEmail(username: string, until: string): string {
  return `Hi ${username},

Your UbuntuScamBank account has been temporarily suspended due to activity that violates our community guidelines. Your access will be restored on ${until}.

If you believe this is an error, please contact us at therootaccessnetwork@africybercore.com and we will review the decision.

— The Root Access Network team
https://scambank.ubuntubridgeinitiatives.org`;
}

export function permanentBanEmail(username: string): string {
  return `Hi ${username},

Your UbuntuScamBank account has been permanently suspended due to repeated or serious violations of our community guidelines.

If you believe this is an error, please contact us at therootaccessnetwork@africybercore.com.

— The Root Access Network team
https://scambank.ubuntubridgeinitiatives.org`;
}

export function accountDeletedEmail(username: string): string {
  return `Hi ${username},

Your UbuntuScamBank account has been permanently deleted at the request of our moderation team. Your reported scams remain in the platform anonymised, continuing to help protect others.

If you believe this is an error, please contact us at therootaccessnetwork@africybercore.com.

— The Root Access Network team
https://scambank.ubuntubridgeinitiatives.org`;
}

export function unbanEmail(username: string): string {
  return `Hi ${username},

Good news — your UbuntuScamBank account has been reinstated. You can sign in and continue contributing to the community.

If you have any questions, reach us at therootaccessnetwork@africybercore.com.

— The Root Access Network team
https://scambank.ubuntubridgeinitiatives.org`;
}

export function researcherApprovedEmail(name: string, apiKey: string): string {
  return `Hi ${name},

Your UbuntuScamBank researcher API application has been approved. Here is your API key:

${apiKey}

Please copy and store this key securely — it will not be shown again.

To get started, make requests to:
https://scambank.ubuntubridgeinitiatives.org/api/v1/reports

Include your key in the Authorization header:
Authorization: Bearer ${apiKey}

Full documentation and query parameters are available at:
https://scambank.ubuntubridgeinitiatives.org/researchers/apply

If you have any questions, contact us at therootaccessnetwork@africybercore.com.

— The Root Access Network team
https://scambank.ubuntubridgeinitiatives.org`;
}

export function researcherRejectedEmail(name: string): string {
  return `Hi ${name},

Thank you for applying for UbuntuScamBank researcher API access. After reviewing your application, we are unable to approve access at this time.

If you would like to discuss this decision or reapply with additional context, please reach out to us at therootaccessnetwork@africybercore.com.

— The Root Access Network team
https://scambank.ubuntubridgeinitiatives.org`;
}
