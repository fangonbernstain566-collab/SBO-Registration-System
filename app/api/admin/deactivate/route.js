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

  const supabase = createServiceClient()
  const { error } = await supabase
    .from('events')
    .update({ qr_window_active: false })
    .eq('id', eventId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
