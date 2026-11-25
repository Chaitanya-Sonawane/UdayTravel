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
  Download,
  Ticket as TicketIcon,
  Loader2,
  User,
  Copy,
  Check,
  X,
} from 'lucide-react'
import {
  formatDateWithDay,
  formatTime12h,
  calculateCancellationTimeline,
} from '@/lib/time/cancellation-format'
import { getApiAuthHeaders } from '@/lib/firebase/client'
import { subscribeToAuth } from '@/lib/auth/client-auth'
import { CancellationModal } from '@/components/cancellation/CancellationModal'

export default function BookingsPage() {
  const [tickets, setTickets] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTicketForCancel, setSelectedTicketForCancel] = useState<string | null>(null)
  const [copiedTicket, setCopiedTicket] = useState<string | null>(null)
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
          if (Array.isArray(data.tickets)) {
            setTickets(data.tickets)
            setLoading(false)
            return
          }
        }
      } catch {
        // Safe catch for bookings fetch
      }

      setTickets([])
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

    setTickets([])
    setLoading(false)
  }

  const handleResetSearch = async () => {
    setSearchQuery('')
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
    } catch {}
    setTickets([])
    setLoading(false)
  }

  const copyTicketNo = (ticketNo: string) => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(ticketNo)
      setCopiedTicket(ticketNo)
      setTimeout(() => setCopiedTicket(null), 2000)
    }
  }

  return (
    <main className="hub-page min-h-screen bg-gray-50/70 text-gray-900 pb-12">
      {/* Top Header with WebApp Main Logo */}
      <header className="hub-header sticky top-0 z-50 bg-white border-b border-gray-200 shadow-xs flex items-center justify-between px-3 sm:px-6 h-16">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <Link
            href="/"
            aria-label="Back home"
            className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-600 hover:text-gray-950 hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft size={19} />
          </Link>
          <Link href="/" className="page-brand flex items-center gap-2 group" aria-label="Uday Travels Home" title="Uday Travels Home">
            <span
              className="page-brand-mark bg-[#F8B018] font-black rounded-lg w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center text-xs tracking-wider shadow-xs group-hover:scale-105 transition-transform"
              style={{ backgroundColor: '#F8B018', color: '#0B0F19', fontWeight: 900 }}
            >
              UT
            </span>
            <span className="page-brand-name font-black tracking-widest text-xs sm:text-sm text-gray-950 group-hover:text-[#D97706] transition-colors">
              UDAY TRAVELS
            </span>
          </Link>
        </div>

        <Link
          href="/account"
          aria-label="My Account"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-none bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-950 font-bold text-xs transition-colors shadow-2xs"
        >
          <User size={15} className="text-[#B45309]" />
          <span className="hidden sm:inline">My Account</span>
        </Link>
      </header>

      {/* Clean Title Bar (Background Image Removed) */}
      <section className="bg-white border-b border-gray-100 py-5 px-4 sm:px-6 lg:px-8 shadow-2xs">
        <div className="max-w-[580px] lg:max-w-5xl mx-auto flex items-center justify-between gap-3 flex-wrap">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#F8B018]" />
              <span className="text-[10px] font-black uppercase tracking-widest text-[#B45309]">
                PASSENGER HUB
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-gray-950 tracking-tight mt-0.5 mb-0">
              My Bookings
            </h1>
            <p className="text-xs text-gray-500 mt-0.5 mb-0">
              Manage your confirmed journeys, boarding passes, and seat allocations.
            </p>
          </div>

          {!loading && tickets.length > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-amber-900 font-extrabold text-xs shadow-2xs">
              <TicketIcon size={14} className="text-[#F8B018]" />
              <span>{tickets.length} {tickets.length === 1 ? 'Booking' : 'Bookings'}</span>
            </div>
          )}
        </div>
      </section>

      <div className="hub-content space-y-4 max-w-[580px] lg:max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-5">
        {/* Modern Search Bar */}
        <form
          onSubmit={handleSearch}
          className="relative flex items-center gap-2 bg-white rounded-2xl border border-gray-200 p-2 shadow-xs focus-within:border-[#F8B018] focus-within:ring-2 focus-within:ring-[#F8B018]/20 transition-all"
        >
          <Search size={18} className="text-gray-400 ml-2.5 shrink-0" />
          <input
            type="text"
            placeholder="Search by ticket number (e.g. UT25354)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-transparent border-0 outline-none text-xs sm:text-sm text-gray-900 placeholder:text-gray-400 font-medium py-1"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={handleResetSearch}
              className="text-gray-400 hover:text-gray-600 p-1 rounded-md"
              aria-label="Clear search"
            >
              <X size={16} />
            </button>
          )}
          <button
            type="submit"
            className="px-4 py-2 rounded-xl bg-[#F8B018] hover:bg-[#E09E14] text-gray-950 font-black text-xs transition-colors shadow-2xs shrink-0 cursor-pointer"
          >
            Find
          </button>
        </form>

        {loading && (
          <div className="py-12 text-center bg-white rounded-2xl border border-gray-200 shadow-xs animate-in fade-in duration-300">
            <div className="relative w-14 h-14 flex items-center justify-center mx-auto mb-3">
              <div className="absolute inset-0 rounded-2xl bg-[#F8B018]/15 animate-ping" />
              <div className="w-12 h-12 rounded-2xl bg-white border border-amber-200 shadow-sm flex items-center justify-center relative z-10">
                <Loader2 size={24} className="animate-spin text-[#F8B018]" />
              </div>
            </div>
            <p className="text-xs font-bold uppercase tracking-widest text-slate-700 font-mono">
              Loading bookings...
            </p>
          </div>
        )}

        {!loading && tickets.length === 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center space-y-3 shadow-xs">
            <TicketIcon size={36} className="text-gray-300 mx-auto" />
            <h3 className="text-sm font-bold text-gray-900">No Bookings Found</h3>
            <p className="text-xs text-gray-500">
              No active or past bookings found matching your search.
            </p>
            <div className="pt-2">
              <Link
                href="/availability"
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#F8B018] text-gray-950 font-bold text-xs rounded-xl shadow-xs hover:bg-[#e09b0b] transition-colors"
              >
                Book a Journey <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        )}

        {/* List of Upgraded Ticket Cards */}
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
                className="booking-card bg-white rounded-2xl border border-gray-200 p-4 sm:p-5 shadow-sm hover:shadow-md transition-shadow space-y-3.5"
              >
                {/* Header status & PNR with Copy */}
                <div className="flex items-center justify-between gap-2 border-b border-gray-100 pb-3">
                  {isCancelled ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-50 border border-red-200 text-red-700 text-xs font-black tracking-wide">
                      <XCircle size={14} className="text-red-600" /> CANCELLED
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-black tracking-wide">
                      <CheckCircle2 size={14} className="text-emerald-600" /> CONFIRMED
                    </span>
                  )}

                  <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 px-2 py-0.5 rounded-lg">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">PNR</span>
                    <code className="text-xs font-mono font-black text-gray-900">{t.ticketNo}</code>
                    <button
                      type="button"
                      onClick={() => copyTicketNo(t.ticketNo)}
                      className="text-gray-400 hover:text-[#D97706] p-0.5 transition-colors cursor-pointer"
                      title="Copy Ticket Number"
                      aria-label="Copy Ticket Number"
                    >
                      {copiedTicket === t.ticketNo ? (
                        <Check size={13} className="text-emerald-600" />
                      ) : (
                        <Copy size={13} />
                      )}
                    </button>
                  </div>
                </div>

                {/* Route Header */}
                <div className="flex items-center justify-between">
                  <h2 className="text-lg sm:text-xl font-black text-gray-950 tracking-tight m-0 flex items-center gap-2">
                    <span>{t.route?.from || 'Ahilyanagar'}</span>
                    <span className="text-[#F8B018]">→</span>
                    <span>{t.route?.to || 'Pune'}</span>
                  </h2>
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200">
                    {t.busType || '3+2 Seater'}
                  </span>
                </div>

                {/* Highlight Departure Time & Bus Box */}
                <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-3.5 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
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
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                      Bus Number
                    </span>
                    <strong className="text-xs sm:text-sm font-mono font-black text-gray-900 block mt-0.5">
                      {t.busNumber || 'MH 16 DP 4951'}
                    </strong>
                    <span className="text-[11px] text-gray-500 block truncate max-w-[130px]">
                      {t.busName || 'Uday Express 55-Seater'}
                    </span>
                  </div>
                </div>

                {/* Clean Meta Details Grid */}
                <div className="grid grid-cols-3 gap-2 py-2.5 px-3 rounded-xl bg-gray-50/80 border border-gray-100 text-center">
                  <div>
                    <b className="text-xs sm:text-sm font-mono font-black text-gray-900 block truncate">
                      {seatList || 'Seat 1'}
                    </b>
                    <small className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mt-0.5">
                      Seats
                    </small>
                  </div>
                  <div>
                    <b className="text-xs sm:text-sm font-mono font-black text-gray-900 block">
                      {depTime12h}
                    </b>
                    <small className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mt-0.5">
                      Scheduled
                    </small>
                  </div>
                  <div>
                    <b className="text-xs sm:text-sm font-mono font-black text-[#B45309] block">
                      {totalFormatted}
                    </b>
                    <small className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mt-0.5">
                      Amount Paid
                    </small>
                  </div>
                </div>

                {/* Card Actions */}
                <div className={`grid gap-2 pt-1 ${canCancelTicket ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2'}`}>
                  <Link
                    className="min-h-[44px] rounded-xl bg-[#F8B018] hover:bg-[#E09E14] text-gray-950 font-black text-xs flex items-center justify-center gap-2 shadow-xs transition-colors"
                    href={`/ticket/${t.ticketNo}`}
                  >
                    View Ticket <ArrowRight size={16} />
                  </Link>

                  <a
                    href={`/api/tickets/${t.ticketNo}/pdf`}
                    download={`UdayTravels-${t.ticketNo}.pdf`}
                    className="min-h-[44px] rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-gray-800 font-bold text-xs flex items-center justify-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                    title="Download Ticket as PDF"
                  >
                    <Download size={14} className="text-amber-600 shrink-0" />
                    <span>Download PDF</span>
                  </a>

                  {/* Cancel Button visible ONLY while window is open */}
                  {canCancelTicket && (
                    <button
                      type="button"
                      data-testid={`cancel-button-${t.ticketNo}`}
                      onClick={() => setSelectedTicketForCancel(t.ticketNo)}
                      className="inline-flex items-center justify-center gap-1.5 min-h-[44px] rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 font-extrabold text-xs transition-colors cursor-pointer"
                    >
                      <Clock size={14} /> Cancel Booking
                    </button>
                  )}
                </div>
              </article>
            )
          })}

        {/* Quick Links Card */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-xs">
          <Link
            href="/availability"
            className="flex items-center gap-3 p-4 hover:bg-amber-50/40 transition-colors group"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-[#F8B018] flex items-center justify-center shrink-0 border border-amber-200/60 group-hover:bg-[#F8B018] group-hover:text-gray-950 transition-colors">
              <BusFront size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <b className="text-xs sm:text-sm font-black text-gray-900 block group-hover:text-[#D97706] transition-colors">
                Book a new journey
              </b>
              <small className="text-[11px] text-gray-500 block">
                Ahilyanagar ↔ Pune Daily Non-Stop Coach
              </small>
            </div>
            <ArrowRight size={16} className="text-gray-400 group-hover:text-gray-700 transition-colors" />
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
