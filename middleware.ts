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
    request.nextUrl.pathname === '/sitemap.xml' ||
    request.nextUrl.pathname.endsWith('manifest.json') // Allow any path ending with manifest.json
  ) {
    return NextResponse.next()
  }

  // Your existing auth logic can go here for protected routes
  // For now, allow everything else
  return NextResponse.next()
}

export const config = {
  matcher: [
    "/((?!_next|api|manifest.json|favicon.ico|icons).*)",
  ],
}
