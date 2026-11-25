'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  ArrowLeftRight,
  ArrowUpDown,
  ArrowRight,
  BusFront,
  CalendarDays,
  ChevronDown,
  Clock,
  Clock3,
  MapPin,
  Menu,
  X,
  RefreshCw,
  UserRound,
  Minus,
  Plus,
  Loader2,
} from 'lucide-react'
import { RouteId, ROUTES } from '@/lib/config/routes'
import { todayIST, weekdayLabel } from '@/lib/time/ist'
import { TripAvailabilityItem, AvailabilityResponse } from '@/lib/schema/availability'
import { getApiAuthHeaders } from '@/lib/firebase/client'
import { useBookingStore } from '@/lib/booking-store'
import { subscribeToAuth, signOutUser, fetchCurrentProfile } from '@/lib/auth/client-auth'
import { User } from 'firebase/auth'
import { ThemedErrorBanner } from '@/components/ui/ThemedErrorBanner'
import { ThemedDatePickerModal } from '@/components/ui/ThemedDatePickerModal'
import NavDrawer from '@/components/navigation/NavDrawer'

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

function AvailabilityContent() {
  const searchParams = useSearchParams()
  const today = useMemo(() => todayIST(), [])
  const tomorrow = useMemo(() => getNextDate(today, 1), [today])
  const maxDate = useMemo(() => getNextDate(today, 30), [today])

  const initialRoute = (searchParams.get('route') as UserRoute) || null
  const initialDate = searchParams.get('date') || null

  const [route, setRoute] = useState<UserRoute | null>(initialRoute)
  const [date, setDate] = useState<string | null>(initialDate)
  const [passengerCount, setPassengerCount] = useState<number>(1)
  const [buses, setBuses] = useState<TripAvailabilityItem[]>([])
  const [loading, setLoading] = useState(false)
  const [sheet, setSheet] = useState(false)
  const [error, setError] = useState(false)
  const [retryKey, setRetryKey] = useState(0)
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [userName, setUserName] = useState<string>('')

  useEffect(() => {
    const r = searchParams.get('route') as UserRoute | null
    const d = searchParams.get('date')
    if (r) setRoute(r)
    if (d) setDate(d)
  }, [searchParams])

  useEffect(() => {
    const unsub = subscribeToAuth(async (user) => {
      if (user && !user.isAnonymous) {
        setCurrentUser(user)
        try {
          const { profile } = await fetchCurrentProfile()
          if (profile?.name) setUserName(profile.name)
        } catch {}
      } else {
        setCurrentUser(null)
        setUserName('')
      }
    })
    return () => unsub()
  }, [])

  const handleLogout = async () => {
    await signOutUser()
    setCurrentUser(null)
    setUserName('')
    setSheet(false)
  }

  const ready = Boolean(route && date)

  // Fetch real buses directly from Firebase via /api/availability
  useEffect(() => {
    if (!ready || !route || !date) return
    let active = true
    setLoading(true)
    setError(false)

    async function loadBuses() {
      try {
        let res = await fetch(`/api/availability?route=${route}&date=${date}`)
        if (!res.ok && res.status === 401) {
          try {
            const headers = await getApiAuthHeaders()
            res = await fetch(`/api/availability?route=${route}&date=${date}`, { headers })
          } catch {}
        }

        if (!res.ok) {
          // Fallback to /api/trips
          try {
            const fallbackRes = await fetch(`/api/trips?date=${date}&routeId=${route}`)
            if (fallbackRes.ok) {
              const fallbackData = await fallbackRes.json()
              if (active && Array.isArray(fallbackData.trips) && fallbackData.trips.length > 0) {
                setBuses(
                  fallbackData.trips.map((t: any) => ({
                    tripId: t.tripId || t.id,
                    busName: t.busName || 'Uday Express 01',
                    busType: '3+2 Seater Coach',
                    departure: `${date}T${t.departureTime || '06:00'}:00+05:30`,
                    arrival: `${date}T${t.arrivalTime || '08:45'}:00+05:30`,
                    departureTime: t.departureTime || '06:00',
                    arrivalTime: t.arrivalTime || '08:45',
                    duration: '02h 45m',
                    seatsLeft: typeof t.availableSeats === 'number' ? t.availableSeats : 30,
                    totalCapacity: t.totalSeats || 50,
                    booked: (t.bookedSeats || []).length,
                    status: 'available',
                    fare: t.fare || 200,
                    seats: {},
                  }))
                )
                setLoading(false)
                return
              }
            }
          } catch {
            // Safe fallback catch
          }
          throw new Error(`Failed to load: ${res.status}`)
        }

        const data: AvailabilityResponse = await res.json()
        if (active) {
          setBuses(data.trips || [])
          setLoading(false)
        }
      } catch {
        // Safe catch for bus load
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
    } catch {
      // Safe catch for realtime stream
    }

    return () => {
      active = false
      if (eventSource) {
        eventSource.close()
      }
    }
  }, [route, date, ready, retryKey])

  const selectRoute = (next: UserRoute) => {
    setRoute(next)
    setBuses([])
  }

  const selectDate = (next: string) => {
    if (route) setDate(next)
  }

  const handlePassengerCountChange = (count: number) => {
    const safe = Math.max(1, Math.min(6, count))
    setPassengerCount(safe)
    useBookingStore.getState().setPassengerCount(safe)
  }

  const allClosed = buses.length > 0 && buses.every((b) => b.status === 'closed' || b.seatsLeft <= 0)

  return (
    <main className="availability-page font-jakarta">
      <AppHeader
        onMenu={() => setSheet((prev) => !prev)}
        currentUser={currentUser}
        userName={userName}
      />
      <Hero />

      <section className={`availability-search ${ready ? 'has-results' : ''}`}>
        <SearchCard
          route={route}
          date={date}
          today={today}
          tomorrow={tomorrow}
          maxDate={maxDate}
          onRoute={selectRoute}
          onDate={selectDate}
          passengerCount={passengerCount}
          onPassengerCount={handlePassengerCountChange}
        />
      </section>

      <section className="availability-results">
        {!ready && <IdleState route={route} />}
        {ready && loading && <BusListSkeleton />}
        {ready && !loading && error && (
          <ErrorState
            onRetry={() => setRetryKey((key) => key + 1)}
          />
        )}
        {ready && !loading && !error && (
          <>
            {buses.length ? (
              <div className="space-y-4">
                {allClosed && (
                  <div className="bg-amber-50 border border-amber-300/80 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-800 flex items-center justify-center shrink-0">
                        <Clock size={19} />
                      </div>
                      <div>
                        <h3 className="text-xs sm:text-sm font-bold text-amber-950">
                          Departures for this date are closed
                        </h3>
                        <p className="text-[11px] sm:text-xs text-amber-800/85 mt-0.5">
                          Buses for {formatDate(date!)} have departed or passed booking cut-off. Check tomorrow&apos;s upcoming buses!
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setDate(tomorrow)}
                      className="px-4 py-2 bg-[#F8B018] hover:bg-[#E5A010] text-[#0B0F19] text-xs font-black rounded-none transition-all cursor-pointer whitespace-nowrap shadow-xs"
                    >
                      View Tomorrow&apos;s Active Buses →
                    </button>
                  </div>
                )}
                <div className="flex items-center justify-between px-1 pt-1 pb-1">
                  <span className="text-xs font-black tracking-wider text-slate-800 uppercase">
                    SCHEDULED DEPARTURES ({buses.length})
                  </span>
                  {loading ? (
                    <span className="text-xs font-bold tracking-wider text-[#B45309] uppercase flex items-center gap-1.5">
                      <Loader2 size={12} className="animate-spin text-[#F8B018]" />
                      Updating schedules...
                    </span>
                  ) : (
                    <span className="text-xs font-bold tracking-wider text-emerald-600 uppercase flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse inline-block" />
                      Live Schedules
                    </span>
                  )}
                </div>
                <div className="bus-list space-y-4">
                  {buses.map((bus, idx) => (
                    <BusCard
                      key={bus.tripId}
                      bus={bus}
                      route={route!}
                      date={date!}
                      index={idx}
                      passengerCount={passengerCount}
                    />
                  ))}
                </div>
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

      {/* Navigation Drawer matching User's Mockup in Light Theme */}
      <NavDrawer
        open={sheet}
        onClose={() => setSheet(false)}
        currentUser={currentUser}
        userName={userName}
        onLogout={handleLogout}
        theme="light"
      />
    </main>
  )
}

function AppHeader({
  onMenu,
  currentUser,
  userName,
}: {
  onMenu: () => void
  currentUser: User | null
  userName: string
}) {
  return (
    <header className="availability-header flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Link href="/" className="flex items-center gap-2.5 text-gray-900 no-underline group" aria-label="Uday Travels Home">
          <span
            className="brand-logo-mark w-8 h-8 rounded-lg bg-[#F8B018] text-[#0B0F19] font-black flex items-center justify-center font-sans tracking-tight text-xs shadow-xs shrink-0 group-hover:scale-105 transition-transform"
            style={{ backgroundColor: '#F8B018', color: '#0B0F19', fontWeight: 900 }}
          >
            UT
          </span>
          <span className="font-chakra text-lg font-black uppercase tracking-tight text-gray-950 leading-none">
            UDAY <span className="text-[#F8B018]">TRAVELS</span>
          </span>
        </Link>
      </div>
      <div className="flex items-center gap-4 ml-auto">
        <nav className="hidden items-center gap-6 text-xs uppercase tracking-[0.14em] text-gray-700 md:flex">
          <a href="/availability" className="font-bold text-[#D97706] hover:text-[#B45309]">Book a seat</a>
          <a href="/about" className="hover:text-[#D97706] transition-colors">About Us</a>
          <a href="/policies" className="hover:text-[#D97706] transition-colors">Policies</a>
          <a href="/contact" className="hover:text-[#D97706] transition-colors">Contact Us</a>
          <button
            type="button"
            onClick={onMenu}
            className="!flex items-center gap-2 px-3.5 py-1.5 rounded-none bg-amber-50 border border-[#F8B018]/50 text-[#B45309] hover:bg-[#F8B018] hover:text-black font-semibold text-xs tracking-wider transition-all duration-200 shadow-sm cursor-pointer !w-auto !h-9"
          >
            <UserRound size={14} className="stroke-[2.2]" />
            <span>{currentUser ? (userName || 'My Account') : 'Account'}</span>
            <ChevronDown size={13} className="opacity-75" />
          </button>
        </nav>
        <button
          onClick={onMenu}
          aria-label="Open menu"
          className="p-2 text-gray-700 hover:text-[#D97706] hover:bg-amber-50 rounded-xl cursor-pointer bg-transparent border-0 transition-colors"
        >
          <Menu size={24} />
        </button>
      </div>
    </header>
  )
}

function Hero() {
  return (
    <section className="availability-hero">
      <div className="availability-hero-overlay" />
      <div className="availability-hero-copy">
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
  passengerCount,
  onPassengerCount,
}: {
  route: UserRoute | null
  date: string | null
  today: string
  tomorrow: string
  maxDate: string
  onRoute: (route: UserRoute) => void
  onDate: (date: string) => void
  passengerCount: number
  onPassengerCount: (count: number) => void
}) {
  const isCustomDate = Boolean(date && date !== today && date !== tomorrow)
  const [calendarOpen, setCalendarOpen] = useState(false)

  return (
    <div className="search-card">
      <div className="search-step">
        <div className="search-step-label">
          <span className="step-tag">STEP 1</span>
          <span className="step-dot">·</span>
          <span className="step-name">ROUTE</span>
        </div>
        <div className="route-selector" role="radiogroup" aria-label="Choose route">
          <button
            type="button"
            className={route === 'AHM_PUN' ? 'route-choice active' : 'route-choice'}
            onClick={() => onRoute('AHM_PUN')}
            role="radio"
            aria-checked={route === 'AHM_PUN'}
          >
            <div className="route-choice-main">
              <MapPin size={16} className="route-pin" />
              <span className="route-text">Ahilyanagar to Pune</span>
            </div>
            <div className="route-radio-indicator">
              <span className={`route-radio-dot ${route === 'AHM_PUN' ? 'selected' : ''}`} />
            </div>
          </button>

          <div className="swap-route-divider">
            <span className="swap-route-line" />
            <button
              type="button"
              className="swap-route"
              onClick={() => route && onRoute(route === 'AHM_PUN' ? 'PUN_AHM' : 'AHM_PUN')}
              disabled={!route}
              aria-label="Swap route"
            >
              <ArrowUpDown size={14} />
            </button>
            <span className="swap-route-line" />
          </div>

          <button
            type="button"
            className={route === 'PUN_AHM' ? 'route-choice active' : 'route-choice'}
            onClick={() => onRoute('PUN_AHM')}
            role="radio"
            aria-checked={route === 'PUN_AHM'}
          >
            <div className="route-choice-main">
              <MapPin size={16} className="route-pin" />
              <span className="route-text">Pune to Ahilyanagar</span>
            </div>
            <div className="route-radio-indicator">
              <span className={`route-radio-dot ${route === 'PUN_AHM' ? 'selected' : ''}`} />
            </div>
          </button>
        </div>
      </div>
      <div className={`search-step date-step ${!route ? 'disabled' : ''}`}>
        <div className="search-step-label">
          <span className="step-tag">STEP 2</span>
          <span className="step-dot">·</span>
          <span className="step-name">DATE</span>
        </div>
        <div className="date-options" role="group" aria-label="Choose date">
          <DateButton label="Today" value={today} date={date} onClick={() => onDate(today)} />
          <DateButton label="Tomorrow" value={tomorrow} date={date} onClick={() => onDate(tomorrow)} />
          <button
            type="button"
            onClick={() => setCalendarOpen(true)}
            className={`date-choice custom-date ${isCustomDate ? 'active' : ''}`}
            aria-label="Choose date"
            title="Choose date from calendar"
          >
            <CalendarDays size={15} />
            <div className="custom-date-stack">
              <strong>{isCustomDate ? 'Custom' : 'Choose date'}</strong>
              <small>{isCustomDate ? formatDate(date!) : 'Calendar'}</small>
            </div>
            <ChevronDown size={13} className="custom-date-arrow" />
          </button>
          <input
            type="date"
            min={today}
            max={maxDate}
            value={isCustomDate ? date! : ''}
            onChange={(event) => {
              if (event.target.value) onDate(event.target.value)
            }}
            aria-label="Choose travel date"
            className="sr-only"
            tabIndex={-1}
          />
        </div>
        {!route && <p className="date-helper">Pick a route first</p>}

        {/* Themed Uday Travels Calendar Modal */}
        <ThemedDatePickerModal
          isOpen={calendarOpen}
          onClose={() => setCalendarOpen(false)}
          selectedDate={date}
          onSelectDate={(newDate) => {
            onDate(newDate)
            setCalendarOpen(false)
          }}
          minDate={today}
          maxDate={maxDate}
          title="Choose Travel Date"
          routeContext={
            route === 'AHM_PUN'
              ? 'Ahilyanagar to Pune · Daily Express'
              : route === 'PUN_AHM'
              ? 'Pune to Ahilyanagar · Daily Express'
              : 'Uday Travels · Daily Service'
          }
        />
      </div>

      {/* STEP 3 · PASSENGERS (Compact, Uncrowded, Easy to Use) */}
      <div className="search-step passenger-step">
        <div className="search-step-label mb-2">
          <span className="step-tag">STEP 3</span>
          <span className="step-dot">·</span>
          <span className="step-name">PASSENGERS</span>
        </div>

        <div className="flex items-center justify-between gap-2.5 sm:gap-3 bg-slate-50/90 hover:bg-white border border-slate-200/90 hover:border-amber-400/80 rounded-2xl p-2.5 sm:p-3 transition-all shadow-xs">
          {/* Passenger Count Badge & Headline */}
          <div className="flex items-center gap-2.5 pl-1 sm:pl-2 shrink-0">
            <UserRound size={19} className="text-[#F8B018] stroke-[2.3] shrink-0" />
            <div>
              <div className="font-extrabold text-xs sm:text-sm text-slate-900 leading-tight">
                {passengerCount} {passengerCount === 1 ? 'Passenger' : 'Passengers'}
              </div>
              <div className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5 font-medium">
                Flat ₹200/seat · ₹{passengerCount * 200} total
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Quick 1-6 Pills on Desktop & Tablet */}
            <div className="hidden sm:flex items-center gap-0.5 bg-white p-0.5 sm:p-1 rounded-xl border border-slate-200/80 shadow-2xs">
              {[1, 2, 3, 4, 5, 6].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => onPassengerCount(num)}
                  className={`w-6.5 h-6.5 md:w-7 md:h-7 rounded-lg text-xs font-black transition-all cursor-pointer ${
                    passengerCount === num
                      ? 'bg-[#F8B018] text-[#0B0F19] shadow-xs scale-105'
                      : 'text-slate-600 hover:text-black hover:bg-slate-100'
                  }`}
                  aria-label={`${num} passenger${num > 1 ? 's' : ''}`}
                >
                  {num}
                </button>
              ))}
            </div>

            {/* Stepper with - and + */}
            <div className="flex items-center bg-white border border-slate-200 rounded-xl shadow-2xs p-0.5">
              <button
                type="button"
                onClick={() => onPassengerCount(Math.max(1, passengerCount - 1))}
                disabled={passengerCount <= 1}
                className="w-7.5 h-7.5 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center text-slate-700 hover:text-black hover:bg-amber-50 disabled:opacity-30 disabled:hover:bg-transparent transition-colors cursor-pointer"
                aria-label="Decrease passenger count"
              >
                <Minus size={13} strokeWidth={2.5} />
              </button>
              <span className="w-6 sm:w-7 text-center font-black text-xs sm:text-sm text-slate-900 tabular-nums">
                {passengerCount}
              </span>
              <button
                type="button"
                onClick={() => onPassengerCount(Math.min(6, passengerCount + 1))}
                disabled={passengerCount >= 6}
                className="w-7.5 h-7.5 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center text-slate-700 hover:text-black hover:bg-amber-50 disabled:opacity-30 disabled:hover:bg-transparent transition-colors cursor-pointer"
                aria-label="Increase passenger count"
              >
                <Plus size={13} strokeWidth={2.5} />
              </button>
            </div>
          </div>
        </div>
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
      <strong>{label}</strong>
      <small>{formatDate(value)}</small>
    </button>
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
  index = 0,
  passengerCount = 1,
}: {
  bus: TripAvailabilityItem
  route: UserRoute
  date: string
  index?: number
  passengerCount?: number
}) {
  const router = useRouter()
  const [selecting, setSelecting] = useState(false)
  const disabled = bus.status === 'closed' || bus.status === 'sold-out' || bus.seatsLeft <= 0

  const busIndexFormatted = String(index + 1).padStart(2, '0')
  const formattedTitle = bus.busName?.startsWith('Uday Express')
    ? bus.busName
    : `Uday Express ${busIndexFormatted}`

  const fromCity = route === 'AHM_PUN' ? 'Nagar' : 'Pune'
  const toCity = route === 'AHM_PUN' ? 'Pune' : 'Nagar'

  const durationStr = bus.duration || '02h 45m'
  const coachType = bus.coachLabel?.includes('2+2') ? '2+2 seater' : '3+2 seater'
  const isAvailable = !disabled && bus.seatsLeft > 0

  const select = () => {
    if (disabled) return
    setSelecting(true)
    useBookingStore.getState().setJourney({
      from: route === 'AHM_PUN' ? 'Ahilyanagar' : 'Pune',
      to: route === 'AHM_PUN' ? 'Pune' : 'Ahilyanagar',
      routeId: route,
      tripId: bus.tripId,
      busId: bus.tripId,
      busName: formattedTitle,
      date,
      departure: bus.departureTime,
      arrival: bus.arrivalTime,
      fare: bus.fare,
    })
    useBookingStore.getState().setPassengerCount(passengerCount)
    router.push(
      `/passengers?busId=${bus.tripId}&tripId=${bus.tripId}&date=${date}&route=${route}&busName=${encodeURIComponent(
        formattedTitle
      )}&departure=${encodeURIComponent(bus.departureTime)}&arrival=${encodeURIComponent(
        bus.arrivalTime
      )}&fare=${bus.fare}&count=${passengerCount}&step=details`
    )
  }

  return (
    <article
      className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 shadow-xs hover:shadow-md transition-all duration-200 font-jakarta"
      aria-label={`${formattedTitle}, departs ${bus.departureTime}, arrives ${bus.arrivalTime}, ${bus.seatsLeft} seats remaining, ${isAvailable ? 'available' : 'sold out'}`}
    >
      {/* Top Row: Title + AVAILABLE Pill on Left, Price + 'per seat' on Right */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5 flex-wrap">
          <h2 className="font-extrabold text-base sm:text-lg text-slate-900 tracking-tight">
            {formattedTitle}
          </h2>
          {isAvailable ? (
            <span className="px-2.5 py-0.5 rounded-full bg-[#F8B018] text-[#0B0F19] text-[10px] sm:text-[11px] font-black tracking-wider uppercase inline-flex items-center shadow-xs">
              AVAILABLE
            </span>
          ) : (
            <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[10px] sm:text-[11px] font-extrabold tracking-wider uppercase inline-flex items-center">
              {bus.status === 'closed' ? 'CLOSED' : 'SOLD OUT'}
            </span>
          )}
        </div>

        <div className="text-right shrink-0">
          <div className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-none">
            ₹{bus.fare || 200}
          </div>
          <span className="text-[11px] sm:text-xs text-slate-400 font-medium mt-1 block">
            per seat
          </span>
        </div>
      </div>

      {/* Middle Row: Departure, Dashed Line with Transit Pill, Arrival */}
      <div className="flex items-center justify-between my-4 sm:my-5">
        {/* Departure */}
        <div className="min-w-[65px] sm:min-w-[75px]">
          <div className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-none">
            {bus.departureTime}
          </div>
          <div className="text-xs sm:text-sm text-slate-400 font-medium mt-1.5">
            {fromCity}
          </div>
        </div>

        {/* Dashed Timeline with Transit Pill */}
        <div className="flex-1 flex items-center justify-center relative mx-3 sm:mx-6">
          <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 border-t border-dashed border-slate-300" />
          <div className="relative z-10 px-3 py-1 rounded-full bg-slate-50/95 border border-slate-200 text-slate-700 text-[11px] sm:text-xs font-semibold flex items-center gap-1.5 shadow-2xs">
            <BusFront size={13} className="text-[#F8B018] stroke-[2.2] shrink-0" />
            <span>{durationStr}</span>
          </div>
        </div>

        {/* Arrival */}
        <div className="min-w-[65px] sm:min-w-[75px] text-right">
          <div className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-none">
            {bus.arrivalTime}
          </div>
          <div className="text-xs sm:text-sm text-slate-400 font-medium mt-1.5">
            {toCity}
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-slate-100 my-4" />

      {/* Bottom Row: Seat Count vs Person Counter & 'Select seats →' Button */}
      <div className="flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap pt-1">
        <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-600 font-medium">
          <svg
            className="w-4 h-4 text-slate-400 shrink-0"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M19 9V6a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v3" />
            <path d="M3 11v5a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2Z" />
            <path d="M5 18v2" />
            <path d="M19 18v2" />
          </svg>
          <span>{coachType}</span>
          <span className="text-slate-300 text-xs leading-none">•</span>
          <span className="font-bold text-slate-900">
            {bus.seatsLeft <= 0 ? 'Sold out' : `${bus.seatsLeft} seats left`}
          </span>
        </div>

        <div className="flex items-center gap-2.5 ml-auto">
          <button
            type="button"
            onClick={select}
            disabled={disabled || selecting || bus.seatsLeft < passengerCount}
            className="bg-[#F8B018] hover:bg-[#E5A010] text-[#0B0F19] font-black text-xs sm:text-sm px-5 sm:px-6 py-2.5 rounded-none shadow-xs hover:shadow active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {selecting ? (
              <span>Selecting...</span>
            ) : disabled ? (
              <span>{bus.status === 'closed' ? 'Booking Closed' : 'Sold Out'}</span>
            ) : bus.seatsLeft < passengerCount ? (
              <span>Only {bus.seatsLeft} seat{bus.seatsLeft === 1 ? '' : 's'} left</span>
            ) : (
              <>
                <span>Select {passengerCount > 1 ? `${passengerCount} seats` : 'seats'}</span>
                <span className="text-sm font-semibold">→</span>
              </>
            )}
          </button>
        </div>
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
    <div className="max-w-md mx-auto my-8 px-4">
      <ThemedErrorBanner
        title="Unable to Load Live Bus Schedules"
        message="Could not retrieve available buses for this route and date from the live service."
        suggestion="Please check your internet connection or tap retry below."
        actionLabel="Retry Live Schedule"
        onAction={onRetry}
        variant="warning"
      />
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

export default function AvailabilityPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#F8F9FA] flex items-center justify-center font-jakarta animate-in fade-in duration-300">
          <div className="text-center">
            <div className="relative w-14 h-14 flex items-center justify-center mx-auto mb-3">
              <div className="absolute inset-0 rounded-2xl bg-[#F8B018]/15 animate-ping" />
              <div className="w-12 h-12 rounded-2xl bg-white border border-amber-200 shadow-sm flex items-center justify-center relative z-10">
                <div className="w-6 h-6 rounded-full border-2 border-amber-100 border-t-[#F8B018] animate-spin" />
              </div>
            </div>
            <p className="text-xs font-bold uppercase tracking-widest text-slate-700 font-mono">
              Loading...
            </p>
          </div>
        </main>
      }
    >
      <AvailabilityContent />
    </Suspense>
  )
}
