'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft,
  BusFront,
  CalendarPlus,
  Check,
  ChevronDown,
  Copy,
  Download,
  ExternalLink,
  MapPin,
  Navigation,
  Share2,
  Ticket as TicketIcon,
  XCircle,
  Loader2,
} from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { canCancel } from '@/lib/cancellation'
import { downloadCalendar } from '@/lib/ics'
import { getTicket, type Ticket } from '@/lib/mock-tickets'
import { getApiAuthHeaders } from '@/lib/firebase/client'
import { CancellationModal } from '@/components/cancellation/CancellationModal'

const money = (value: number) => `₹${value}`
const date = (value: string) =>
  new Date(`${value}T00:00:00`).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })

export default function TicketPage() {
  const { ticketNo } = useParams<{ ticketNo: string }>()
  const router = useRouter()
  const [copied, setCopied] = useState(false)
  const [terms, setTerms] = useState(false)
  const [payment, setPayment] = useState(false)
  const [qr, setQr] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [cancelModal, setCancelModal] = useState(false)
  const [cancelError, setCancelError] = useState('')

  const [ticket, setTicket] = useState<any>(() => getTicket(String(ticketNo)))
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchLiveTicket() {
      if (!ticketNo) return
      try {
        const headers = await getApiAuthHeaders()
        const res = await fetch(`/api/tickets/${ticketNo}`, { headers })
        if (res.ok) {
          const liveData = await res.json()
          setTicket(liveData)
        }
      } catch (err) {
        console.warn('[Ticket Page] Live ticket fetch notice:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchLiveTicket()
  }, [ticketNo])

  if (!ticket && !loading) {
    return (
      <main className="ticket-page">
        <div className="ticket-empty">
          <TicketIcon size={42} />
          <h1>No booking found for {ticketNo}</h1>
          <a className="ticket-button orange" href="/bookings">
            Search another ticket number
          </a>
        </div>
      </main>
    )
  }

  if (!ticket) {
    return (
      <main className="ticket-page">
        <div className="ticket-empty">
          <Loader2 size={42} className="animate-spin" />
          <p>Loading your ticket...</p>
        </div>
      </main>
    )
  }

  // Format paise vs rupees safely
  const perSeatRupees =
    ticket.fare.perSeatPaise !== undefined
      ? ticket.fare.perSeatPaise / 100
      : ticket.fare.perSeat || 200
  const totalRupees =
    ticket.fare.totalPaise !== undefined
      ? ticket.fare.totalPaise / 100
      : ticket.fare.total || perSeatRupees * ticket.passengers.length

  const isCancelled = ticket.status === 'CANCELLED'

  const copyTicket = () => {
    navigator.clipboard?.writeText(
      `Uday Travels · Ticket ${ticket.ticketNo} · ${ticket.route.from} → ${ticket.route.to} · ${date(ticket.travelDate)} · Bus ${ticket.busNumber} · Pickup ${ticket.pickup.name} ${ticket.pickup.time} · Drop ${ticket.drop.name} · Seats ${ticket.passengers.map((p: any) => p.seat).join(', ')} · Passengers: ${ticket.passengers.map((p: any) => p.name).join(', ')}`
    )
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const share = () =>
    window.open(
      `https://wa.me/?text=${encodeURIComponent(
        `Uday Travels ticket ${ticket.ticketNo}: ${ticket.route.from} → ${ticket.route.to} on ${date(ticket.travelDate)}. ${location.origin}/ticket/${ticket.ticketNo}`
      )}`,
      '_blank'
    )

  const handleCancelBooking = async () => {
    try {
      setCancelling(true)
      setCancelError('')
      const headers = await getApiAuthHeaders()
      const res = await fetch(`/api/tickets/${ticket.ticketNo}/cancel`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ reason: 'Customer requested cancellation' }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error?.message || 'Failed to cancel booking')
      }
      setTicket(data.ticket)
      setCancelModal(false)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Cancellation failed'
      setCancelError(msg)
    } finally {
      setCancelling(false)
    }
  }

  return (
    <main className="ticket-page">
      <header className="ticket-header">
        <button onClick={() => router.push('/bookings')} aria-label="Back to bookings">
          <ArrowLeft size={20} />
        </button>
        <div className="ticket-brand">
          <span className="page-brand">
            <span className="page-brand-mark">UT</span>
            <span className="page-brand-name">UDAY TRAVELS</span>
          </span>
        </div>
        <span className={`ticket-status-pill ${isCancelled ? 'danger' : ''}`}>
          {isCancelled ? 'CANCELLED' : 'E-TICKET'}
        </span>
      </header>

      <div className="ticket-shell">
        <section className={`confirmation ${isCancelled ? 'cancelled-hero' : ''}`}>
          <span>{isCancelled ? <XCircle size={23} /> : <Check size={23} />}</span>
          <div>
            <h1>{isCancelled ? 'Booking Cancelled' : 'Booking confirmed'}</h1>
            <p>
              {isCancelled
                ? 'This ticket has been cancelled.'
                : 'Your ticket is ready.'}
            </p>
          </div>
        </section>

        <section className="ticket-card" aria-labelledby="ticket-title">
          <div className="ticket-number">
            <div>
              <small>TICKET NO. (PNR)</small>
              <strong id="ticket-title">{ticket.ticketNo}</strong>
            </div>
            <button onClick={copyTicket} aria-live="polite">
              {copied ? <Check size={15} /> : <Copy size={15} />}{' '}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>

          <div className="ticket-block route-block">
            <div className="route-line">
              <h2>
                {ticket.route.from} to {ticket.route.to}
              </h2>
              <span>{ticket.seatLayout}</span>
            </div>
            <p>
              {date(ticket.travelDate)} · {ticket.busName}
            </p>
            <div className="bus-number">
              <BusFront size={16} />
              <span>
                <b>{ticket.busNumber}</b>
                <small>Bus number</small>
              </span>
            </div>
          </div>

          <div className="ticket-block boarding">
            <BoardingPoint
              label="PICKUP POINT"
              point={ticket.pickup.name}
              time={ticket.pickup.time}
              note="Be at the stop by 06:35"
            />
            <BoardingPoint
              label="DROP POINT"
              point={ticket.drop.name}
              time={ticket.drop.time}
            />
          </div>

          <div className="ticket-block">
            <h3>PASSENGER DETAILS ({ticket.passengers.length})</h3>
            {ticket.passengers.map((passenger: any) => (
              <div className="passenger-row-ticket" key={passenger.seat}>
                <b>{passenger.seat}</b>
                <span>
                  {passenger.title ? `${passenger.title} ` : ''}
                  {passenger.name} <em>({passenger.age} yrs)</em>
                </span>
                <span className={`gender-ticket ${passenger.gender}`}>
                  {passenger.gender === 'female' ? 'F Female' : 'M Male'}
                </span>
              </div>
            ))}
          </div>

          <div className="ticket-block fare-block">
            <div className="fare-main">
              <span>
                Fare ({ticket.passengers.length} seat × {money(perSeatRupees)})
                <b>
                  {money(totalRupees)}{' '}
                  <small>{isCancelled ? 'REFUND PROCESSED' : 'PAID'}</small>
                </b>
              </span>
            </div>
            <div className="fare-meta">
              <span>Contact: {ticket.contactMobile}</span>
              <span>Booked: {ticket.bookedAt?.slice(0, 10)}</span>
            </div>
            <button className="expand-row" onClick={() => setPayment(!payment)}>
              Payment details{' '}
              <ChevronDown size={16} className={payment ? 'rotated' : ''} />
            </button>
            {payment && (
              <p className="payment-detail">
                {ticket.payment.method} ·{' '}
                {ticket.payment.razorpayPaymentId || 'WALLET'} · paid{' '}
                {ticket.payment.paidAt?.slice(0, 10)}
              </p>
            )}
          </div>

          {!isCancelled && (
            <>
              <div className="perforation" />
              <div className="qr-block">
                <button
                  onClick={() => setQr(true)}
                  aria-label={`Boarding QR for ticket ${ticket.ticketNo}`}
                >
                  <QRCodeSVG value={ticket.qrToken} size={168} level="M" />
                  <strong>{ticket.ticketNo}</strong>
                  <span>Show this code to the conductor on boarding</span>
                </button>
              </div>
            </>
          )}

          <div className="ticket-block terms-block">
            <button className="expand-row" onClick={() => setTerms(!terms)}>
              Cancellation terms{' '}
              <ChevronDown size={16} className={terms ? 'rotated' : ''} />
            </button>
            {terms && (
              <div className="terms-copy">
                <ol>
                  <li>
                    Ahilyanagar to Pune bookings will not be cancelled after 08:00
                    PM for the next day&apos;s journey.
                  </li>
                  <li>
                    Pune to Ahilyanagar bookings cannot be cancelled on the same
                    day of booking and journey.
                  </li>
                  <li>A fee of ₹50 per seat applies to all cancellations.</li>
                </ol>
                <p className={canCancel(ticket) ? 'open-rule' : ''}>
                  {canCancel(ticket)
                    ? `Cancellation open until ${date(ticket.travelDate)} 08:00 PM`
                    : 'Cancellation closed for this booking'}
                </p>
              </div>
            )}
          </div>

          <div className="support-footer">
            <b>Need help with your ticket?</b>
            <a href="mailto:care@udaytravel.in">care@udaytravel.in</a>
            <a href="tel:+919890066580">+91 98900 66580</a>
          </div>
        </section>

        <div className="ticket-actions">
          <div>
            <button className="ticket-button orange" onClick={copyTicket}>
              <Copy size={16} /> Copy ticket
            </button>
            <button
              className="ticket-button"
              onClick={() => downloadCalendar(ticket)}
            >
              <CalendarPlus size={16} /> Add to calendar
            </button>
          </div>
          <a
            className="ticket-button"
            href={`/api/tickets/${ticket.ticketNo}/pdf`}
          >
            <Download size={16} /> Download PDF
          </a>
          <a className="ticket-button" href="/bookings">
            View booking
          </a>
          <button className="track-button" aria-disabled="true">
            <Navigation size={16} /> Track bus{' '}
            <small>Unlocks 60 minutes before departure.</small>
          </button>
          <div className="action-links">
            <button onClick={share}>
              <Share2 size={14} /> Share on WhatsApp
            </button>
            {!isCancelled && (
              <button
                className="cancel-link"
                onClick={() => setCancelModal(true)}
              >
                Cancel booking
              </button>
            )}
          </div>
        </div>
      </div>

      {/* QR Modal */}
      {qr && (
        <div className="qr-full" onClick={() => setQr(false)}>
          <QRCodeSVG value={ticket.qrToken} size={280} level="M" />
          <strong>{ticket.ticketNo}</strong>
          <span>Tap to close</span>
        </div>
      )}

      {/* Cancellation Modal with Full Ticket Details, Live Countdown & 25/75 Refund Breakdown */}
      {cancelModal && (
        <CancellationModal
          ticketNo={ticket.ticketNo}
          isOpen={cancelModal}
          onClose={() => setCancelModal(false)}
          onSuccess={(res) => {
            if (res.ticket) setTicket(res.ticket)
            setCancelModal(false)
          }}
        />
      )}
    </main>
  )
}

function BoardingPoint({
  label,
  point,
  time,
  note,
}: {
  label: string
  point: string
  time: string
  note?: string
}) {
  return (
    <div>
      <small>{label}</small>
      <h3>
        <MapPin size={14} /> {point}
      </h3>
      <strong>{time}</strong>
      {note && <p>{note}</p>}
      <a
        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(point)}`}
        target="_blank"
        rel="noreferrer"
      >
        Open in Maps <ExternalLink size={12} />
      </a>
    </div>
  )
}
