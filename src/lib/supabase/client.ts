/**
 * Browser-side Supabase client.
 *
 * Creates a lightweight Supabase client for use in React Client Components.
 * Uses the public anon key — row-level security (RLS) on Supabase enforces
 * access control. Do NOT use this client in server-side code; use the
 * server.ts variant instead which handles cookie-based sessions.
 */

import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
