// src/app/(public)/profile/page.tsx

/**
 * Profile page where users can view and edit their profile information. This page is protected and requires authentication.
 *
 * It fetches the user's profile data server-side and renders a ProfileForm component for editing. The form submits updates to the /api/profile API route.
 *
 * @see src/components/profile/ProfileForm.tsx for the form component used to edit the profile
 * @see src/app/api/profile/route.ts for the API route that handles profile updates
 * @see src/components/layout/NavAuthButton.tsx for how the user's display name is fetched and used in the nav
 */

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Nav from '@/components/layout/Nav';
import Container from '@/components/layout/Container';
import Footer from '@/components/layout/Footer';
import ProfileForm from '@/components/profile/ProfileForm';

export const metadata = { title: 'Your profile' };

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Hard redirect — this page requires authentication
  if (!user) redirect('/');

  // Fetch the public.users row for this account
  const { data: profile } = await supabase
    .from('users')
    .select('username, display_name, bio, country_code, points, badge')
    .eq('id', user.id)
    .single();

  // Shouldn't happen — trigger creates the row on first sign-in
  if (!profile) redirect('/');

  return (
    <div className='min-h-dvh bg-canvas-subtle'>
      <Nav />

      <main>
        <Container className='py-8 md:py-12'>
          {/* Page header */}
          <div className='mb-8'>
            <h1 className='text-[22px] font-medium text-fg mb-1'>
              Your profile
            </h1>
            <p className='text-body-xs text-fg-muted'>
              Update your display name, bio, and country. Your username was set
              automatically and cannot be changed.
            </p>
          </div>

          <div className='bg-canvas border border-stroke-faint rounded-lg p-6 md:p-8'>
            <ProfileForm user={profile} />
          </div>
        </Container>
      </main>

      <Footer />
    </div>
  );
}
