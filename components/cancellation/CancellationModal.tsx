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
  const [ticket, setTicket] = useState<any>(initialTicket || null)
  const [loading, setLoading] = useState(!initialTicket)
  const [error, setError] = useState('')
  const [walletBalancePaise, setWalletBalancePaise] = useState<number>(0)
  const [cancelling, setCancelling] = useState(false)
  const [cancelledResult, setCancelledResult] = useState<any>(null)

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

  // 1. Fetch fresh ticket from database (NEVER from client input in production)
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
          const errData = await ticketRes.json().catch(() => null)
          throw new Error(errData?.error?.message || 'Failed to load ticket details')
        }

        const ticketData = await ticketRes.json()
        if (active) {
          setTicket(ticketData)

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
    if (!ticket || cancelling || timeline?.isClosed) return
    setCancelling(true)
    setError('')
    try {
      const headers = await getApiAuthHeaders()
      const res = await fetch(`/api/tickets/${ticket.ticketNo}/cancel`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ reason: 'Customer requested cancellation from cancellation screen' }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error?.message || 'Cancellation request was rejected by server')
      }

      setCancelledResult(data)
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

  const totalPaidPaise = ticket?.fare?.totalPaise || (ticket?.fare?.total ? ticket.fare.total * 100 : 20000)
  const refundSplit = compute2575Refund(totalPaidPaise)

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

  // Confirm button text exactly as specified:
  // "Cancel ticket <Ticket No> for <Friday, 21 Nov 2026, 10:30 PM> - Bus <Bus No>?"
  const confirmButtonText = ticket
    ? `Cancel ticket ${ticket.ticketNo} for ${dateWithDay}, ${departureTime12h} - Bus ${busNumber}?`
    : 'Confirm Cancellation'

  const content = (
    <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden max-w-lg w-full flex flex-col max-h-[92vh] sm:max-h-[88vh]">
      {/* Modal / Screen Header */}
      <header className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/70 shrink-0">
        <div className="flex items-center gap-2.5">
          <span className="w-7 h-7 rounded-lg bg-amber-500 text-gray-950 font-black flex items-center justify-center text-xs shadow-xs">
            UT
          </span>
          <div>
            <h1 className="text-sm font-bold text-gray-900 leading-none">Cancel Booking</h1>
            <p className="text-[11px] text-gray-500 mt-0.5">Uday Travels Policy & Ticket Details</p>
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
      <div className="p-4 sm:p-5 overflow-y-auto space-y-4">
        {loading && (
          <div className="py-16 text-center">
            <Loader2 size={36} className="animate-spin text-[#F8B018] mx-auto mb-3" />
            <p className="text-xs font-semibold text-gray-600 uppercase tracking-widest">
              Fetching Ticket from Database...
            </p>
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

            <button
              type="button"
              onClick={onClose}
              className="w-full py-3 bg-[#F8B018] text-gray-950 font-bold text-xs rounded-xl hover:bg-[#e09b0b] transition-colors shadow-xs"
            >
              Done / Return to Bookings
            </button>
          </div>
        )}

        {!loading && ticket && !cancelledResult && (
          <>
            {/* 1. TICKET SUMMARY CARD AT TOP (Pulled from Database) */}
            <article
              data-testid="cancellation-ticket-card"
              className="rounded-2xl border-2 border-gray-200 bg-white p-4 sm:p-5 shadow-xs space-y-4"
            >
              {/* Ticket No / PNR Header */}
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <div>
                  <small className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">
                    Ticket No. / PNR (Booking ID)
                  </small>
                  <strong data-testid="ticket-pnr" className="text-base font-black text-gray-900 font-mono tracking-tight">
                    {ticket.ticketNo}
                  </strong>
                </div>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200">
                  {ticket.status}
                </span>
              </div>

              {/* HIGHLIGHTED DEPARTURE TIME: Largest, boldest text on the card */}
              <div className="bg-amber-500/10 border border-[#F8B018]/30 rounded-xl p-3.5 sm:p-4 text-center">
                <span className="text-[11px] font-bold uppercase tracking-widest text-amber-900 block mb-1">
                  Scheduled Departure Time (IST)
                </span>
                <div
                  data-testid="ticket-departure-time"
                  className="text-4xl sm:text-5xl font-black text-gray-950 font-mono tracking-tight leading-none"
                >
                  {departureTime12h}
                </div>
                <p data-testid="ticket-journey-date" className="text-xs font-bold text-amber-950 mt-2">
                  {dateWithDay}
                </p>
              </div>

              {/* Route & Times */}
              <div className="grid grid-cols-2 gap-3 pt-1 text-xs">
                <div>
                  <span className="text-gray-400 block text-[10px] uppercase font-bold">Route</span>
                  <strong className="text-gray-900 text-sm block mt-0.5">
                    {ticket.route.from} → {ticket.route.to}
                  </strong>
                  {arrivalTime12h && (
                    <span className="text-gray-500 text-[11px] block mt-0.5">
                      Est. Arrival: <b>{arrivalTime12h}</b>
                    </span>
                  )}
                </div>

                <div>
                  <span className="text-gray-400 block text-[10px] uppercase font-bold">Bus Registration</span>
                  <strong data-testid="ticket-bus-number" className="text-gray-900 text-sm block mt-0.5 font-mono">
                    {busNumber}
                  </strong>
                  <span className="text-gray-500 text-[11px] block mt-0.5 truncate" title={busType}>
                    {ticket.busName || 'Uday Express'} · {ticket.seatLayout || '3+2 Seater'}
                  </span>
                </div>
              </div>

              {/* Boarding Point & Reporting Time */}
              <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 text-xs flex items-start gap-2.5">
                <MapPin size={16} className="text-[#F8B018] shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <span className="text-[10px] uppercase font-bold text-gray-400 block">Boarding Point & Reporting</span>
                  <strong className="text-gray-900 block truncate">
                    {ticket.pickup.name}
                  </strong>
                  <span className="text-gray-600 text-[11px] block mt-0.5">
                    Reporting Time: <b>{ticket.pickup.time || departureTime12h}</b> (Please report 15 mins prior)
                  </span>
                </div>
              </div>

              {/* Seats & Passenger Names */}
              <div className="text-xs pt-1">
                <div className="flex items-center gap-1.5 mb-2 text-gray-500">
                  <Users size={14} className="text-gray-400" />
                  <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                    Seats & Passengers ({ticket.passengers.length})
                  </span>
                </div>
                <div className="space-y-1.5">
                  {ticket.passengers.map((p: any) => (
                    <div
                      key={p.seat}
                      className="flex items-center justify-between p-2 rounded-lg bg-gray-50 border border-gray-100"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded bg-amber-100 text-amber-900 font-mono font-bold text-xs flex items-center justify-center">
                          {p.seat}
                        </span>
                        <span className="font-semibold text-gray-900">{p.name}</span>
                        <span className="text-gray-400 text-[11px]">({p.age} yrs, {p.gender === 'female' ? 'F' : 'M'})</span>
                      </div>
                      <span className="text-[10px] font-bold text-gray-500 uppercase">Confirmed</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Amount Paid & Payment Mode */}
              <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-xs">
                <div>
                  <span className="text-gray-400 block text-[10px] uppercase font-bold">Payment Method</span>
                  <span className="font-medium text-gray-800">{paymentMode}</span>
                </div>
                <div className="text-right">
                  <span className="text-gray-400 block text-[10px] uppercase font-bold">Total Amount Paid</span>
                  <strong data-testid="ticket-amount-paid" className="text-base font-black text-gray-950 font-mono">
                    {refundSplit.totalPaidFormatted}
                  </strong>
                </div>
              </div>
            </article>

            {/* 2. CANCELLATION DEADLINE BOX (Directly Below Ticket Card) */}
            {timeline && (
              <div
                data-testid="cancellation-deadline-box"
                className={`rounded-2xl p-4 border-2 shadow-xs transition-colors ${
                  timeline.isClosed || timeline.isUnderOneHourAfterCutoff
                    ? 'border-red-400 bg-red-50/90 text-red-950'
                    : 'border-amber-400 bg-amber-50/90 text-amber-950'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                      timeline.isClosed || timeline.isUnderOneHourAfterCutoff
                        ? 'bg-red-200 text-red-800'
                        : 'bg-amber-200 text-amber-900'
                    }`}
                  >
                    {timeline.isClosed ? <ShieldAlert size={20} /> : <Clock size={20} />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <span className="text-[10px] font-bold uppercase tracking-wider block opacity-75">
                      Cancellation Policy & Deadline
                    </span>

                    <p className="text-xs font-bold mt-0.5">
                      Cancellation allowed until: <span className="underline">{timeline.allowedUntilFormatted}</span>
                    </p>

                    <div
                      data-testid="cancellation-countdown"
                      className={`mt-2 font-mono text-sm sm:text-base font-black tracking-tight flex items-center gap-1.5 ${
                        timeline.isClosed ? 'text-red-700' : 'text-amber-900'
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

            {/* 3. REFUND BREAKDOWN BOX (Below Deadline Box) */}
            <section
              data-testid="refund-breakdown-box"
              className="rounded-2xl border border-gray-200 bg-gray-50/70 p-4 space-y-2.5 text-xs"
            >
              <div className="flex items-center gap-2 border-b border-gray-200 pb-2">
                <Wallet size={16} className="text-amber-600" />
                <strong className="text-gray-900 text-xs uppercase tracking-wide">
                  Refund Breakdown & Wallet Credit
                </strong>
              </div>

              <div className="flex justify-between text-gray-600">
                <span>Total Amount Paid:</span>
                <strong className="text-gray-900 font-mono">{refundSplit.totalPaidFormatted}</strong>
              </div>

              <div className="flex justify-between text-emerald-800 bg-emerald-50/80 p-2 rounded-lg border border-emerald-100">
                <div>
                  <strong className="block font-bold">25% Refund to Source Method:</strong>
                  <span className="text-[10px] text-emerald-600 block">Returns to bank account / UPI within 3-5 business days</span>
                </div>
                <strong data-testid="refund-source-amount" className="font-mono text-sm self-center">
                  {refundSplit.sourceRefundFormatted}
                </strong>
              </div>

              <div className="flex justify-between text-amber-900 bg-amber-50/80 p-2 rounded-lg border border-amber-200">
                <div>
                  <strong className="block font-bold">75% Credited to Uday Wallet:</strong>
                  <span className="text-[10px] text-amber-700 block">Instant store credit for your next journey</span>
                </div>
                <strong data-testid="refund-wallet-amount" className="font-mono text-sm self-center">
                  {refundSplit.walletCreditFormatted}
                </strong>
              </div>

              <div className="pt-2 border-t border-gray-200 flex justify-between items-center text-gray-700">
                <div>
                  <span className="block text-gray-500 text-[11px]">New wallet balance after cancellation:</span>
                  <span className="text-[10px] text-gray-400">
                    Current: ₹{(walletBalancePaise / 100).toFixed(2)} + Credit: {refundSplit.walletCreditFormatted}
                  </span>
                </div>
                <strong data-testid="new-wallet-balance" className="font-mono text-sm text-gray-950 font-black">
                  ₹{(newWalletBalancePaise / 100).toFixed(2)}
                </strong>
              </div>
            </section>
          </>
        )}
      </div>

      {/* Modal / Screen Footer with Confirm Button */}
      {!loading && ticket && !cancelledResult && (
        <footer className="p-4 border-t border-gray-200 bg-gray-50 shrink-0 space-y-2">
          <button
            type="button"
            data-testid="confirm-cancellation-button"
            onClick={handleConfirmCancel}
            disabled={cancelling || timeline?.isClosed}
            className={`w-full py-3 px-4 rounded-xl font-bold text-xs leading-snug tracking-wide shadow-xs transition-all flex items-center justify-center gap-2 ${
              timeline?.isClosed
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-red-600 hover:bg-red-700 text-white active:scale-[0.99]'
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
              className="w-full py-2 text-center text-xs text-gray-500 hover:text-gray-800 font-semibold"
            >
              Keep My Booking (Go Back)
            </button>
          )}
        </footer>
      )}
    </div>
  )

  if (isStandalonePage) {
    return <div className="w-full max-w-lg mx-auto">{content}</div>
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
