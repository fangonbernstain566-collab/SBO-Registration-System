import { createClient } from '@supabase/supabase-js'

// Server-only client using the service_role key — bypasses RLS.
// Never import this file from a 'use client' component.
export function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}
