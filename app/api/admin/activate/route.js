import { NextResponse } from 'next/server'
import { verifyAdmin } from '../../../../lib/verifyAdmin'
import { createServiceClient } from '../../../../lib/supabaseServer'

export async function POST(request) {
  const user = await verifyAdmin(request)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { eventId } = await request.json()
  if (!eventId) {
    return NextResponse.json({ error: 'Missing eventId' }, { status: 400 })
  }

  const now = new Date()
  const closesAt = new Date(now.getTime() + 10 * 60 * 1000)

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('events')
    .update({
      qr_window_active: true,
      qr_window_opened_at: now.toISOString(),
      qr_window_closes_at: closesAt.toISOString(),
    })
    .eq('id', eventId)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ event: data })
}
