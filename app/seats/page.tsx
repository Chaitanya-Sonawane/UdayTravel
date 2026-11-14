'use client'

import { ArrowLeft, ArrowRight, Check, CircleGauge, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { defaultSeats, useBookingStore, type Seat, type SeatStatus } from '@/lib/booking-store'
import { getApiAuthHeaders } from '@/lib/firebase/client'
import { todayIST } from '@/lib/time/ist'

const statusLabels: Record<SeatStatus, string> = {
  available: 'Available',
  male: 'Booked',
  female: 'Female only',
  'for-male': 'Booked',
  'for-female': 'Female only',
  held: 'Booked',
  booked: 'Booked',
  blocked: 'Reserved',
}

const steps = ['Bus', 'Passengers', 'Seats', 'Review', 'Payment']

function BookingHeader() {
  return (
    <>
      <header className="account-header">
        <Link href="/passengers" className="account-back" aria-label="Back to passenger details">
          <ArrowLeft />
        </Link>
        <span className="page-brand">
          <span className="page-brand-mark">UT</span>
          <span className="page-brand-name">UDAY TRAVELS</span>
        </span>
        <span className="step-chip">3 / 5</span>
      </header>
      <nav className="booking-progress" aria-label="Booking progress">
        {steps.map((step, index) => (
          <span key={step} className={index <= 2 ? 'active' : ''}>
            <b>{index + 1}</b>
            {step}
          </span>
        ))}
      </nav>
    </>
  )
}

export default function SeatsPage() {
  const router = useRouter()
  const {
    passengers,
    passengerCount,
    assignSeat,
    clearSeat,
    startHold,
    setHold,
    journey,
    setJourney,
    loadedSeats,
    setLoadedSeats,
  } = useBookingStore()

  const [holding, setHolding] = useState(false)

  const [seatsList, setSeatsList] = useState<Seat[]>(
    loadedSeats && loadedSeats.length ? loadedSeats : defaultSeats
  )
  const [loadingSeats, setLoadingSeats] = useState(false)
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(true)
  const [error, setError] = useState('')
  const [activePassengerId, setActivePassengerId] = useState(passengers[0]?.id)

  const activePassenger =
    passengers.find((passenger) => passenger.id === activePassengerId) ??
    passengers.find((passenger) => !passenger.seatId) ??
    passengers[0]

  const selectedSeats = passengers.flatMap((passenger) => (passenger.seatId ? [passenger.seatId] : []))

  // Fetch initial seat chart AND connect to Realtime Live Server Stream
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search)
    const route = searchParams.get('route') || journey.routeId || 'AHM_PUN'
    const date = searchParams.get('date') || journey.date || todayIST()
    const tripId = searchParams.get('tripId') || journey.tripId || ''

    let active = true
    setLoadingSeats(true)

    // 1. Initial fast fetch via API
    async function loadInitialSeatChart() {
      try {
        const headers = await getApiAuthHeaders()
        const res = await fetch(`/api/seats?route=${route}&date=${date}&tripId=${tripId}`, {
          headers,
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()
        if (active && data.seats) {
          const list: Seat[] = Object.entries(data.seats).map(([id, status]) => ({
            id,
            status: status as SeatStatus,
          }))
          setSeatsList(list)
          setLoadedSeats(list)
          setJourney({
            routeId: route,
            date,
            tripId,
            busName: data.busName || journey.busName || 'Uday Express',
            departure: data.departureTime || journey.departure || '06:00',
            arrival: data.arrivalTime || journey.arrival || '08:45',
            fare: data.fare || journey.fare || 200,
          })
        }
      } catch (err) {
        console.warn('[Seats Page] Initial fetch notice:', err)
      } finally {
        if (active) setLoadingSeats(false)
      }
    }

    loadInitialSeatChart()

    // 2. Realtime SSE Stream: receives instant seat chart pushes from server with ZERO permission errors
    let eventSource: EventSource | null = null
    try {
      eventSource = new EventSource(`/api/seats/stream?route=${route}&date=${date}&tripId=${tripId}`)

      eventSource.onopen = () => {
        if (active) setIsRealtimeConnected(true)
      }

      eventSource.onmessage = (event) => {
        if (!active) return
        try {
          const data = JSON.parse(event.data)
          if (data.type === 'seat_update' && data.seats) {
            const liveSeats: Seat[] = Object.entries(data.seats).map(([id, status]) => ({
              id,
              status: status as SeatStatus,
            }))
            setSeatsList(liveSeats)
            setLoadedSeats(liveSeats)
            setIsRealtimeConnected(true)
          }
        } catch {
          // ignore keepalive comments
        }
      }

      eventSource.onerror = () => {
        if (active) setIsRealtimeConnected(false)
      }
    } catch (err) {
      console.warn('[Seats Realtime SSE] Stream notice:', err)
    }

    // 3. Fallback background poll every 4s to ensure continuous real-time sync
    const pollInterval = setInterval(() => {
      if (!active) return
      loadInitialSeatChart()
    }, 4000)

    return () => {
      active = false
      if (eventSource) {
        eventSource.close()
      }
      clearInterval(pollInterval)
    }
  }, [journey.routeId, journey.date, journey.tripId, setLoadedSeats])

  const chooseSeat = (id: string, status: SeatStatus) => {
    const assignedPassenger = passengers.find((passenger) => passenger.seatId === id)
    if (assignedPassenger) {
      clearSeat(assignedPassenger.id)
      setActivePassengerId(assignedPassenger.id)
      setError('')
      return
    }
    if (status !== 'available' || !activePassenger) return
    assignSeat(activePassenger.id, id)
    startHold()
    const nextPassenger = passengers.find(
      (passenger) => passenger.id !== activePassenger.id && !passenger.seatId
    )
    setActivePassengerId(nextPassenger?.id ?? activePassenger.id)
    setError('')
  }

  const continueToReview = async () => {
    if (selectedSeats.length !== passengerCount) {
      return setError(
        `Select ${passengerCount} seat${passengerCount === 1 ? '' : 's'} to continue.`
      )
    }

    try {
      setHolding(true)
      setError('')
      const headers = await getApiAuthHeaders()
      const res = await fetch('/api/seats/hold', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          routeId: journey.routeId || 'AHM_PUN',
          date: journey.date || todayIST(),
          tripId: journey.tripId,
          seatIds: selectedSeats,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error?.message || 'Failed to place seat hold')
      }

      setHold(data.grp, data.holdToken, data.holdExpiresAt)
      router.push('/review')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to hold seats'
      setError(msg)
    } finally {
      setHolding(false)
    }
  }

  const seatButton = (id: string) => {
    const seat = seatsList.find((item) => item.id === id) || { id, status: 'available' as SeatStatus }
    const selected = selectedSeats.includes(id)
    const isAvailable = seat.status === 'available'
    const statusClass =
      seat.status === 'female' || seat.status === 'for-female'
        ? 'female'
        : seat.status === 'male' || seat.status === 'for-male' || seat.status === 'booked' || seat.status === 'blocked'
          ? 'booked'
          : 'available'

    return (
      <button
        key={id}
        type="button"
        className={`flow-seat ${statusClass} ${selected ? 'is-selected' : ''}`}
        onClick={() => chooseSeat(id, seat.status)}
        disabled={!selected && !isAvailable}
        aria-label={`Seat ${id}, ${selected ? 'selected' : statusLabels[seat.status] || 'Available'}`}
        aria-pressed={selected}
      >
        <span aria-hidden="true">{selected ? <Check size={17} /> : null}</span>
      </button>
    )
  }

  return (
    <main className="account-page seats-flow">
      <BookingHeader />
      <section className="booking-shell">
        <div className="booking-intro">
          <p>SEAT SELECTION</p>
          <h1>Choose your seats</h1>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <small>
              {journey.busName} · {journey.from} → {journey.to}
            </small>
            <div className="flex items-center gap-1.5 text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 border border-emerald-500/30 rounded-sm">
              <span className={`w-2 h-2 rounded-full ${isRealtimeConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
              <span>Realtime Live Database Active</span>
            </div>
          </div>
        </div>

        <section className="profile-card flow-seat-card">
          <div className="flow-passengers">
            <div className="flow-passengers-title">
              <h2>Choose a passenger</h2>
              <span>
                {selectedSeats.length} of {passengerCount} seats selected
              </span>
            </div>
            <div className="flow-passenger-list">
              {passengers.map((passenger, index) => (
                <button
                  key={passenger.id}
                  type="button"
                  className={`flow-passenger-option ${activePassenger?.id === passenger.id ? 'active' : ''}`}
                  onClick={() => setActivePassengerId(passenger.id)}
                  aria-pressed={activePassenger?.id === passenger.id}
                >
                  <span>{passenger.name || `Passenger ${index + 1}`}</span>
                  <strong>{passenger.seatId ? `Seat ${passenger.seatId}` : 'Choose seat'}</strong>
                </button>
              ))}
            </div>
            <p className="flow-assignment-hint">
              {activePassenger
                ? `Select a seat for ${
                    activePassenger.name ||
                    `Passenger ${passengers.findIndex((passenger) => passenger.id === activePassenger.id) + 1}`
                  }.`
                : 'Select a passenger to assign a seat.'}
            </p>
          </div>

          <div className="flow-driver">
            <CircleGauge size={24} aria-hidden="true" />
            <span>Driver</span>
            {loadingSeats && (
              <span className="ml-auto flex items-center gap-1 text-xs text-[#FF9D00]">
                <Loader2 size={12} className="animate-spin" /> Syncing seats...
              </span>
            )}
          </div>

          <div className="flow-seat-map" role="group" aria-label="Choose bus seats">
            <div className="flow-seat-head">
              <span />
              {[1, 2].map((number) => (
                <b key={`left-${number}`}>{number}</b>
              ))}
              <span />
              {[3, 4, 5].map((number) => (
                <b key={`right-${number}`}>{number}</b>
              ))}
            </div>
            {'ABCDEFGHIJ'.split('').map((row) => (
              <div className="flow-seat-row" key={row}>
                <b className="flow-seat-label">{row}</b>
                {seatButton(`${row}1`)}
                {seatButton(`${row}2`)}
                <span className="flow-seat-aisle" aria-hidden="true" />
                {seatButton(`${row}3`)}
                {seatButton(`${row}4`)}
                {seatButton(`${row}5`)}
              </div>
            ))}
          </div>

          <div className="flow-seat-legend">
            <span>
              <i className="available" />
              Available
            </span>
            <span>
              <i className="selected" />
              Selected
            </span>
            <span>
              <i className="booked" />
              Booked
            </span>
            <span>
              <i className="female" />
              Women
            </span>
          </div>

          <div className="flow-seat-summary">
            <div>
              <span>Selected seats</span>
              <strong>{selectedSeats.join(', ') || 'None'}</strong>
            </div>
            <span>
              {selectedSeats.length} / {passengerCount} seats
            </span>
          </div>

          <button
            className="account-primary flow-seat-continue"
            onClick={continueToReview}
            disabled={selectedSeats.length !== passengerCount || holding}
          >
            {holding ? (
              <>
                <Loader2 size={17} className="animate-spin" /> Holding seats...
              </>
            ) : (
              <>
                Continue <ArrowRight size={17} />
              </>
            )}
          </button>
          {error && (
            <p className="inline-error" role="alert">
              {error}
            </p>
          )}
        </section>
      </section>
    </main>
  )
}
