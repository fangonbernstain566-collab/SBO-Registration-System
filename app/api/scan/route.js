import { NextResponse } from 'next/server'
import { createServiceClient } from '../../../lib/supabaseServer'

export async function POST(request) {
  const { eventId, tokenBucket, studentId } = await request.json()

  if (!eventId || !Number.isFinite(tokenBucket) || !studentId) {
    return NextResponse.json({ status: 'error', message: 'Invalid request.' }, { status: 400 })
  }

  const currentBucket = Math.floor(Date.now() / 30000)
  const isTokenFresh = tokenBucket === currentBucket || tokenBucket === currentBucket - 1

  if (!isTokenFresh) {
    return NextResponse.json({
      status: 'error',
      message: 'This QR code has expired. Scan the latest code shown at the event.',
    })
  }

  const supabase = createServiceClient()

  const { data: event, error: eventError } = await supabase
    .from('events')
    .select('id, name, qr_window_active, qr_window_closes_at')
    .eq('id', eventId)
    .single()

  if (eventError || !event) {
    return NextResponse.json({ status: 'error', message: 'Event not found.' })
  }

  if (!event.qr_window_active || new Date(event.qr_window_closes_at) < new Date()) {
    return NextResponse.json({
      status: 'error',
      message: 'The attendance window for this event is no longer open.',
    })
  }

  const { data: registration, error: lookupError } = await supabase
    .from('registrations')
    .select('id, full_name, has_attended')
    .eq('event_id', eventId)
    .eq('student_id', studentId.trim())
    .single()

  if (lookupError || !registration) {
    return NextResponse.json({ status: 'not-found' })
  }

  if (registration.has_attended) {
    return NextResponse.json({ status: 'already', studentName: registration.full_name })
  }

  const { error: updateError } = await supabase
    .from('registrations')
    .update({ has_attended: true, attended_at: new Date().toISOString() })
    .eq('id', registration.id)

  if (updateError) {
    return NextResponse.json({ status: 'error', message: 'Something went wrong. Please try again.' })
  }

  return NextResponse.json({ status: 'success', studentName: registration.full_name })
}
