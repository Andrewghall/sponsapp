/**
 * Server-side Supabase client.
 *
 * Creates a Supabase client that can read/write cookies in Server Components,
 * Server Actions, and Route Handlers. The cookie adapter is required so that
 * Supabase can persist and refresh the user session across SSR requests.
 *
 * The setAll catch block silently swallows errors that occur when this client
 * is used inside a Server Component (where cookies are read-only).
 */

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Server Component context — cookies are read-only, safe to ignore.
          }
        },
      },
    }
  )
}
