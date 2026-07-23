import { createClient } from '@supabase/supabase-js'

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '')
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean)

// Verifies the bearer token from an authenticated Supabase session and,
// if ADMIN_EMAILS is set, restricts access to that allowlist.
// Returns the authenticated user, or null if unauthorized.
export async function verifyAdmin(request) {
  const authHeader = request.headers.get('authorization') || ''
  const token = authHeader.replace(/^Bearer\s+/i, '')
  if (!token) return null

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )

  const { data, error } = await supabase.auth.getUser(token)
  if (error || !data?.user) return null

  const email = data.user.email?.toLowerCase()
  if (ADMIN_EMAILS.length > 0 && !ADMIN_EMAILS.includes(email)) return null

  return data.user
}
