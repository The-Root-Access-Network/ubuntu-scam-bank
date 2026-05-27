// src/app/api/profile/route.ts

/**
 * API route for updating the user's profile. This is called by the ProfileForm component on the client.
 *
 * It accepts a PATCH request with a JSON body containing any of the following optional fields:
 * - display_name: string (max 50 chars)
 * - bio: string (max 300 chars)
 * - country: string (must be a valid country name from the dropdown)
 * @params display_name, bio, country
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { nameToCode } from '@/lib/countries';

const ProfileSchema = z.object({
  display_name: z
    .string()
    .max(50, 'Display name must be 50 characters or fewer')
    .transform((s) => s.trim())
    .optional(),
  bio: z
    .string()
    .max(300, 'Bio must be 300 characters or fewer')
    .transform((s) => s.trim())
    .optional(),
  country: z.string().optional(),
});

export async function PATCH(request: NextRequest) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const authClient = await createClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  if (!user) {
    return Response.json(
      { success: false, error: 'Authentication required.' },
      { status: 401 },
    );
  }

  // ── Parse + validate ──────────────────────────────────────────────────────
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { success: false, error: 'Invalid request body.' },
      { status: 400 },
    );
  }

  const parsed = ProfileSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      {
        success: false,
        error: parsed.error.issues[0]?.message ?? 'Invalid input.',
      },
      { status: 400 },
    );
  }

  const { display_name, bio, country } = parsed.data;

  // ── Build update payload ───────────────────────────────────────────────────
  // Only include fields that were actually sent — undefined values are omitted
  // so a partial update (e.g. bio only) doesn't wipe display_name.
  const updates: {
    display_name?: string;
    bio?: string;
    country_code?: string | null;
  } = {};

  if (display_name !== undefined) updates.display_name = display_name;
  if (bio !== undefined) updates.bio = bio;
  if (country !== undefined) updates.country_code = nameToCode(country);

  if (Object.keys(updates).length === 0) {
    return Response.json(
      { success: false, error: 'No fields to update.' },
      { status: 400 },
    );
  }

  // ── Write ─────────────────────────────────────────────────────────────────────
  let admin;
  try {
    admin = createAdminClient();
  } catch (err) {
    console.error('[profile] createAdminClient failed:', err);
    return Response.json(
      {
        success: false,
        error: 'Server configuration error. Please try again.',
      },
      { status: 500 },
    );
  }

  const { data: updatedUser, error } = await admin
    .from('users')
    .update(updates)
    .eq('id', user.id)
    .select('id, username, display_name, bio, country_code, points, badge')
    .single();

  if (error) {
    console.error('[profile] Update failed:', error);
    return Response.json(
      { success: false, error: 'Profile update failed. Please try again.' },
      { status: 500 },
    );
  }

  return Response.json({ success: true, user: updatedUser });
}
