'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function RegistrationPage() {

  // ── STATE VARIABLES ───────────────────────────────────────────────────
  const [events, setEvents] = useState([])
  const [loadingEvents, setLoadingEvents] = useState(true)

  const [formData, setFormData] = useState({
    event_id:   '',
    student_id: '',
    full_name:  '',
    section:    '',
  })

  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  // ── FETCH EVENTS ON PAGE LOAD ─────────────────────────────────────────
  useEffect(() => {
    async function fetchEvents() {
      const { data, error } = await supabase
        .from('events')
        .select('id, name, event_date')
        .order('event_date', { ascending: true })

      if (error) {
        console.error('Error fetching events:', error.message)
      } else {
        setEvents(data)
      }

      setLoadingEvents(false)
    }

    fetchEvents()
  }, [])

  // ── HANDLE INPUT CHANGES ──────────────────────────────────────────────
  function handleChange(e) {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  // ── SUBMIT HANDLER ────────────────────────────────────────────────────
  async function handleSubmit(e) {
    e.preventDefault()
    setErrorMsg('')
    setSubmitting(true)

    const { error } = await supabase
      .from('registrations')
      .insert([
        {
          event_id:   formData.event_id,
          student_id: formData.student_id.trim(),
          full_name:  formData.full_name.trim(),
          section:    formData.section.trim() || null,
        }
      ])

    if (error) {
      if (error.code === '23505') {
        setErrorMsg("You've already registered for this event.")
      } else {
        setErrorMsg('Something went wrong. Please try again.')
        console.error('Supabase insert error:', error.message)
      }
      setSubmitting(false)
    } else {
      setSubmitted(true)
    }
  }

  // ── RENDER ────────────────────────────────────────────────────────────
  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">

        <div className="text-center mb-8">
          <p className="text-xs font-semibold tracking-widest text-indigo-500 uppercase mb-2">
            Student Body Organization
          </p>
          <h1 className="text-3xl font-bold text-gray-900">
            Event Registration
          </h1>
          <p className="text-gray-400 mt-2 text-sm">
            Register below. Attendance is marked via QR scan at the end of the event.
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">

          {submitted ? (
            <div className="text-center py-6">
              <div className="text-5xl mb-4">✅</div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">
                You're registered!
              </h2>
              <p className="text-gray-400 text-sm">
                See you at the event. Stay until the end — attendance is taken via QR scan before you leave.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Event
                </label>
                {loadingEvents ? (
                  <p className="text-sm text-gray-400 py-2">Loading events...</p>
                ) : (
                  <select
                    name="event_id"
                    value={formData.event_id}
                    onChange={handleChange}
                    required
                    className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  >
                    <option value="">Select an event</option>
                    {events.map((event) => (
                      <option key={event.id} value={event.id}>
                        {event.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Student ID
                </label>
                <input
                  type="text"
                  name="student_id"
                  value={formData.student_id}
                  onChange={handleChange}
                  placeholder="e.g. 2021-12345"
                  required
                  className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  name="full_name"
                  value={formData.full_name}
                  onChange={handleChange}
                  placeholder="e.g. Juan Dela Cruz"
                  required
                  className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Section
                  <span className="text-gray-400 font-normal ml-1">(optional)</span>
                </label>
                <input
                  type="text"
                  name="section"
                  value={formData.section}
                  onChange={handleChange}
                  placeholder="e.g. BSIT 3-A"
                  className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {errorMsg && (
                <p className="text-sm text-red-500 text-center">
                  {errorMsg}
                </p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:bg-indigo-300 text-white font-semibold py-3 rounded-lg text-sm transition-colors duration-150"
              >
                {submitting ? 'Registering...' : 'Register for Event'}
              </button>

            </form>
          )}

        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          Walk-ins welcome — you can also register on the day of the event. 👋
        </p>

      </div>
    </main>
  )
}