'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  X,
  AlertTriangle,
  Clock,
  BusFront,
  MapPin,
  Users,
  Wallet,
  CheckCircle2,
  Loader2,
  ShieldAlert,
  ArrowRight,
  Check,
} from 'lucide-react'
import {
  formatDateWithDay,
  formatTime12h,
  calculateCancellationTimeline,
  compute2575Refund,
  CancellationTimeline,
} from '@/lib/time/cancellation-format'
import { getApiAuthHeaders } from '@/lib/firebase/client'

export interface CancellationModalProps {
  ticketNo: string
  isOpen: boolean
  onClose: () => void
  onSuccess?: (result: any) => void
  isStandalonePage?: boolean
  initialTicket?: any
  initialTimeline?: CancellationTimeline
}

export function CancellationModal({
  ticketNo,
  isOpen,
  onClose,
  onSuccess,
  isStandalonePage = false,
  initialTicket,
  initialTimeline,
}: CancellationModalProps) {
  const [ticket, setTicket] = useState<any>(() => {
    if (initialTicket) return initialTicket
    if (typeof window !== 'undefined' && ticketNo) {
      try {
        const stored = localStorage.getItem(`uday_ticket_${ticketNo}`)
        if (stored) return JSON.parse(stored)
      } catch {}
    }
    return null
  })
  const [loading, setLoading] = useState(() => {
    if (initialTicket) return false
    if (typeof window !== 'undefined' && ticketNo) {
      try {
        if (localStorage.getItem(`uday_ticket_${ticketNo}`)) return false
      } catch {}
    }
    return true
  })
  const [error, setError] = useState('')
  const [walletBalancePaise, setWalletBalancePaise] = useState<number>(0)
  const [cancelling, setCancelling] = useState(false)
  const [cancelledResult, setCancelledResult] = useState<any>(null)

  // Selected seats for cancellation (allows partial/seat-by-seat cancellation for multi-passenger bookings)
  const [selectedSeats, setSelectedSeats] = useState<string[]>(() => {
    if (initialTicket?.passengers) {
      return initialTicket.passengers.map((p: any) => p.seat)
    }
    return []
  })

  // Live countdown state
  const [timeline, setTimeline] = useState<CancellationTimeline | null>(() => {
    if (initialTimeline) return initialTimeline
    if (initialTicket) {
      const depTime = initialTicket.pickup?.pickupTime || initialTicket.pickup?.time || '06:00'
      return calculateCancellationTimeline({
        travelDate: initialTicket.travelDate,
        departureTime: depTime,
      })
    }
    return null
  })

  // Ensure selectedSeats defaults to all passengers when ticket is loaded
  useEffect(() => {
    if (ticket?.passengers?.length && selectedSeats.length === 0 && !cancelledResult) {
      setSelectedSeats(ticket.passengers.map((p: any) => p.seat))
    }
  }, [ticket, cancelledResult])

  const toggleSeat = (seatId: string) => {
    if (selectedSeats.includes(seatId)) {
      setSelectedSeats(selectedSeats.filter((s) => s !== seatId))
    } else {
      setSelectedSeats([...selectedSeats, seatId])
    }
  }

  const selectAllSeats = () => {
    if (!ticket?.passengers) return
    setSelectedSeats(ticket.passengers.map((p: any) => p.seat))
  }

  const deselectAllSeats = () => {
    setSelectedSeats([])
  }

  // 1. Fetch fresh ticket from database
  useEffect(() => {
    if (!isOpen || !ticketNo || initialTicket) return
    let active = true

    async function loadData() {
      setLoading(true)
      setError('')
      setCancelledResult(null)
      try {
        const headers = await getApiAuthHeaders()
        const [ticketRes, walletRes] = await Promise.all([
          fetch(`/api/tickets/${ticketNo}`, { headers }),
          fetch('/api/wallet', { headers }).catch(() => null),
        ])

        if (!ticketRes.ok) {
          if (typeof window !== 'undefined' && ticketNo) {
            try {
              const stored = localStorage.getItem(`uday_ticket_${ticketNo}`)
              if (stored) {
                const parsed = JSON.parse(stored)
                if (parsed && (parsed.ticketNo === ticketNo || !parsed.ticketNo)) {
                  if (active) {
                    setTicket(parsed)
                    setLoading(false)
                    return
                  }
                }
              }
            } catch {}
          }
          const errData = await ticketRes.json().catch(() => null)
          throw new Error(errData?.error?.message || 'Failed to load ticket details')
        }

        const ticketData = await ticketRes.json()
        if (active) {
          setTicket(ticketData)
          if (ticketData.passengers && ticketData.passengers.length > 0) {
            setSelectedSeats(ticketData.passengers.map((p: any) => p.seat))
          }

          // Initial timeline calculation
          const depTime = ticketData.pickup?.pickupTime || ticketData.pickup?.time || '06:00'
          const initialTl = calculateCancellationTimeline({
            travelDate: ticketData.travelDate,
            departureTime: depTime,
          })
          setTimeline(initialTl)
        }

        if (walletRes && walletRes.ok) {
          const walletData = await walletRes.json()
          if (active) {
            setWalletBalancePaise(walletData.availablePaise || walletData.balancePaise || 0)
          }
        }
      } catch (err: unknown) {
        if (active) {
          setError(err instanceof Error ? err.message : 'Error retrieving ticket from server')
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    loadData()
    return () => {
      active = false
    }
  }, [ticketNo, isOpen])

  // 2. Live 1-second interval timer for the countdown
  useEffect(() => {
    if (!ticket || !isOpen || cancelledResult) return

    const depTime = ticket.pickup?.pickupTime || ticket.pickup?.time || '06:00'

    const timer = setInterval(() => {
      const updatedTl = calculateCancellationTimeline({
        travelDate: ticket.travelDate,
        departureTime: depTime,
        now: new Date(),
      })
      setTimeline(updatedTl)
    }, 1000)

    return () => clearInterval(timer)
  }, [ticket, isOpen, cancelledResult])

  if (!isOpen) return null

  // Execute Cancellation
  const handleConfirmCancel = async () => {
    if (!ticket || cancelling || timeline?.isClosed || selectedSeats.length === 0) return
    setCancelling(true)
    setError('')
    try {
      const headers = await getApiAuthHeaders()
      const res = await fetch(`/api/tickets/${ticket.ticketNo}/cancel`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          reason: 'Customer requested cancellation from cancellation screen',
          selectedSeats,
          ticket,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error?.message || 'Cancellation request was rejected by server')
      }

      if (typeof window !== 'undefined') {
        try {
          const updated = {
            ...ticket,
            status: 'CANCELLED',
            cancelledAt: new Date().toISOString(),
          }
          localStorage.setItem(`uday_ticket_${ticket.ticketNo}`, JSON.stringify(updated))

          // Update uday_my_tickets
          const myTickets = JSON.parse(localStorage.getItem('uday_my_tickets') || '[]')
          if (Array.isArray(myTickets)) {
            const updatedList = myTickets.map((t: any) =>
              t.ticketNo === ticket.ticketNo
                ? { ...t, status: 'CANCELLED', cancelledAt: new Date().toISOString() }
                : t
            )
            localStorage.setItem('uday_my_tickets', JSON.stringify(updatedList))
          }

          // Record in uday_cancelled_tickets
          const cancelledList = JSON.parse(localStorage.getItem('uday_cancelled_tickets') || '[]')
          if (!cancelledList.includes(ticket.ticketNo)) {
            cancelledList.push(ticket.ticketNo)
            localStorage.setItem('uday_cancelled_tickets', JSON.stringify(cancelledList))
          }
        } catch {}
      }

      setCancelledResult({
        ...data,
        cancelledSeats: selectedSeats,
      })
      if (onSuccess) {
        onSuccess(data)
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to complete cancellation')
    } finally {
      setCancelling(false)
    }
  }

  // Calculated values
  const dateWithDay = ticket ? formatDateWithDay(ticket.travelDate) : ''
  const depTimeRaw = ticket ? ticket.pickup?.pickupTime || ticket.pickup?.time || '06:00' : '06:00'
  const departureTime12h = ticket ? formatTime12h(depTimeRaw, ticket.travelDate) : ''
  const busNumber = ticket?.busNumber || 'MH-12-UT-2026'
  const busType = `${ticket?.seatLayout || '3+2 Seater Coach'} · AC Sleeper/Seater`
  const arrivalTime12h = ticket?.drop?.time ? formatTime12h(ticket.drop.time, ticket.travelDate) : null

  const totalSeatsCount = ticket?.passengers?.length || 1
  const selectedSeatsCount = selectedSeats.length
  const fullPaidPaise = ticket?.fare?.totalPaise || (ticket?.fare?.total ? ticket.fare.total * 100 : 20000)

  // Prorated paid paise for selected seats:
  const activePaidPaise =
    selectedSeatsCount === totalSeatsCount
      ? fullPaidPaise
      : selectedSeatsCount > 0
      ? Math.round((fullPaidPaise / totalSeatsCount) * selectedSeatsCount)
      : 0

  const refundSplit = compute2575Refund(activePaidPaise)

  // Payment mode determination
  const walletDebitPaise = ticket?.payment?.walletDebitPaise || 0
  const razorpayPaise = ticket?.payment?.razorpayPaise || 0
  let paymentMode = 'Gateway (UPI / Card)'
  if (walletDebitPaise > 0 && razorpayPaise > 0) {
    paymentMode = 'Mixed (Gateway + Wallet)'
  } else if (walletDebitPaise > 0 && razorpayPaise === 0) {
    paymentMode = 'Uday Travels Wallet'
  }

  // New wallet balance calculation
  const newWalletBalancePaise = walletBalancePaise + refundSplit.walletCreditPaise

  const perSeatAmountFormatted = (fullPaidPaise / (totalSeatsCount * 100)).toFixed(2)

  // Confirm button text:
  const confirmButtonText =
    selectedSeatsCount === 0
      ? 'Select at least 1 seat to cancel'
      : selectedSeatsCount === totalSeatsCount
      ? 'Cancel Ticket'
      : `Cancel Seat${selectedSeats.length > 1 ? 's' : ''} (${selectedSeats.join(', ')})`

  const content = (
    <div className="bg-white rounded-2xl sm:rounded-3xl shadow-xl border border-gray-200/90 overflow-hidden max-w-xl sm:max-w-2xl w-full flex flex-col max-h-[92vh] sm:max-h-[88vh] font-jakarta">
      {/* Modal / Screen Header */}
      <header className="px-5 sm:px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/80 shrink-0">
        <div className="flex items-center gap-3">
          <span
            className="w-8 h-8 rounded-xl bg-[#F8B018] text-[#0B0F19] font-black flex items-center justify-center text-xs shadow-xs shrink-0"
            style={{ backgroundColor: '#F8B018', color: '#0B0F19', fontWeight: 900 }}
          >
            UT
          </span>
          <div>
            <h1 className="text-base font-black text-gray-900 leading-none">Cancel Booking</h1>
            <p className="text-[11px] text-gray-500 mt-1">Uday Travels Policy &amp; Ticket Details</p>
          </div>
        </div>
        {!isStandalonePage && (
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        )}
      </header>

      {/* Scrollable Body */}
      <div className="p-4 sm:p-6 overflow-y-auto space-y-4">
        {/* Minimal clean loading spinner */}
        {loading && (
          <div className="py-20 text-center flex flex-col items-center justify-center">
            <Loader2 size={36} className="animate-spin text-[#F8B018]" />
          </div>
        )}

        {error && !cancelledResult && (
          <div className="p-4 rounded-xl border border-red-300 bg-red-50 text-red-950 text-xs">
            <div className="flex items-start gap-2.5">
              <AlertTriangle size={18} className="text-red-600 shrink-0 mt-0.5" />
              <div>
                <strong className="block font-bold">Cancellation Request Notice</strong>
                <p className="mt-0.5 leading-relaxed">{error}</p>
                {(error.includes('link your phone') || error.includes('sign in')) && (
                  <Link
                    href="/account"
                    className="mt-2 inline-flex items-center gap-1.5 font-bold text-amber-800 hover:text-amber-950 underline"
                  >
                    Go to Account &amp; Link Phone Number &rarr;
                  </Link>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Cancellation Success State */}
        {cancelledResult && (
          <div className="py-6 text-center space-y-4 animate-in fade-in-50 duration-300">
            <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 size={32} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Booking Cancelled Successfully</h2>
              <p className="text-xs text-gray-600 mt-1 max-w-sm mx-auto">
                Ticket <strong>{cancelledResult.ticketNo}</strong> has been cancelled. A confirmation has been prepared for SMS & Email.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/60 text-left text-xs space-y-2">
              <div className="flex justify-between border-b border-emerald-200/60 pb-2">
                <span className="text-gray-600">Refund to Payment Source (25%):</span>
                <strong className="text-emerald-800 font-mono text-sm">{cancelledResult.refundAmount}</strong>
              </div>
              <div className="flex justify-between border-b border-emerald-200/60 pb-2">
                <span className="text-gray-600">Credited to Uday Wallet (75%):</span>
                <strong className="text-emerald-800 font-mono text-sm">{cancelledResult.walletCredit}</strong>
              </div>
              <div className="flex justify-between pt-1">
                <span className="text-gray-600">Bus & Journey:</span>
                <span className="font-semibold text-gray-900">{cancelledResult.busNumber} · {cancelledResult.dateWithDay}</span>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <Link
                href="/account"
                className="w-full py-3.5 bg-[#F8B018] text-[#0B0F19] font-black text-xs rounded-xl hover:bg-[#e09b0b] transition-colors shadow-xs flex items-center justify-center gap-2"
              >
                <Wallet size={16} />
                <span>Go to Wallet</span>
              </Link>
              <button
                type="button"
                onClick={onClose}
                className="w-full py-2.5 bg-gray-100 text-gray-700 font-bold text-xs rounded-xl hover:bg-gray-200 transition-colors cursor-pointer"
              >
                Return to Bookings
              </button>
            </div>
          </div>
        )}

        {!loading && ticket && !cancelledResult && (
          <>
            {/* 1. TICKET SUMMARY CARD AT TOP */}
            <article
              data-testid="cancellation-ticket-card"
              className="rounded-2xl border border-gray-200/90 bg-white p-4 sm:p-5 shadow-xs space-y-4"
            >
              {/* Ticket No / PNR Header */}
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <div>
                  <small className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">
                    Ticket No. / PNR (Booking ID)
                  </small>
                  <strong data-testid="ticket-pnr" className="text-base sm:text-lg font-black text-gray-900 font-mono tracking-tight">
                    {ticket.ticketNo}
                  </strong>
                </div>
                <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-2xs">
                  {ticket.status}
                </span>
              </div>

              {/* HIGHLIGHTED DEPARTURE TIME */}
              <div className="bg-gradient-to-b from-amber-500/10 to-amber-500/5 border border-[#F8B018]/30 rounded-2xl p-4 sm:p-5 text-center shadow-2xs">
                <span className="text-[11px] font-bold uppercase tracking-widest text-amber-900 block mb-1">
                  Scheduled Departure Time (IST)
                </span>
                <div
                  data-testid="ticket-departure-time"
                  className="text-4xl sm:text-5xl font-black text-gray-950 font-mono tracking-tight leading-none my-1"
                >
                  {departureTime12h}
                </div>
                <p data-testid="ticket-journey-date" className="text-xs font-bold text-amber-950 mt-2">
                  {dateWithDay}
                </p>
              </div>

              {/* Route & Times */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 text-xs">
                <div className="bg-gray-50/70 p-3 rounded-xl border border-gray-100">
                  <span className="text-gray-400 block text-[10px] uppercase font-bold">Route</span>
                  <strong className="text-gray-900 text-sm block mt-0.5">
                    {ticket.route.from} → {ticket.route.to}
                  </strong>
                  {arrivalTime12h && (
                    <span className="text-gray-500 text-[11px] block mt-0.5">
                      Est. Arrival: <b className="text-gray-800">{arrivalTime12h}</b>
                    </span>
                  )}
                </div>

                <div className="bg-gray-50/70 p-3 rounded-xl border border-gray-100">
                  <span className="text-gray-400 block text-[10px] uppercase font-bold">Bus Registration</span>
                  <strong data-testid="ticket-bus-number" className="text-gray-900 text-sm block mt-0.5 font-mono">
                    {busNumber}
                  </strong>
                  <span className="text-gray-500 text-[11px] block mt-0.5 truncate" title={busType}>
                    {ticket.busName || 'Uday Express'} · {ticket.seatLayout || '3+2 Seater Coach'}
                  </span>
                </div>
              </div>

              {/* Boarding Point & Reporting Time */}
              <div className="bg-amber-50/40 rounded-xl p-3 sm:p-3.5 border border-amber-200/60 text-xs flex items-start gap-3">
                <MapPin size={18} className="text-[#D97706] shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <span className="text-[10px] uppercase font-bold text-amber-800/90 block">Boarding Point &amp; Reporting</span>
                  <strong className="text-gray-900 text-sm block truncate mt-0.5">
                    {ticket.pickup.name}
                  </strong>
                  <span className="text-gray-600 text-[11px] block mt-1">
                    Reporting Time: <b className="text-gray-900 font-semibold">{ticket.pickup.time || departureTime12h}</b> (Please report 15 mins prior)
                  </span>
                </div>
              </div>

              {/* Seats & Passenger Selection - Multi-Seat Partial Cancellation */}
              <div className="text-xs pt-1 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-gray-900">
                    <Users size={16} className="text-[#D97706]" />
                    <span className="text-xs font-bold uppercase tracking-wider text-gray-900">
                      Seats &amp; Passengers ({selectedSeats.length}/{ticket.passengers.length} selected to cancel)
                    </span>
                  </div>
                  {ticket.passengers.length > 1 && (
                    <div className="flex items-center gap-1.5 text-xs">
                      <button
                        type="button"
                        onClick={selectAllSeats}
                        className="text-[11px] font-bold px-2.5 py-1 rounded-lg border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 transition-colors cursor-pointer shadow-2xs"
                      >
                        Select all
                      </button>
                      <button
                        type="button"
                        onClick={deselectAllSeats}
                        className="text-[11px] font-medium px-2.5 py-1 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 transition-colors cursor-pointer"
                      >
                        Clear
                      </button>
                    </div>
                  )}
                </div>

                {/* Multi-seat scope banner */}
                {ticket.passengers.length > 1 && (
                  <div className="bg-gray-50 rounded-xl px-3.5 py-2.5 border border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px]">
                    <span className="text-gray-600 font-medium">
                      {selectedSeats.length === ticket.passengers.length
                        ? 'All seats selected for cancellation'
                        : selectedSeats.length === 0
                        ? 'Select at least 1 seat to proceed'
                        : `${selectedSeats.length} of ${ticket.passengers.length} seats selected`}
                    </span>
                    <span className="font-mono font-bold text-gray-900">
                      ₹{perSeatAmountFormatted} / seat × {selectedSeats.length} = ₹{(Number(perSeatAmountFormatted) * selectedSeats.length).toFixed(2)}
                    </span>
                  </div>
                )}

                {/* Seat Cards List - Refined & Professional Responsive Design */}
                <div className="space-y-2.5">
                  {ticket.passengers.map((p: any) => {
                    const isSelected = selectedSeats.includes(p.seat)
                    const seatRefund25 = (Number(perSeatAmountFormatted) * 0.25).toFixed(2)
                    const seatRefund75 = (Number(perSeatAmountFormatted) * 0.75).toFixed(2)

                    return (
                      <div
                        key={p.seat}
                        role="checkbox"
                        aria-checked={isSelected}
                        tabIndex={0}
                        onClick={() => toggleSeat(p.seat)}
                        onKeyDown={(e) => {
                          if (e.key === ' ' || e.key === 'Enter') {
                            e.preventDefault()
                            toggleSeat(p.seat)
                          }
                        }}
                        className={`p-3.5 rounded-xl border transition-all cursor-pointer select-none ${
                          isSelected
                            ? 'bg-rose-50/50 border-rose-300 shadow-2xs ring-1 ring-rose-200/60'
                            : 'bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50/50'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-3 min-w-0">
                            {/* Checkbox */}
                            <div
                              className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-all ${
                                isSelected
                                  ? 'bg-rose-600 border-rose-600 text-white shadow-2xs'
                                  : 'border-gray-300 bg-white'
                              }`}
                            >
                              {isSelected && <Check size={13} strokeWidth={3} />}
                            </div>

                            {/* Seat Badge */}
                            <span
                              className={`w-8 h-8 rounded-xl font-mono font-black text-xs flex items-center justify-center shrink-0 shadow-2xs ${
                                isSelected
                                  ? 'bg-rose-600 text-white border border-rose-600'
                                  : 'bg-gray-100 text-gray-800 border border-gray-200'
                              }`}
                            >
                              {p.seat}
                            </span>

                            {/* Passenger Details */}
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-bold text-xs sm:text-sm text-gray-900 truncate">{p.name}</span>
                                <span className="text-[11px] text-gray-500 font-medium">
                                  ({p.age} yrs, {p.gender === 'female' ? 'Female' : 'Male'})
                                </span>
                              </div>
                              <span className="text-[11px] text-gray-500 block font-mono mt-0.5">
                                Seat Fare: <strong className="text-gray-900 font-bold">₹{perSeatAmountFormatted}</strong>
                              </span>
                            </div>
                          </div>

                          {/* Action Badge */}
                          <div className="text-right shrink-0">
                            <span
                              className={`text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg border block text-center transition-all ${
                                isSelected
                                  ? 'bg-rose-600 text-white border-rose-600 shadow-2xs'
                                  : 'bg-gray-100 text-gray-600 border-gray-200'
                              }`}
                            >
                              {isSelected ? 'Cancel Seat' : 'Keep Confirmed'}
                            </span>
                          </div>
                        </div>

                        {/* Per-Seat Prorated Refund Breakdown Details */}
                        {isSelected && (
                          <div className="mt-2.5 pt-2.5 border-t border-rose-200/70 flex flex-col sm:flex-row sm:items-center justify-between text-[11px] text-rose-900/90 gap-0.5">
                            <span className="font-medium text-rose-800">Refund for this seat:</span>
                            <span className="font-mono font-semibold text-rose-950">
                              ₹{seatRefund25} (25% bank) + ₹{seatRefund75} (75% wallet)
                            </span>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Amount Paid & Payment Mode */}
              <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
                <div>
                  <span className="text-gray-400 block text-[10px] uppercase font-bold">Payment Method</span>
                  <span className="font-semibold text-gray-800">{paymentMode}</span>
                </div>
                <div className="text-right">
                  <span className="text-gray-400 block text-[10px] uppercase font-bold">Total Amount Paid</span>
                  <strong data-testid="ticket-amount-paid" className="text-base sm:text-lg font-black text-gray-950 font-mono">
                    {refundSplit.totalPaidFormatted}
                  </strong>
                </div>
              </div>
            </article>

            {/* 2. CANCELLATION DEADLINE BOX */}
            {timeline && (
              <div
                data-testid="cancellation-deadline-box"
                className={`rounded-2xl p-4 sm:p-5 border shadow-xs transition-colors ${
                  timeline.isClosed || timeline.isUnderOneHourAfterCutoff
                    ? 'border-red-400 bg-red-50/90 text-red-950'
                    : 'border-amber-200/90 bg-amber-50/60 text-amber-950'
                }`}
              >
                <div className="flex items-start gap-3.5">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-2xs ${
                      timeline.isClosed || timeline.isUnderOneHourAfterCutoff
                        ? 'bg-red-200 text-red-800'
                        : 'bg-amber-200/80 text-amber-900'
                    }`}
                  >
                    {timeline.isClosed ? <ShieldAlert size={22} /> : <Clock size={22} />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <span className="text-[10px] font-bold uppercase tracking-wider block opacity-75">
                      Cancellation Policy &amp; Deadline
                    </span>

                    <p className="text-xs sm:text-sm font-bold mt-0.5">
                      Cancellation allowed until: <span className="underline decoration-amber-400 decoration-2">{timeline.allowedUntilFormatted}</span>
                    </p>

                    <div
                      data-testid="cancellation-countdown"
                      className={`mt-2 font-mono text-sm sm:text-base font-black tracking-tight flex items-center gap-1.5 ${
                        timeline.isClosed ? 'text-red-700' : 'text-gray-950'
                      }`}
                    >
                      {timeline.countdownText}
                    </div>

                    {timeline.isClosed && (
                      <p className="text-[11px] text-red-700 mt-1 leading-normal font-medium">
                        The cutoff window (2 hours prior to scheduled departure) has ended. Cancellations cannot be processed.
                      </p>
                    )}

                    {!timeline.isClosed && timeline.isUnderOneHourAfterCutoff && (
                      <p className="text-[11px] text-red-700 mt-1 leading-normal font-semibold">
                        Warning: Less than 1 hour remains before the cancellation window closes.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* 3. REFUND BREAKDOWN BOX */}
            <section
              data-testid="refund-breakdown-box"
              className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5 space-y-3.5 text-xs shadow-xs"
            >
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2">
                  <Wallet size={18} className="text-[#D97706]" />
                  <strong className="text-gray-900 text-xs sm:text-sm uppercase tracking-wide font-extrabold">
                    Refund Breakdown &amp; Wallet Credit
                  </strong>
                </div>
                {ticket.passengers.length > 1 && (
                  <span className="text-[11px] font-mono font-bold text-amber-900 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-lg shadow-2xs">
                    {selectedSeatsCount} of {ticket.passengers.length} seat(s)
                  </span>
                )}
              </div>

              <div className="flex justify-between items-center text-gray-600 font-medium">
                <div>
                  <span className="block text-gray-700 font-semibold">Total Amount Paid:</span>
                  {ticket.passengers.length > 1 && selectedSeatsCount !== totalSeatsCount && (
                    <span className="text-[10px] text-gray-400 block font-normal">
                      Prorated for {selectedSeatsCount} selected seat{selectedSeatsCount === 1 ? '' : 's'}
                    </span>
                  )}
                </div>
                <strong className="text-gray-950 font-mono font-bold text-sm">
                  {refundSplit.totalPaidFormatted}
                </strong>
              </div>

              {/* 25% Refund to Source Method */}
              <div className="flex justify-between items-center text-gray-900 bg-blue-50/40 p-3 sm:p-3.5 rounded-xl border border-blue-200/70 shadow-2xs">
                <div>
                  <strong className="block font-bold text-xs text-blue-950">25% Refund to Source Method:</strong>
                  <span className="text-[11px] text-blue-700/80 block mt-0.5">Returns to bank account / UPI within 3-5 business days</span>
                </div>
                <strong data-testid="refund-source-amount" className="font-mono text-sm sm:text-base font-black text-blue-950 self-center pl-3">
                  {refundSplit.sourceRefundFormatted}
                </strong>
              </div>

              {/* 75% Credited to Uday Wallet */}
              <div className="flex justify-between items-center text-gray-900 bg-amber-50/50 p-3 sm:p-3.5 rounded-xl border border-amber-200/80 shadow-2xs">
                <div>
                  <strong className="block font-bold text-xs text-amber-950">75% Credited to Uday Wallet:</strong>
                  <span className="text-[11px] text-amber-700/80 block mt-0.5">Instant store credit for your next journey</span>
                </div>
                <strong data-testid="refund-wallet-amount" className="font-mono text-sm sm:text-base font-black text-amber-950 self-center pl-3">
                  {refundSplit.walletCreditFormatted}
                </strong>
              </div>

              {/* New wallet balance after cancellation */}
              <div className="pt-3 border-t border-gray-100 flex justify-between items-center text-gray-700">
                <div>
                  <span className="block text-gray-900 text-xs font-bold">New wallet balance after cancellation:</span>
                  <span className="text-[10px] text-gray-500 font-mono">
                    Current: ₹{(walletBalancePaise / 100).toFixed(2)} + Credit: {refundSplit.walletCreditFormatted}
                  </span>
                </div>
                <strong data-testid="new-wallet-balance" className="font-mono text-sm sm:text-base text-emerald-700 font-black">
                  ₹{(newWalletBalancePaise / 100).toFixed(2)}
                </strong>
              </div>
            </section>
          </>
        )}
      </div>

      {/* Modal / Screen Footer with Confirm Button */}
      {!loading && ticket && !cancelledResult && (
        <footer className="p-4 sm:p-5 border-t border-gray-100 bg-gray-50/80 shrink-0 space-y-2">
          <button
            type="button"
            data-testid="confirm-cancellation-button"
            onClick={handleConfirmCancel}
            disabled={cancelling || timeline?.isClosed || selectedSeatsCount === 0}
            className={`w-full py-3.5 px-4 rounded-xl font-bold text-sm leading-snug tracking-wide shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer ${
              timeline?.isClosed || selectedSeatsCount === 0
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed border border-gray-300'
                : 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/20 active:scale-[0.99]'
            }`}
          >
            {cancelling ? (
              <>
                <Loader2 size={16} className="animate-spin" /> Processing Cancellation...
              </>
            ) : (
              <span>{confirmButtonText}</span>
            )}
          </button>

          {!isStandalonePage && (
            <button
              type="button"
              onClick={onClose}
              disabled={cancelling}
              className="w-full py-2 text-center text-xs text-gray-500 hover:text-gray-800 font-semibold cursor-pointer"
            >
              Keep My Booking (Go Back)
            </button>
          )}
        </footer>
      )}
    </div>
  )

  if (isStandalonePage) {
    return <div className="w-full max-w-xl sm:max-w-2xl mx-auto">{content}</div>
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="cancel-booking-title"
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200"
    >
      {content}
    </div>
  )
}
export default CancellationModal
