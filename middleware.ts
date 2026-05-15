// middleware.ts
import { NextResponse, type NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Supabase session refresh will be added here in step 3.
  // The actual logic lives in src/lib/supabase/middleware.ts and will be
  // called from here once the project is connected to a Supabase instance.
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Run middleware on all routes except:
     * - _next/static  (static assets)
     * - _next/image   (image optimisation)
     * - favicon.ico
     * - any file with a common static extension
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}