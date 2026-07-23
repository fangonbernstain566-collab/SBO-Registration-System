'use client'

import { Suspense, useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'

function ScanContent() {
  const searchParams = useSearchParams()
  const [status, setStatus]           = useState('validating')
  const [errorMsg, setErrorMsg]       = useState('')
  const [studentId, setStudentId]     = useState('')
  const [submitting, setSubmitting]   = useState(false)
  const [studentName, setStudentName] = useState('')

  useEffect(() => {
    async function validateToken() {
      const eventId     = searchParams.get('event')
      const tokenBucket = searchParams.get('t')

      const res = await fetch(`/api/scan/validate?event=${encodeURIComponent(eventId || '')}&t=${encodeURIComponent(tokenBucket || '')}`)
      const data = await res.json()

      if (!data.valid) {
        setErrorMsg(data.message)
        setStatus('error')
        return
      }

      setStatus('ready')
    }

    validateToken()
  }, [searchParams])

  async function handleScan(e) {
    e.preventDefault()
    setSubmitting(true)

    const eventId     = searchParams.get('event')
    const tokenBucket = parseInt(searchParams.get('t'))

    const res = await fetch('/api/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventId, tokenBucket, studentId }),
    })
    const data = await res.json()

    if (data.status === 'error') {
      setErrorMsg(data.message)
    }
    if (data.studentName) {
      setStudentName(data.studentName)
    }
    setStatus(data.status)
    setSubmitting(false)
  }

  if (status === 'validating') {
    return (
      <Screen>
        <p className="text-gray-400 text-sm animate-pulse">Validating QR code...</p>
      </Screen>
    )
  }

  if (status === 'error') {
    return (
      <Screen>
        <div className="text-5xl mb-4">⛔</div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Can't Check In</h2>
        <p className="text-gray-500 text-sm">{errorMsg}</p>
      </Screen>
    )
  }

  if (status === 'not-found') {
    return (
      <Screen>
        <div className="text-5xl mb-4">❓</div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Not Registered</h2>
        <p className="text-gray-500 text-sm">
          Your Student ID isn't registered for this event.
          Contact your SBO representative.
        </p>
      </Screen>
    )
  }

  if (status === 'already') {
    return (
      <Screen>
        <div className="text-5xl mb-4">👍</div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Already Checked In</h2>
        <p className="text-gray-500 text-sm">
          {studentName}, your attendance was already recorded. You're good!
        </p>
      </Screen>
    )
  }

  if (status === 'success') {
    return (
      <Screen>
        <div className="text-5xl mb-4">✅</div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Attendance Recorded!</h2>
        <p className="text-gray-500 text-sm">
          Thanks, {studentName}. You're all set — you can leave now.
        </p>
      </Screen>
    )
  }

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">

        <div className="text-center mb-8">
          <p className="text-xs font-semibold tracking-widest text-indigo-500 uppercase mb-2">
            Attendance Check-In
          </p>
          <h1 className="text-2xl font-bold text-gray-900">
            Enter Your Student ID
          </h1>
          <p className="text-gray-400 text-sm mt-2">
            This confirms you're physically present at the event.
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <form onSubmit={handleScan} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Student ID
              </label>
              <input
                type="text"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                placeholder="e.g. 2021-12345"
                required
                autoFocus
                className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-semibold py-3 rounded-lg text-sm transition-colors"
            >
              {submitting ? 'Checking in...' : 'Mark My Attendance'}
            </button>
          </form>
        </div>

      </div>
    </main>
  )
}

function Screen({ children }) {
  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="text-center max-w-xs">
        {children}
      </div>
    </main>
  )
}

export default function ScanPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-400 text-sm animate-pulse">Loading...</p>
      </main>
    }>
      <ScanContent />
    </Suspense>
  )
}