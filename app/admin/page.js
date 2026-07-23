'use client'

import { useState, useEffect } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { supabase } from '../../lib/supabase'

export default function AdminPage() {

  // ── STATE ─────────────────────────────────────────────────
  const [session, setSession]           = useState(undefined) // undefined = still checking, null = signed out
  const [emailInput, setEmailInput]     = useState('')
  const [passwordInput, setPasswordInput] = useState('')
  const [authError, setAuthError]       = useState('')
  const [signingIn, setSigningIn]       = useState(false)

  const [events, setEvents]             = useState([])     // All events from DB
  const [loading, setLoading]           = useState(true)   // Still fetching?

  const [activeEvent, setActiveEvent]   = useState(null)   // Which event is live
  const [scanUrl, setScanUrl]           = useState('')      // URL encoded in QR
  const [secondsLeft, setSecondsLeft]   = useState(30)    // Countdown to QR refresh
  const [windowExpiry, setWindowExpiry] = useState(null)  // When 10-min window ends


  // ── AUTH: LOAD + SUBSCRIBE TO SESSION ─────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  async function handleLoginSubmit(e) {
    e.preventDefault()
    setAuthError('')
    setSigningIn(true)

    const { error } = await supabase.auth.signInWithPassword({
      email: emailInput,
      password: passwordInput,
    })

    if (error) {
      setAuthError('Incorrect email or password.')
      setPasswordInput('')
    }
    setSigningIn(false)
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
  }


  // ── FETCH EVENTS ──────────────────────────────────────────
  // Only fetches once the admin is authenticated.
  useEffect(() => {
    if (!session) return

    async function fetchEvents() {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('event_date', { ascending: true })

      if (!error) setEvents(data)
      setLoading(false)
    }

    fetchEvents()
  }, [session])


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
  // Calls the server route (service-role key) to mark the event active,
  // record when it opened, and set the 10-minute expiry.
  async function handleActivate(event) {
    const { data: { session: current } } = await supabase.auth.getSession()

    const res = await fetch('/api/admin/activate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${current?.access_token}`,
      },
      body: JSON.stringify({ eventId: event.id }),
    })

    if (!res.ok) {
      console.error('Failed to activate QR window')
      return
    }

    const { event: updatedEvent } = await res.json()

    // Store the active event and expiry in state to drive the QR display
    setActiveEvent(updatedEvent)
    setWindowExpiry(new Date(updatedEvent.qr_window_closes_at).getTime())
  }


  // ── DEACTIVATE QR WINDOW ──────────────────────────────────
  // Closes the QR window via the server route and resets local state.
  async function handleDeactivate() {
    if (!activeEvent) return

    const { data: { session: current } } = await supabase.auth.getSession()

    await fetch('/api/admin/deactivate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${current?.access_token}`,
      },
      body: JSON.stringify({ eventId: activeEvent.id }),
    })

    setActiveEvent(null)
    setScanUrl('')
    setWindowExpiry(null)
  }


  // ── RENDER: AUTH LOADING ───────────────────────────────────
  // session is undefined until the initial getSession() resolves.
  if (session === undefined) {
    return (
      <main className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
        <p className="text-gray-500 text-sm">Loading...</p>
      </main>
    )
  }


  // ── RENDER: LOGIN GATE ─────────────────────────────────────
  // Shown before the admin has authenticated with Supabase Auth.
  if (!session) {
    return (
      <main className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 w-full max-w-sm text-center">
          <p className="text-xs font-semibold tracking-widest text-indigo-400 uppercase mb-2">
            Admin Access
          </p>
          <h1 className="text-2xl font-bold text-white mb-6">Sign In</h1>

          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <input
              type="email"
              value={emailInput}
              onChange={(e) => { setEmailInput(e.target.value); setAuthError('') }}
              placeholder="admin@example.com"
              autoComplete="username"
              required
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <input
              type="password"
              value={passwordInput}
              onChange={(e) => { setPasswordInput(e.target.value); setAuthError('') }}
              placeholder="Password"
              autoComplete="current-password"
              required
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            {authError && (
              <p className="text-red-400 text-sm">{authError}</p>
            )}
            <button
              type="submit"
              disabled={signingIn}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-semibold py-3 rounded-lg transition-colors"
            >
              {signingIn ? 'Signing in...' : 'Sign In'}
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

        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold tracking-widest text-indigo-400 uppercase mb-2">
              Admin Panel
            </p>
            <h1 className="text-3xl font-bold text-white">Events</h1>
            <p className="text-gray-500 text-sm mt-1">
              Open a QR window at the end of an event so students can scan their attendance.
            </p>
          </div>
          <button
            onClick={handleSignOut}
            className="text-gray-500 hover:text-white text-xs font-semibold px-3 py-2 rounded-lg border border-gray-800 hover:border-gray-700 transition-colors whitespace-nowrap"
          >
            Sign Out
          </button>
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