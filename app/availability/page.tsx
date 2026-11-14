'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeftRight,
  ArrowRight,
  BusFront,
  CalendarDays,
  ChevronDown,
  Clock3,
  MapPin,
  Menu,
  X,
  RefreshCw,
} from 'lucide-react'
import { RouteId, ROUTES } from '@/lib/config/routes'
import { todayIST, weekdayLabel } from '@/lib/time/ist'
import { TripAvailabilityItem, AvailabilityResponse } from '@/lib/schema/availability'
import { getApiAuthHeaders } from '@/lib/firebase/client'
import { useBookingStore } from '@/lib/booking-store'
import { subscribeToAuth, signOutUser } from '@/lib/auth/client-auth'
import { User } from 'firebase/auth'

type UserRoute = 'AHM_PUN' | 'PUN_AHM'

function getNextDate(dateStr: string, daysAhead = 1): string {
  const d = new Date(`${dateStr}T12:00:00+05:30`)
  d.setDate(d.getDate() + daysAhead)
  return d.toISOString().slice(0, 10)
}

const formatDate = (value: string) => {
  try {
    return new Date(`${value}T12:00:00+05:30`).toLocaleDateString('en-IN', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    })
  } catch {
    return value
  }
}

export default function AvailabilityPage() {
  const today = useMemo(() => todayIST(), [])
  const tomorrow = useMemo(() => getNextDate(today, 1), [today])
  const maxDate = useMemo(() => getNextDate(today, 30), [today])

  const [route, setRoute] = useState<UserRoute | null>('AHM_PUN')
  const [date, setDate] = useState<string | null>(today)
  const [buses, setBuses] = useState<TripAvailabilityItem[]>([])
  const [loading, setLoading] = useState(false)
  const [sheet, setSheet] = useState(false)
  const [error, setError] = useState(false)
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const resultsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const unsub = subscribeToAuth((user) => {
      if (user && !user.isAnonymous) {
        setCurrentUser(user)
      } else {
        setCurrentUser(null)
      }
    })
    return () => unsub()
  }, [])

  const ready = Boolean(route && date)

  // Fetch real buses directly from Firebase via /api/availability
  useEffect(() => {
    if (!ready || !route || !date) return
    let active = true
    setLoading(true)
    setError(false)

    async function loadBuses() {
      try {
        const headers = await getApiAuthHeaders()
        const res = await fetch(`/api/availability?route=${route}&date=${date}`, {
          headers,
        })
        if (!res.ok) {
          throw new Error(`Failed to load: ${res.status}`)
        }
        const data: AvailabilityResponse = await res.json()
        if (active) {
          setBuses(data.trips || [])
          setLoading(false)
          requestAnimationFrame(() => {
            resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
          })
        }
      } catch (err) {
        console.error('[Availability] Firebase load error:', err)
        if (active) {
          setError(true)
          setLoading(false)
        }
      }
    }

    loadBuses()

    // Realtime Server Stream listener: refreshes bus availability live when seats or schedules are updated
    let eventSource: EventSource | null = null
    try {
      eventSource = new EventSource(`/api/availability/stream?route=${route}&date=${date}`)
      eventSource.onmessage = () => {
        if (!active) return
        loadBuses()
      }
    } catch (err) {
      console.warn('[Availability Realtime] Notice:', err)
    }

    return () => {
      active = false
      if (eventSource) {
        eventSource.close()
      }
    }
  }, [route, date, ready])

  const selectRoute = (next: UserRoute) => {
    setRoute(next)
    setBuses([])
  }

  const selectDate = (next: string) => {
    if (route) setDate(next)
  }

  return (
    <main className="availability-page">
      <AppHeader onMenu={() => setSheet(true)} />
      <Hero collapsed={ready && !loading} />

      <section className={`availability-search ${ready ? 'has-results' : ''}`}>
        <SearchCard
          route={route}
          date={date}
          today={today}
          tomorrow={tomorrow}
          maxDate={maxDate}
          onRoute={selectRoute}
          onDate={selectDate}
        />
      </section>

      <section ref={resultsRef} className="availability-results">
        {!ready && <IdleState route={route} />}
        {ready && loading && <BusListSkeleton />}
        {ready && !loading && error && (
          <ErrorState
            onRetry={() => {
              if (date) setDate(date)
            }}
          />
        )}
        {ready && !loading && !error && (
          <>
            <ResultsSummary count={buses.length} route={route!} date={date!} />
            {buses.length ? (
              <div className="bus-list">
                {buses.map((bus) => (
                  <BusCard key={bus.tripId} bus={bus} route={route!} date={date!} />
                ))}
              </div>
            ) : (
              <EmptyState onTomorrow={() => setDate(tomorrow)} />
            )}
          </>
        )}
      </section>

      <footer className="availability-footer">
        Need help? Call <a href="tel:+919890066580">+91 98900 66580</a>
      </footer>

      {sheet && (
        <div className="sheet-overlay" onClick={() => setSheet(false)}>
          <aside className="availability-sheet" onClick={(event) => event.stopPropagation()}>
            <button className="sheet-close" onClick={() => setSheet(false)} aria-label="Close menu">
              <X size={20} />
            </button>
            <strong>UDAY TRAVELS</strong>
            <nav>
              <a href="/account">{currentUser ? 'My Account' : 'Create Account / Log In'}</a>
              <a href="/about">About Us</a>
              <a href="/policies">Policies</a>
              <a href="/contact">Contact Us</a>
              {currentUser && (
                <button
                  type="button"
                  onClick={async () => {
                    await signOutUser()
                    setCurrentUser(null)
                    setSheet(false)
                  }}
                  className="text-left text-red-500 hover:text-red-600 font-semibold mt-2"
                >
                  Logout
                </button>
              )}
            </nav>
          </aside>
        </div>
      )}
    </main>
  )
}

function AppHeader({ onMenu }: { onMenu: () => void }) {
  return (
    <header className="availability-header">
      <a className="availability-logo" href="/">
        <span className="page-brand">
          <span className="page-brand-mark">UT</span>
          <span className="page-brand-name">UDAY TRAVELS</span>
        </span>
      </a>
      <button onClick={onMenu} aria-label="Open menu">
        <Menu size={22} />
      </button>
    </header>
  )
}

function Hero({ collapsed }: { collapsed: boolean }) {
  return (
    <section className={`availability-hero ${collapsed ? 'collapsed' : ''}`}>
      <div className="availability-hero-overlay" />
      <div className="availability-hero-copy">
        <p>01 / AVAILABILITY</p>
        <h1>
          CHOOSE YOUR
          <br />
          <span>JOURNEY.</span>
        </h1>
      </div>
    </section>
  )
}

function SearchCard({
  route,
  date,
  today,
  tomorrow,
  maxDate,
  onRoute,
  onDate,
}: {
  route: UserRoute | null
  date: string | null
  today: string
  tomorrow: string
  maxDate: string
  onRoute: (route: UserRoute) => void
  onDate: (date: string) => void
}) {
  return (
    <div className="search-card">
      <div className="search-step">
        <small>STEP 1 · ROUTE</small>
        <div className="route-selector" role="radiogroup" aria-label="Choose route">
          <button
            className={route === 'AHM_PUN' ? 'route-choice active' : 'route-choice'}
            onClick={() => onRoute('AHM_PUN')}
            role="radio"
            aria-checked={route === 'AHM_PUN'}
          >
            <MapPin size={15} /> Ahilyanagar to Pune
          </button>
          <button
            className="swap-route"
            onClick={() => route && onRoute(route === 'AHM_PUN' ? 'PUN_AHM' : 'AHM_PUN')}
            disabled={!route}
            aria-label="Swap route"
          >
            <ArrowLeftRight size={15} />
          </button>
          <button
            className={route === 'PUN_AHM' ? 'route-choice active' : 'route-choice'}
            onClick={() => onRoute('PUN_AHM')}
            role="radio"
            aria-checked={route === 'PUN_AHM'}
          >
            <MapPin size={15} /> Pune to Ahilyanagar
          </button>
        </div>
      </div>
      <div className={`search-step date-step ${!route ? 'disabled' : ''}`}>
        <small>STEP 2 · DATE</small>
        <div className="date-options" role="group" aria-label="Choose date">
          <DateButton label="Today" value={today} date={date} onClick={() => onDate(today)} />
          <DateButton label="Tomorrow" value={tomorrow} date={date} onClick={() => onDate(tomorrow)} />
          <label
            className={
              date && date !== today && date !== tomorrow
                ? 'date-choice active custom-date'
                : 'date-choice custom-date'
            }
          >
            <CalendarDays size={15} />
            <span>
              {date && date !== today && date !== tomorrow ? formatDate(date) : 'Choose date'}
            </span>
            <ChevronDown size={14} />
            <input
              type="date"
              min={today}
              max={maxDate}
              value={date && date !== today && date !== tomorrow ? date : ''}
              onChange={(event) => onDate(event.target.value)}
            />
          </label>
        </div>
        {!route && <p className="date-helper">Pick a route first</p>}
      </div>
    </div>
  )
}

function DateButton({
  label,
  value,
  date,
  onClick,
}: {
  label: string
  value: string
  date: string | null
  onClick: () => void
}) {
  return (
    <button className={date === value ? 'date-choice active' : 'date-choice'} onClick={onClick}>
      <span>{label}</span>
      <small>{formatDate(value)}</small>
    </button>
  )
}

function ResultsSummary({ count, route, date }: { count: number; route: UserRoute; date: string }) {
  return (
    <div className="results-summary" aria-live="polite">
      <span>
        <b>{count} buses</b>, {route === 'AHM_PUN' ? 'Ahilyanagar to Pune' : 'Pune to Ahilyanagar'},{' '}
        {formatDate(date)}
      </span>
      <em>
        <i /> Live Firebase schedule
      </em>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const text =
    status === 'almost-full'
      ? 'ALMOST FULL'
      : status === 'sold-out'
        ? 'SOLD OUT'
        : status === 'closed'
          ? 'BOOKING CLOSED'
          : 'AVAILABLE'
  return <span className={`status-badge ${status}`}>{text}</span>
}

function BusCard({
  bus,
  route,
  date,
}: {
  bus: TripAvailabilityItem
  route: UserRoute
  date: string
}) {
  const router = useRouter()
  const [selecting, setSelecting] = useState(false)
  const disabled = bus.status === 'closed' || bus.status === 'sold-out' || bus.seatsLeft <= 0

  const select = () => {
    if (disabled) return
    setSelecting(true)
    useBookingStore.getState().setJourney({
      from: route === 'AHM_PUN' ? 'Ahilyanagar' : 'Pune',
      to: route === 'AHM_PUN' ? 'Pune' : 'Ahilyanagar',
      routeId: route,
      tripId: bus.tripId,
      busId: bus.tripId,
      busName: bus.busName,
      date,
      departure: bus.departureTime,
      arrival: bus.arrivalTime,
      fare: bus.fare,
    })
    router.push(
      `/passengers?busId=${bus.tripId}&tripId=${bus.tripId}&date=${date}&route=${route}&busName=${encodeURIComponent(
        bus.busName
      )}&departure=${encodeURIComponent(bus.departureTime)}&arrival=${encodeURIComponent(
        bus.arrivalTime
      )}&fare=${bus.fare}`
    )
  }

  return (
    <article
      className={`bus-card ${disabled ? 'closed' : ''}`}
      aria-label={`${bus.busName}, departs ${bus.departureTime}, arrives ${bus.arrivalTime}, ${bus.seatsLeft} seats left, ${bus.status}`}
    >
      <div className="bus-time">
        <strong>
          {bus.departureTime} <span>→</span> {bus.arrivalTime}
        </strong>
        <StatusBadge status={bus.status} />
      </div>
      <div className="bus-duration">
        <Clock3 size={14} /> {bus.duration}
      </div>
      <div className="bus-info">
        <div>
          <h2>{bus.busName}</h2>
          <p>
            {bus.busType || '3+2 Seater Coach'} · ₹{bus.fare} per seat ·{' '}
            <b>{disabled ? 'Seats not available' : `${bus.seatsLeft} seats left`}</b>
          </p>
        </div>
        <button
          className={bus.status === 'available' ? 'select-seats primary' : 'select-seats'}
          disabled={disabled || selecting}
          onClick={select}
        >
          {selecting ? <span className="mini-spinner" /> : 'Select seats'}
          <ArrowRight size={15} />
        </button>
      </div>
    </article>
  )
}

function IdleState({ route }: { route: UserRoute | null }) {
  return (
    <div className="availability-idle">
      <BusFront size={28} />
      <p>Select route and date to see available buses</p>
      {route && <small>1 of 2 selected</small>}
    </div>
  )
}

function EmptyState({ onTomorrow }: { onTomorrow: () => void }) {
  return (
    <div className="availability-idle">
      <BusFront size={28} />
      <p>No buses scheduled for this date</p>
      <button className="try-button" onClick={onTomorrow}>
        Try tomorrow
      </button>
    </div>
  )
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="availability-idle">
      <p>Could not load live bus schedule from Firebase</p>
      <button className="try-button" onClick={onRetry}>
        Retry
      </button>
    </div>
  )
}

function BusListSkeleton() {
  return (
    <div className="skeleton-list">
      {Array.from({ length: 4 }, (_, index) => (
        <div className="bus-skeleton" key={index} />
      ))}
    </div>
  )
}
