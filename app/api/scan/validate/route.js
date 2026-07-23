import { NextResponse } from 'next/server'
import { createServiceClient } from '../../../../lib/supabaseServer'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const eventId = searchParams.get('event')
  const tokenBucket = parseInt(searchParams.get('t'))

  if (!eventId || isNaN(tokenBucket)) {
    return NextResponse.json({
      valid: false,
      message: 'Invalid QR code. Please scan the QR shown at the event.',
    })
  }

  const currentBucket = Math.floor(Date.now() / 30000)
  const isTokenFresh = tokenBucket === currentBucket || tokenBucket === currentBucket - 1

  if (!isTokenFresh) {
    return NextResponse.json({
      valid: false,
      message: 'This QR code has expired. Scan the latest code shown at the event.',
    })
  }

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('events')
    .select('id, name, qr_window_active, qr_window_closes_at')
    .eq('id', eventId)
    .single()

  if (error || !data) {
    return NextResponse.json({ valid: false, message: 'Event not found.' })
  }

  if (!data.qr_window_active || new Date(data.qr_window_closes_at) < new Date()) {
    return NextResponse.json({
      valid: false,
      message: 'The attendance window for this event is no longer open.',
    })
  }

  return NextResponse.json({ valid: true })
}
