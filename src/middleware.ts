import { type NextRequest, NextResponse } from 'next/server';
import { updateSession } from '@/utils/supabase/middleware';

export async function middleware(request: NextRequest) {
  const { supabaseResponse, user } = await updateSession(request);
  const pathname = request.nextUrl.pathname;

  // Check for legacy/admin fallback session cookie
  const legacySession = request.cookies.get('maxlith_session')?.value;
  const isAuthenticated = !!user || !!legacySession;

  // Protect Dashboard routes
  if (pathname.startsWith('/dashboard')) {
    if (!isAuthenticated) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = '/login';
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // Protect Admin Dashboard routes (except root /admin login page)
  if (pathname.startsWith('/admin/dashboard')) {
    if (!isAuthenticated) {
      const adminLoginUrl = request.nextUrl.clone();
      adminLoginUrl.pathname = '/admin';
      return NextResponse.redirect(adminLoginUrl);
    }
  }

  // If already authenticated and visiting /login or /signup directly without explicit switches, redirect to dashboard
  const isExplicitAction = request.nextUrl.searchParams.has('mode') || request.nextUrl.searchParams.has('switch');
  if (isAuthenticated && !isExplicitAction && (pathname === '/login' || pathname === '/signup')) {
    const dashboardUrl = request.nextUrl.clone();
    dashboardUrl.pathname = '/dashboard';
    return NextResponse.redirect(dashboardUrl);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - Static asset extensions (.svg, .png, .jpg, .jpeg, .gif, .webp, .ico)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
