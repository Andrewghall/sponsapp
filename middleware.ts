/**
 * Next.js Edge Middleware
 *
 * Runs on every matched request before the route handler.
 * Currently acts as a pass-through — no authentication is enforced yet.
 * The allowlist below lets static assets, API routes, and PWA manifest
 * files bypass any future auth checks without an extra round-trip.
 */

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Allow public assets, API endpoints, and Next.js internals through.
  if (
    request.nextUrl.pathname.startsWith('/_next') ||
    request.nextUrl.pathname.startsWith('/api') ||
    request.nextUrl.pathname === '/manifest.json' ||
    request.nextUrl.pathname === '/favicon.ico' ||
    request.nextUrl.pathname.startsWith('/icons') ||
    request.nextUrl.pathname.startsWith('/apple-touch-icon') ||
    request.nextUrl.pathname === '/robots.txt' ||
    request.nextUrl.pathname === '/sitemap.xml' ||
    request.nextUrl.pathname.endsWith('manifest.json') || // Allow any path ending with manifest.json
    request.nextUrl.pathname.endsWith('.png') ||
    request.nextUrl.pathname.endsWith('.ico') ||
    request.nextUrl.pathname.endsWith('.svg')
  ) {
    return NextResponse.next()
  }

  // Your existing auth logic can go here for protected routes
  // For now, allow everything else
  return NextResponse.next()
}

/**
 * Matcher config — only invoke the middleware for page navigations.
 * Static files (_next/*), API routes, and files with extensions are excluded
 * so that only dynamic page routes are processed.
 */
export const config = {
  matcher: [
    "/((?!_next|api|.*\\..*).*)",
  ],
}
