// src/lib/api/validateApiKey.ts

/**
 * Shared API key validation utility for the researcher API.
 * Extracted from src/app/api/v1/reports/route.ts so it can be reused
 * across all v1 route handlers without duplication.
 *
 * Validates the Authorization header, hashes the raw key with MD5
 * (matching the PostgreSQL md5() used at approval time), and looks it up
 * in api_keys. Returns the key's rate_limit_rpm on success so the caller
 * can include it in response headers.
 */

import md5 from 'blueimp-md5';
import { createAdminClient } from '@/lib/supabase/server';

export type ApiKeyValidation =
  | { valid: true; rateLimit: number }
  | { valid: false; rateLimit: 0; error: string };

export async function validateApiKey(
  authHeader: string | null,
): Promise<ApiKeyValidation> {
  if (!authHeader?.startsWith('Bearer ')) {
    return {
      valid: false,
      rateLimit: 0,
      error:
        'Missing or invalid Authorization header. Expected: Authorization: Bearer <key>',
    };
  }

  const rawKey = authHeader.slice(7).trim();
  if (!rawKey) {
    return { valid: false, rateLimit: 0, error: 'API key is empty.' };
  }

  const keyHash = md5(rawKey);

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return {
      valid: false,
      rateLimit: 0,
      error: 'Server configuration error.',
    };
  }

  const { data: apiKey } = await admin
    .from('api_keys')
    .select('id, rate_limit_rpm, revoked_at')
    .eq('key_hash', keyHash)
    .maybeSingle();

  if (!apiKey) {
    return { valid: false, rateLimit: 0, error: 'Invalid API key.' };
  }

  if (apiKey.revoked_at) {
    return {
      valid: false,
      rateLimit: 0,
      error: 'This API key has been revoked.',
    };
  }

  // Update last_used_at — non-blocking, non-fatal.
  try {
    await admin
      .from('api_keys')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', apiKey.id);
  } catch {
    // Non-fatal — last_used_at is an audit field only
  }

  return { valid: true, rateLimit: apiKey.rate_limit_rpm };
}
