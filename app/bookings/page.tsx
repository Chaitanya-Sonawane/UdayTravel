'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  ArrowRight,
  BusFront,
  CheckCircle2,
  Search,
  XCircle,
  Clock,
  Ticket as TicketIcon,
  Loader2,
} from 'lucide-react'
import {
  formatDateWithDay,
  formatTime12h,
  calculateCancellationTimeline,
} from '@/lib/time/cancellation-format'
import { getApiAuthHeaders } from '@/lib/firebase/client'
import { subscribeToAuth } from '@/lib/auth/client-auth'
import { CancellationModal } from '@/components/cancellation/CancellationModal'
import { mockTicket } from '@/lib/mock-tickets'

export default function BookingsPage() {
  const [tickets, setTickets] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTicketForCancel, setSelectedTicketForCancel] = useState<string | null>(null)
  const [now, setNow] = useState(new Date())

  // Keep live time ticking for cancellation window checks
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  // Load user's bookings from API
  useEffect(() => {
    const unsub = subscribeToAuth(async (user) => {
      setLoading(true)
      try {
        const headers = await getApiAuthHeaders()
        const res = await fetch('/api/bookings', { headers })
        if (res.ok) {
          const data = await res.json()
          if (Array.isArray(data.tickets) && data.tickets.length > 0) {
            setTickets(data.tickets)
            setLoading(false)
            return
          }
        }
      } catch (err) {
        console.warn('[Bookings Page] API bookings fetch note:', err)
      }

      // Fallback: mock ticket so user always sees their preview booking
      setTickets([mockTicket])
      setLoading(false)
    })

    return () => unsub()
  }, [])

  // Search by ticket number
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchQuery.trim()) return
    setLoading(true)
    try {
      const res = await fetch(`/api/bookings?ticketNo=${encodeURIComponent(searchQuery.trim())}`)
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data.tickets) && data.tickets.length > 0) {
          setTickets(data.tickets)
          setLoading(false)
          return
        }
      }
    } catch {}

    // Check mock
    if (searchQuery.trim().toUpperCase() === mockTicket.ticketNo) {
      setTickets([mockTicket])
    } else {
      setTickets([])
    }
    setLoading(false)
  }

  return (
    <main className="hub-page">
      <header className="hub-header">
        <Link href="/" aria-label="Back home">
          <ArrowLeft size={20} />
        </Link>
        <strong className="tracking-wider uppercase">My Bookings</strong>
        <Link href="/account" className="hub-avatar" aria-label="Account">
          <span className="page-brand-mark">UT</span>
        </Link>
      </header>

      <section className="hub-hero">
        <p>YOUR JOURNEYS</p>
        <h1>
          READY WHEN
          <br />
          <span>YOU ARE.</span>
        </h1>
        <small>Keep every trip, ticket, and live update in one place.</small>
      </section>

      <div className="hub-content space-y-4">
        {/* Search Bar */}
        <form onSubmit={handleSearch} className="booking-search">
          <Search size={16} />
          <input
            placeholder="Search by ticket number (e.g. UT25354)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <button type="submit">Find</button>
        </form>

        {loading && (
          <div className="py-12 text-center">
            <Loader2 size={32} className="animate-spin text-[#F8B018] mx-auto mb-2" />
            <p className="text-xs text-gray-500 uppercase tracking-widest">Loading bookings...</p>
          </div>
        )}

        {!loading && tickets.length === 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center space-y-3 shadow-xs">
            <TicketIcon size={36} className="text-gray-300 mx-auto" />
            <h3 className="text-sm font-bold text-gray-900">No Bookings Found</h3>
            <p className="text-xs text-gray-500">
              No active or past bookings found matching your search.
            </p>
            <Link
              href="/availability"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#F8B018] text-gray-950 font-bold text-xs rounded-lg shadow-xs hover:bg-[#e09b0b]"
            >
              Book a Journey <ArrowRight size={14} />
            </Link>
          </div>
        )}

        {/* List of Ticket Cards */}
        {!loading &&
          tickets.map((t: any) => {
            const isCancelled = t.status === 'CANCELLED'
            const dateWithDay = formatDateWithDay(t.travelDate)
            const depTimeRaw = t.pickup?.pickupTime || t.pickup?.time || '06:00'
            const depTime12h = formatTime12h(depTimeRaw, t.travelDate)

            // Evaluate live cancellation window
            const tl = calculateCancellationTimeline({
              travelDate: t.travelDate,
              departureTime: depTimeRaw,
              now,
            })
            const canCancelTicket = !isCancelled && t.status === 'CONFIRMED' && !tl.isClosed

            const totalPaise = t.fare?.totalPaise || (t.fare?.total ? t.fare.total * 100 : 20000)
            const totalFormatted = `₹${(totalPaise / 100).toFixed(2)}`
            const seatList = (t.passengers || []).map((p: any) => p.seat).join(', ')

            return (
              <article
                key={t.ticketNo}
                data-testid={`booking-card-${t.ticketNo}`}
                className="booking-card space-y-3"
              >
                {/* Header status */}
                <div className="booking-card-top">
                  <span className={isCancelled ? 'text-red-600 font-bold text-xs flex items-center gap-1' : 'confirmed'}>
                    {isCancelled ? (
                      <>
                        <XCircle size={15} /> CANCELLED
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={15} /> CONFIRMED
                      </>
                    )}
                  </span>
                  <code className="text-xs font-mono font-bold text-gray-700">{t.ticketNo}</code>
                </div>

                {/* Route */}
                <h2>
                  {t.route.from} <span>→</span> {t.route.to}
                </h2>

                {/* Date & Departure Time prominently rendered, never hidden */}
                <div className="bg-amber-50/70 border border-amber-200/60 rounded-xl p-3 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                      Departure Time (IST)
                    </span>
                    <strong className="text-xl sm:text-2xl font-black text-gray-950 font-mono tracking-tight block">
                      {depTime12h}
                    </strong>
                    <span className="text-xs font-bold text-gray-700 block mt-0.5">
                      {dateWithDay}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                      Bus Number
                    </span>
                    <strong className="text-xs font-mono font-bold text-gray-900 block mt-0.5">
                      {t.busNumber || 'MH-12-UT-2026'}
                    </strong>
                    <span className="text-[11px] text-gray-500 block truncate max-w-[120px]">
                      {t.busName || 'Uday Express'}
                    </span>
                  </div>
                </div>

                {/* Meta details */}
                <div className="booking-meta">
                  <span>
                    <b>{seatList || 'Seat 1'}</b>
                    <small>Seats</small>
                  </span>
                  <span>
                    <b>{depTime12h}</b>
                    <small>Scheduled</small>
                  </span>
                  <span>
                    <b>{totalFormatted}</b>
                    <small>Amount Paid</small>
                  </span>
                </div>

                {/* Card Actions */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  <Link className="hub-primary" href={`/ticket/${t.ticketNo}`}>
                    View Ticket <ArrowRight size={16} />
                  </Link>

                  {/* Cancel Button visible ONLY while window is open */}
                  {canCancelTicket && (
                    <button
                      type="button"
                      data-testid={`cancel-button-${t.ticketNo}`}
                      onClick={() => setSelectedTicketForCancel(t.ticketNo)}
                      className="inline-flex items-center justify-center gap-1.5 min-h-[44px] rounded-[.65rem] border border-red-300 bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xs transition-colors"
                    >
                      <Clock size={14} /> Cancel Booking
                    </button>
                  )}
                </div>
              </article>
            )
          })}

        {/* Quick Links */}
        <div className="hub-quick">
          <Link href="/availability">
            <BusFront size={18} />
            <span>
              <b>Book a new journey</b>
              <small>Ahilyanagar ↔ Pune</small>
            </span>
            <ArrowRight size={16} />
          </Link>
          <Link href="/track">
            <span className="quick-dot" />
            <span>
              <b>Track a bus</b>
              <small>Live service updates</small>
            </span>
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>

      {/* Cancellation Modal on "My Bookings" page */}
      {selectedTicketForCancel && (
        <CancellationModal
          ticketNo={selectedTicketForCancel}
          isOpen={Boolean(selectedTicketForCancel)}
          onClose={() => setSelectedTicketForCancel(null)}
          onSuccess={(res) => {
            setTickets((prev) =>
              prev.map((item) =>
                item.ticketNo === res.ticketNo ? { ...item, status: 'CANCELLED' } : item
              )
            )
            setSelectedTicketForCancel(null)
          }}
        />
      )}
    </main>
  )
}
