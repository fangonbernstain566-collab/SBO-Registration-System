'use client'

import { useState, useEffect } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { supabase } from '../lib/supabase'

const ADMIN_PIN = '1234'

export default function AdminPage() {

  // ── STATE ─────────────────────────────────────────────────
  const [unlocked, setUnlocked]         = useState(false)  // PIN gate passed?
  const [pinInput, setPinInput]         = useState('')      // What admin typed
  const [pinError, setPinError]         = useState(false)   // Wrong PIN?

  const [events, setEvents]             = useState([])     // All events from DB
  const [loading, setLoading]           = useState(true)   // Still fetching?

  const [activeEvent, setActiveEvent]   = useState(null)   // Which event is live
  const [scanUrl, setScanUrl]           = useState('')      // URL encoded in QR
  const [secondsLeft, setSecondsLeft]   = useState(30)    // Countdown to QR refresh
  const [windowExpiry, setWindowExpiry] = useState(null)  // When 10-min window ends


  // ── PIN CHECK ─────────────────────────────────────────────
  function handlePinSubmit(e) {
    e.preventDefault()
    if (pinInput === ADMIN_PIN) {
      setUnlocked(true)
    } else {
      setPinError(true)
      setPinInput('')
    }
  }


  // ── FETCH EVENTS ──────────────────────────────────────────
  // Only fetches once the admin has passed the PIN gate.
  // The if (!unlocked) return prevents unnecessary DB calls.
  useEffect(() => {
    if (!unlocked) return

    async function fetchEvents() {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('event_date', { ascending: true })

      if (!error) setEvents(data)
      setLoading(false)
    }

    fetchEvents()
  }, [unlocked])


  // ── QR ROTATION LOGIC ─────────────────────────────────────
  // Runs a 1-second interval whenever a QR window is active.
  // Each tick: recalculates the time bucket, updates the QR URL,
  // and counts down seconds until the next rotation.
  useEffect(() => {
    if (!activeEvent) return

    function tick() {
      const now = Date.now()
      const timeBucket = Math.floor(now / 30000) // New value every 30 seconds

      // Build the URL students will land on after scanning
      const url = `${window.location.origin}/scan?event=${activeEvent.id}&t=${timeBucket}`
      setScanUrl(url)

      // Seconds remaining in the current 30-second bucket
      const secondsIntoBucket = Math.floor((now / 1000) % 30)
      setSecondsLeft(30 - secondsIntoBucket)

      // Auto-close the window if the 10-minute expiry has passed
      if (windowExpiry && now > windowExpiry) {
        handleDeactivate()
      }
    }

    tick() // Run immediately on activation
    const interval = setInterval(tick, 1000) // Then every second

    // Cleanup: stop the interval when the QR screen is dismissed
    return () => clearInterval(interval)

  }, [activeEvent, windowExpiry])


  // ── ACTIVATE QR WINDOW ────────────────────────────────────
  // Updates the event row in Supabase to mark it as active,
  // records when it opened, and sets the 10-minute expiry.
  async function handleActivate(event) {
    const now = new Date()
    const closesAt = new Date(now.getTime() + 10 * 60 * 1000) // +10 minutes

    const { error } = await supabase
      .from('events')
      .update({
        qr_window_active:    true,
        qr_window_opened_at: now.toISOString(),
        qr_window_closes_at: closesAt.toISOString(),
      })
      .eq('id', event.id)

    if (error) {
      console.error('Failed to activate QR window:', error.message)
      return
    }

    // Store the active event and expiry in state to drive the QR display
    setActiveEvent(event)
    setWindowExpiry(closesAt.getTime())
  }


  // ── DEACTIVATE QR WINDOW ──────────────────────────────────
  // Closes the QR window in the DB and resets local state.
  async function handleDeactivate() {
    if (!activeEvent) return

    await supabase
      .from('events')
      .update({ qr_window_active: false })
      .eq('id', activeEvent.id)

    setActiveEvent(null)
    setScanUrl('')
    setWindowExpiry(null)
  }


  // ── RENDER: PIN GATE ──────────────────────────────────────
  // Shown before the admin has authenticated.
  if (!unlocked) {
    return (
      <main className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 w-full max-w-sm text-center">
          <p className="text-xs font-semibold tracking-widest text-indigo-400 uppercase mb-2">
            Admin Access
          </p>
          <h1 className="text-2xl font-bold text-white mb-6">Enter PIN</h1>

          <form onSubmit={handlePinSubmit} className="space-y-4">
            <input
              type="password"
              value={pinInput}
              onChange={(e) => { setPinInput(e.target.value); setPinError(false) }}
              placeholder="••••"
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-3 text-center text-lg tracking-widest focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            {pinError && (
              <p className="text-red-400 text-sm">Incorrect PIN. Try again.</p>
            )}
            <button
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-lg transition-colors"
            >
              Unlock
            </button>
          </form>
        </div>
      </main>
    )
  }


  // ── RENDER: QR DISPLAY ────────────────────────────────────
  // Shown when a QR window is active. Designed for projector display.
  if (activeEvent && scanUrl) {
    const minutesLeft = windowExpiry
      ? Math.max(0, Math.ceil((windowExpiry - Date.now()) / 60000))
      : 10

    return (
      <main className="min-h-screen bg-gray-950 flex flex-col items-center justify-center px-4 py-12">

        <p className="text-xs font-semibold tracking-widest text-indigo-400 uppercase mb-2">
          Now Scanning Attendance
        </p>
        <h1 className="text-3xl font-bold text-white mb-8 text-center">
          {activeEvent.name}
        </h1>

        {/* White padding around QR helps cameras lock on faster */}
        <div className="bg-white p-6 rounded-2xl shadow-2xl mb-6">
          <QRCodeSVG
            value={scanUrl}
            size={260}
            level="H"  // High error correction — readable even if partially covered
          />
        </div>

        <p className="text-gray-400 text-sm mb-1">
          QR refreshes in{' '}
          <span className="text-white font-bold">{secondsLeft}s</span>
        </p>
        <p className="text-gray-500 text-xs mb-8">
          Window closes in ~{minutesLeft} minute{minutesLeft !== 1 ? 's' : ''}
        </p>

        <button
          onClick={handleDeactivate}
          className="bg-red-600 hover:bg-red-700 text-white font-semibold px-6 py-3 rounded-lg text-sm transition-colors"
        >
          Close QR Window
        </button>

      </main>
    )
  }


  // ── RENDER: EVENT LIST ────────────────────────────────────
  // Default admin view — shows all events with activate buttons.
  return (
    <main className="min-h-screen bg-gray-950 px-4 py-12">
      <div className="max-w-xl mx-auto">

        <div className="mb-8">
          <p className="text-xs font-semibold tracking-widest text-indigo-400 uppercase mb-2">
            Admin Panel
          </p>
          <h1 className="text-3xl font-bold text-white">Events</h1>
          <p className="text-gray-500 text-sm mt-1">
            Open a QR window at the end of an event so students can scan their attendance.
          </p>
        </div>

        {loading ? (
          <p className="text-gray-500 text-sm">Loading events...</p>
        ) : events.length === 0 ? (
          <p className="text-gray-500 text-sm">
            No events found. Add one in your Supabase Table Editor first.
          </p>
        ) : (
          <div className="space-y-3">
            {events.map((event) => (
              <div
                key={event.id}
                className="bg-gray-900 border border-gray-800 rounded-xl p-5 flex items-center justify-between"
              >
                <div>
                  <p className="text-white font-semibold">{event.name}</p>
                  <p className="text-gray-500 text-xs mt-0.5">
                    {new Date(event.event_date).toLocaleDateString('en-PH', {
                      year: 'numeric', month: 'long', day: 'numeric'
                    })}
                  </p>
                </div>

                <button
                  onClick={() => handleActivate(event)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
                >
                  Open QR Window
                </button>
              </div>
            ))}
          </div>
        )}

      </div>
    </main>
  )
}