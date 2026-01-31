import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Allow public assets and Next.js internals to bypass auth
  if (
    request.nextUrl.pathname.startsWith('/_next') ||
    request.nextUrl.pathname.startsWith('/api') ||
    request.nextUrl.pathname === '/manifest.json' ||
    request.nextUrl.pathname === '/favicon.ico' ||
    request.nextUrl.pathname.startsWith('/icons') ||
    request.nextUrl.pathname === '/robots.txt' ||
    request.nextUrl.pathname === '/sitemap.xml'
  ) {
    return NextResponse.next()
  }

  // Your existing auth logic can go here for protected routes
  // For now, allow everything else
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - manifest.json (PWA manifest)
     * - icons (icon files)
     * - robots.txt (SEO)
     * - sitemap.xml (SEO)
     * - api (API routes)
     */
    '/((?!_next|api|manifest.json|favicon.ico|icons|robots.txt|sitemap.xml).*)',
  ],
}
