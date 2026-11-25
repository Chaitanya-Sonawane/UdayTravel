'use client'

import {
  ArrowLeft,
  ArrowRight,
  Check,
  CircleGauge,
  Clock,
  Info,
  Lock,
  Sparkles,
  Loader2,
  X,
  AlertTriangle,
  Menu,
  UserRound,
  ChevronDown,
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useMemo, useRef } from 'react'
import { doc, onSnapshot } from 'firebase/firestore'
import { useBookingStore, type Passenger } from '@/lib/booking-store'
import { getClientDb, getApiAuthHeaders, isClientOfflineMode } from '@/lib/firebase/client'
import { subscribeToTripSeats } from '@/lib/firebase/rtdb-client'
import { todayIST } from '@/lib/time/ist'
import { subscribeToAuth, signOutUser, fetchCurrentProfile } from '@/lib/auth/client-auth'
import NavDrawer from '@/components/navigation/NavDrawer'
import {
  ALL_SEAT_ROWS,
  ALL_SEAT_COLS,
  Gender,
  zoneOf,
  zoneGender,
  neighbours,
  isThreeSeatSide,
  threeSeatBenchOf,
  getActiveSeatGender,
  levelFor,
  lowestAvailableLevel,
  suggestSeats,
  Suggestion,
  SeatState,
  normalizeSeats,
} from '@/lib/domain/seats/rules'
import { ThemedErrorBanner } from '@/components/ui/ThemedErrorBanner'
import { SeatPublicDoc } from '@/lib/data/seats.repo'
import { HOLD_TTL_MS } from '@/lib/config/seat-rules'
import { BUS_TEMPLATES, BusTemplateId, getTemplateForBus } from '@/lib/domain/seats/bus-templates'

const steps = ['Bus', 'Passengers', 'Seats', 'Review', 'Payment']

function BookingHeader({ onMenu }: { onMenu?: () => void }) {
  return (
    <>
      <header className="availability-header account-header sticky top-0 z-50 bg-white border-b border-gray-200 shadow-xs flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/passengers" className="account-back" aria-label="Back to passenger details">
            <ArrowLeft size={18} />
          </Link>
        </div>

        <div className="flex items-center gap-4">
          <nav className="hidden items-center gap-6 text-xs uppercase tracking-[0.14em] text-gray-700 md:flex">
            <Link href="/availability" className="font-bold text-[#D97706] hover:text-[#B45309]">Book a seat</Link>
            <Link href="/about" className="hover:text-[#D97706] transition-colors">About Us</Link>
            <Link href="/policies" className="hover:text-[#D97706] transition-colors">Policies</Link>
            <Link href="/contact" className="hover:text-[#D97706] transition-colors">Contact Us</Link>
            <Link
              href="/account"
              className="!flex items-center gap-2 px-3.5 py-1.5 rounded-none bg-amber-50 border border-[#F8B018]/50 text-[#B45309] hover:bg-[#F8B018] hover:text-black font-semibold text-xs tracking-wider transition-all duration-200 shadow-sm cursor-pointer"
            >
              <UserRound size={14} className="stroke-[2.2]" />
              <span>Account</span>
            </Link>
          </nav>
          {onMenu && (
            <button
              type="button"
              onClick={onMenu}
              aria-label="Open menu"
              className="p-2 text-gray-700 hover:text-[#D97706] hover:bg-amber-50 rounded-xl cursor-pointer bg-transparent border-0 transition-colors"
            >
              <Menu size={24} />
            </button>
          )}
        </div>
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

function formatHumanSeatDate(dateStr: string) {
  if (!dateStr) return ''
  try {
    const parts = dateStr.split('-').map(Number)
    if (parts.length === 3 && parts[0] && parts[1] && parts[2]) {
      const dt = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]))
      return dt.toLocaleDateString('en-IN', {
        timeZone: 'Asia/Kolkata',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    }
  } catch {}
  return dateStr
}

function BusSeatGraphic({
  isSelected,
  isOccupied,
  bookedGender,
  isLadiesOnly,
  isGenderBlocked,
}: {
  isSelected?: boolean
  isOccupied?: boolean
  bookedGender?: 'F' | 'M' | null
  isLadiesOnly?: boolean
  isGenderBlocked?: boolean
}) {
  // 1. User selected seat: Golden Yellow (#F8B018)
  if (isSelected) {
    return (
      <svg width="34" height="40" viewBox="0 0 36 42" fill="none" className="transition-transform duration-150">
        <path
          d="M7 4C7 2.89543 7.89543 2 9 2H27C28.1046 2 29 2.89543 29 4V38C29 39.1046 28.1046 40 27 40H9C7.89543 40 7 39.1046 7 38V4Z"
          fill="#F8B018"
          stroke="#0B0F19"
          strokeWidth="1.8"
        />
        <line x1="7" y1="31" x2="29" y2="31" stroke="#B45309" strokeWidth="1.8" />
        <rect x="2" y="14" width="6" height="24" rx="2" fill="#F8B018" stroke="#0B0F19" strokeWidth="1.8" />
        <rect x="28" y="14" width="6" height="24" rx="2" fill="#F8B018" stroke="#0B0F19" strokeWidth="1.8" />
      </svg>
    )
  }

  // 2. Ladies Reserved or Booked by Female: White backrest with vibrant Pink Armrests & Front Band
  if ((isLadiesOnly && !isOccupied) || (isOccupied && bookedGender === 'F')) {
    const isBooked = isOccupied && bookedGender === 'F'
    return (
      <svg width="34" height="40" viewBox="0 0 36 42" fill="none">
        <path
          d="M7 4C7 2.89543 7.89543 2 9 2H27C28.1046 2 29 2.89543 29 4V31H7V4Z"
          fill={isBooked ? '#FCE7F3' : '#FFFFFF'}
          stroke="#5A6474"
          strokeWidth="1.6"
        />
        <rect x="7" y="31" width="22" height="9" fill="#E879F9" stroke="#A855F7" strokeWidth="1.6" />
        <rect x="2" y="14" width="6" height="26" rx="2" fill="#E879F9" stroke="#A855F7" strokeWidth="1.6" />
        <rect x="28" y="14" width="6" height="26" rx="2" fill="#E879F9" stroke="#A855F7" strokeWidth="1.6" />
      </svg>
    )
  }

  // 3. Booked Seat: Muted Grey fill
  if (isOccupied) {
    return (
      <svg width="34" height="40" viewBox="0 0 36 42" fill="none">
        <path
          d="M7 4C7 2.89543 7.89543 2 9 2H27C28.1046 2 29 2.89543 29 4V38C29 39.1046 28.1046 40 27 40H9C7.89543 40 7 39.1046 7 38V4Z"
          fill="#D8DAE0"
          stroke="#5A6474"
          strokeWidth="1.6"
        />
        <line x1="7" y1="31" x2="29" y2="31" stroke="#5A6474" strokeWidth="1.6" />
        <rect x="2" y="14" width="6" height="24" rx="2" fill="#D8DAE0" stroke="#5A6474" strokeWidth="1.6" />
        <rect x="28" y="14" width="6" height="24" rx="2" fill="#D8DAE0" stroke="#5A6474" strokeWidth="1.6" />
      </svg>
    )
  }

  // 4. Opposite Gender Blocked
  if (isGenderBlocked) {
    return (
      <svg width="34" height="40" viewBox="0 0 36 42" fill="none" className="opacity-40">
        <path
          d="M7 4C7 2.89543 7.89543 2 9 2H27C28.1046 2 29 2.89543 29 4V38C29 39.1046 28.1046 40 27 40H9C7.89543 40 7 39.1046 7 38V4Z"
          fill="#F1F5F9"
          stroke="#94A3B8"
          strokeWidth="1.6"
        />
        <line x1="7" y1="31" x2="29" y2="31" stroke="#94A3B8" strokeWidth="1.6" />
        <rect x="2" y="14" width="6" height="24" rx="2" fill="#F1F5F9" stroke="#94A3B8" strokeWidth="1.6" />
        <rect x="28" y="14" width="6" height="24" rx="2" fill="#F1F5F9" stroke="#94A3B8" strokeWidth="1.6" />
      </svg>
    )
  }

  // 5. Available Seat: Clean White
  return (
    <svg width="34" height="40" viewBox="0 0 36 42" fill="none" className="hover:scale-105 transition-transform duration-100">
      <path
        d="M7 4C7 2.89543 7.89543 2 9 2H27C28.1046 2 29 2.89543 29 4V38C29 39.1046 28.1046 40 27 40H9C7.89543 40 7 39.1046 7 38V4Z"
        fill="#FFFFFF"
        stroke="#5A6474"
        strokeWidth="1.6"
      />
      <line x1="7" y1="31" x2="29" y2="31" stroke="#5A6474" strokeWidth="1.6" />
      <rect x="2" y="14" width="6" height="24" rx="2" fill="#FFFFFF" stroke="#5A6474" strokeWidth="1.6" />
      <rect x="28" y="14" width="6" height="24" rx="2" fill="#FFFFFF" stroke="#5A6474" strokeWidth="1.6" />
    </svg>
  )
}

export default function SeatsPage() {
  const router = useRouter()
  const rawStore = useBookingStore()
  const {
    toggleFamily,
    acceptAdjacent,
    setAcceptAdjacent,
    assignSeat,
    clearSeat,
    startHold,
    setHold,
    setJourney,
  } = rawStore

  const [mounted, setMounted] = useState(false)
  const [hydratedPax, setHydratedPax] = useState<Passenger[]>(rawStore.passengers)
  const [hydratedCount, setHydratedCount] = useState<number>(rawStore.passengerCount)
  const [hydratedFamily, setHydratedFamily] = useState<boolean>(rawStore.family)
  const [hydratedJourney, setHydratedJourney] = useState(rawStore.journey)
  const [hydratedExpiresAt, setHydratedExpiresAt] = useState(rawStore.holdExpiresAt)

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.body.setAttribute('data-effect-ran', 'true')
    }
    setMounted(true)
    const current = useBookingStore.getState()
    setHydratedPax(current.passengers)
    setHydratedCount(current.passengerCount)
    setHydratedFamily(current.family)
    setHydratedJourney(current.journey)
    setHydratedExpiresAt(current.holdExpiresAt)

    const unsub = useBookingStore.subscribe((state) => {
      setHydratedPax(state.passengers)
      setHydratedCount(state.passengerCount)
      setHydratedFamily(state.family)
      setHydratedJourney(state.journey)
      setHydratedExpiresAt(state.holdExpiresAt)
    })
    return unsub
  }, [])

  const passengers = mounted ? hydratedPax : rawStore.passengers
  const passengerCount = mounted ? hydratedCount : rawStore.passengerCount
  const family = mounted ? hydratedFamily : rawStore.family
  const journey = mounted ? hydratedJourney : rawStore.journey
  const storeHoldExpiresAt = mounted ? hydratedExpiresAt : rawStore.holdExpiresAt

  const [localFamily, setLocalFamily] = useState(family)
  useEffect(() => {
    setLocalFamily(family)
  }, [family])

  const effectiveFamily = family || localFamily

  const [holding, setHolding] = useState(false)
  const [loadingPublicMap, setLoadingPublicMap] = useState(true)
  const [error, setError] = useState('')
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [activePassengerId, setActivePassengerId] = useState<string>(passengers[0]?.id || '')

  // Public seat map from Firestore seat_public collection
  const [publicDoc, setPublicDoc] = useState<SeatPublicDoc>({
    taken: {},
    held: {},
    blocked: [],
    departureAt: 0,
    v: 1,
    updatedAt: '',
  })

  // Suggestion state
  const [dismissedSuggestion, setDismissedSuggestion] = useState(false)
  const prevSuggestedSeatsRef = useRef<string[]>([])

  // Hold Timer state
  const [holdTimerSeconds, setHoldTimerSeconds] = useState<number | null>(null)
  const [myHeldSeatIds, setMyHeldSeatIds] = useState<string[]>([])
  const [sheet, setSheet] = useState(false)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [userName, setUserName] = useState('')
  const [userPhone, setUserPhone] = useState('')

  useEffect(() => {
    const unsub = subscribeToAuth(async (user) => {
      setCurrentUser(user)
      if (user && !user.isAnonymous) {
        try {
          const { profile } = await fetchCurrentProfile()
          if (profile?.name) setUserName(profile.name)
          if (profile?.mobile) setUserPhone(profile.mobile)
        } catch {}
      }
    })
    return () => unsub()
  }, [])

  const handleLogout = async () => {
    await signOutUser()
    setCurrentUser(null)
    setUserName('')
    setUserPhone('')
    setSheet(false)
  }

  useEffect(() => {
    if (typeof window !== 'undefined') {
      ;(window as any).__BOOKING_STORE__ = useBookingStore
    }
  }, [])

  const activePassenger =
    passengers.find((p) => p.id === activePassengerId) ??
    passengers.find((p) => !p.seatId) ??
    passengers[0]

  const activeGender: Gender = activePassenger?.gender === 'woman' ? 'F' : 'M'

  const selectedSeats = passengers.flatMap((p) => (p.seatId ? [p.seatId] : []))

  const searchParamsRef = useRef<{ route: string; date: string; tripId: string }>({
    route: 'AHM_PUN',
    date: todayIST(),
    tripId: 'AHM_PUN_0600',
  })

  const [selectedTemplateOverride, setSelectedTemplateOverride] = useState<BusTemplateId | null>(null)

  const busTemplate = useMemo(() => {
    if (selectedTemplateOverride && selectedTemplateOverride in BUS_TEMPLATES) {
      return BUS_TEMPLATES[selectedTemplateOverride]
    }
    let paramTemplate: string | null = null
    if (typeof window !== 'undefined') {
      const sp = new URLSearchParams(window.location.search)
      paramTemplate = sp.get('template') || sp.get('templateId') || sp.get('bus')
    }
    if (paramTemplate && paramTemplate in BUS_TEMPLATES) {
      return BUS_TEMPLATES[paramTemplate as BusTemplateId]
    }
    return getTemplateForBus(
      journey.busName || journey.busId || journey.tripId || searchParamsRef.current.tripId
    )
  }, [selectedTemplateOverride, journey.busName, journey.busId, journey.tripId])

  // 1. Initial metadata fetch & Firestore Realtime Subscription (onSnapshot on seat_public)
  const routeProp = journey.routeId || 'AHM_PUN'
  const dateProp = journey.date || todayIST()
  const tripIdProp = journey.tripId || 'AHM_PUN_0600'

  useEffect(() => {
    let route = routeProp
    let date = dateProp
    let tripId = tripIdProp

    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search)
      route = searchParams.get('route') || routeProp || 'AHM_PUN'
      date = searchParams.get('date') || dateProp || todayIST()
      tripId = searchParams.get('tripId') || tripIdProp || 'AHM_PUN_0600'
    }

    searchParamsRef.current = { route, date, tripId }

    let active = true
    let unsubscribeFn: (() => void) | null = null
    let pollInterval: NodeJS.Timeout | null = null

    // Resilient fallback polling keeps seat map perfectly live if client stream drops or errors
    const startFallbackPolling = () => {
      if (pollInterval) return
      pollInterval = setInterval(async () => {
        if (!active) return
        try {
          const res = await fetch(`/api/seats?route=${route}&date=${date}&tripId=${tripId}`)
          if (res.ok) {
            const data = await res.json()
            if (active && data?.publicMap) {
              setPublicDoc(data.publicMap)
            }
          }
        } catch {
          // ignore transient background poll failure
        }
      }, 8000)
    }

    // Fetch trip metadata from /api/seats
    async function loadTripMeta() {
      try {
        const headers = await getApiAuthHeaders()
        const res = await fetch(`/api/seats?route=${route}&date=${date}&tripId=${tripId}`, {
          headers,
        })
        if (!res.ok) return
        const data = await res.json()
        if (active && data) {
          setJourney({
            routeId: route,
            date,
            tripId,
            busName: data.busName || 'Uday Express',
            departure: data.departureTime || '06:00',
            arrival: data.arrivalTime || '08:45',
            fare: data.fare || 200,
          })
          if (data.publicMap) {
            setPublicDoc(data.publicMap)
          }
          if (Array.isArray(data.myHeldSeats)) {
            setMyHeldSeatIds(data.myHeldSeats)
          }
        }
      } catch {
        // Safe catch for trip metadata
      } finally {
        if (active) setLoadingPublicMap(false)
      }
    }

    loadTripMeta()

    // Subscribe directly to seat_public/{tripId}_{date} with onSnapshot (cloud or live emulator)
    // If in offline / mock dev mode, rely purely on internal /api/seats polling to avoid browser WebChannel errors
    const isOffline = isClientOfflineMode()
    if (isOffline) {
      startFallbackPolling()
    } else if (tripId && date) {
      const docId = `${tripId}_${date}`
      try {
        const db = getClientDb()
        const seatPublicRef = doc(db, 'seat_public', docId)

        unsubscribeFn = onSnapshot(
          seatPublicRef,
          { includeMetadataChanges: false },
          (snapshot) => {
            if (active && snapshot.exists()) {
              const data = snapshot.data() as SeatPublicDoc
              setPublicDoc(data)
              setLoadingPublicMap(false)
            }
          },
          (_err) => {
            // Silently fallback without logging uncaught console errors
            startFallbackPolling()
          }
        )
      } catch {
        startFallbackPolling()
      }
    } else {
      startFallbackPolling()
    }

    // 2. Realtime Database High-Frequency Seat Synchronization
    let rtdbUnsub: (() => void) | null = null
    try {
      rtdbUnsub = subscribeToTripSeats(tripId, (rtdbSeats) => {
        if (!active || !rtdbSeats) return
        setPublicDoc((prev) => {
          const updatedTaken = { ...prev.taken }
          const updatedHeld = { ...prev.held }
          const now = Date.now()

          for (const [sId, sData] of Object.entries(rtdbSeats)) {
            if (sData.status === 'booked') {
              updatedTaken[sId] = sData.gender?.startsWith('F') || sData.gender === 'woman' ? 'F' : 'M'
              delete updatedHeld[sId]
            } else if (sData.status === 'held' && sData.holdUntil && sData.holdUntil > now) {
              updatedHeld[sId] = {
                gender: sData.gender?.startsWith('F') || sData.gender === 'woman' ? 'F' : 'M',
                expiresAt: sData.holdUntil,
              }
            } else if (sData.status === 'available') {
              delete updatedHeld[sId]
            }
          }

          return {
            ...prev,
            taken: updatedTaken,
            held: updatedHeld,
          }
        })
      })
    } catch {
      // Safe catch for RTDB subscription
    }

    // Suppress unhandled internal Firestore network/assertion errors (e.g. offline code=unavailable, ID: ca9)
    const handleGlobalError = (event: ErrorEvent) => {
      const msg = event?.message || ''
      if (
        msg.includes('Could not reach Cloud Firestore backend') ||
        msg.includes('code=unavailable') ||
        msg.includes('INTERNAL ASSERTION FAILED') ||
        msg.includes('ID: ca9') ||
        msg.includes('WatchChangeAggregator')
      ) {
        event.preventDefault()
        event.stopPropagation()
        startFallbackPolling()
      }
    }

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event?.reason?.message || String(event?.reason || '')
      if (
        reason.includes('Could not reach Cloud Firestore backend') ||
        reason.includes('code=unavailable') ||
        reason.includes('INTERNAL ASSERTION FAILED') ||
        reason.includes('ID: ca9') ||
        reason.includes('WatchChangeAggregator')
      ) {
        event.preventDefault()
        event.stopPropagation()
        startFallbackPolling()
      }
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('error', handleGlobalError)
      window.addEventListener('unhandledrejection', handleUnhandledRejection)
    }

    return () => {
      active = false
      if (pollInterval) clearInterval(pollInterval)
      if (typeof window !== 'undefined') {
        window.removeEventListener('error', handleGlobalError)
        window.removeEventListener('unhandledrejection', handleUnhandledRejection)
      }
      if (unsubscribeFn) {
        try {
          unsubscribeFn()
        } catch {
          // safe catch during fast unmount
        }
      }
      if (rtdbUnsub) {
        try {
          rtdbUnsub()
        } catch {
          // safe catch
        }
      }
    }
  }, [routeProp, dateProp, tripIdProp])

  // Convert publicDoc to normalized map for rules engine
  const normalizedSeatsMap = useMemo(() => {
    return normalizeSeats(publicDoc)
  }, [publicDoc])

  const departureTimestamp = publicDoc.departureAt || Date.now() + 24 * 3600 * 1000

  // 2. Compute dynamic seat suggestions from rules engine
  const suggestions = useMemo(() => {
    if (dismissedSuggestion || passengers.length === 0) return []
    const group = {
      family,
      pax: passengers.map((p) => ({
        gender: (p.gender === 'woman' ? 'F' : 'M') as Gender,
        age: Number(p.age) || 25,
        prefs: p.prefs,
      })),
    }
    return suggestSeats(normalizedSeatsMap, group, Date.now(), departureTimestamp)
  }, [normalizedSeatsMap, family, passengers, departureTimestamp, dismissedSuggestion])

  const topSuggestion: Suggestion | undefined = suggestions[0]

  // Track if a suggested seat gets taken meanwhile -> drop with toast
  useEffect(() => {
    if (topSuggestion && topSuggestion.seatIds.length > 0) {
      const currentIds = topSuggestion.seatIds
      if (prevSuggestedSeatsRef.current.length > 0) {
        const takenRecently = prevSuggestedSeatsRef.current.some(
          (sId) => normalizedSeatsMap[sId]?.state === 'CONFIRMED'
        )
        if (takenRecently) {
          showToast('A previously recommended seat was just taken by another passenger.')
        }
      }
      prevSuggestedSeatsRef.current = currentIds
    }
  }, [topSuggestion, normalizedSeatsMap])

  // 3. Hold countdown timer (5 minutes for seat selection)
  useEffect(() => {
    // If no hold active or hold expired, start a fresh 5-minute countdown for seat selection
    if (!storeHoldExpiresAt || storeHoldExpiresAt <= Date.now()) {
      startHold()
    }
  }, [storeHoldExpiresAt, startHold])

  useEffect(() => {
    const calcRemaining = () => {
      if (!storeHoldExpiresAt) return 300
      return Math.max(0, Math.floor((storeHoldExpiresAt - Date.now()) / 1000))
    }

    setHoldTimerSeconds(calcRemaining())

    const interval = setInterval(() => {
      const remaining = calcRemaining()
      setHoldTimerSeconds(remaining)
      if (remaining <= 0) {
        clearInterval(interval)
        setError('Seat hold expired. Please re-select your seats.')
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [storeHoldExpiresAt])

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => {
      setToastMessage(null)
    }, 4500)
  }

  // Handle seat click
  const chooseSeat = (seatId: string) => {
    // If seat is already assigned to a passenger in this booking, toggle/unassign it
    const existingAssignee = passengers.find((p) => p.seatId === seatId)
    if (existingAssignee) {
      clearSeat(existingAssignee.id)
      setActivePassengerId(existingAssignee.id)
      setError('')
      return
    }

    if (!activePassenger) return

    const now = Date.now()

    // Build effective map incorporating currently selected seats of other passengers
    const effectiveMap = { ...normalizedSeatsMap }
    for (const p of passengers) {
      if (p.seatId && p.id !== activePassenger.id) {
        effectiveMap[p.seatId] = {
          state: 'HELD',
          gender: (p.gender === 'woman' ? 'F' : 'M') as Gender,
          holdExpiresAt: now + 600000,
        }
      }
    }

    const entry = effectiveMap[seatId]

    // 1. Is seat taken or blocked?
    if (entry && (entry.state === 'CONFIRMED' || entry.state === 'BLOCKED')) {
      showToast(`Seat ${seatId} is already booked or reserved.`)
      return
    }
    if (entry && entry.state === 'HELD' && entry.holdExpiresAt && entry.holdExpiresAt > now) {
      const isMyHold = myHeldSeatIds.includes(seatId)
      const otherPax = passengers.find((p) => p.seatId === seatId && p.id !== activePassenger.id)
      if (otherPax) {
        showToast(
          `Seat ${seatId} is already assigned to ${otherPax.name || 'another passenger in your booking'}.`
        )
        return
      }
      if (!isMyHold) {
        showToast(`Seat ${seatId} is currently held by another traveller.`)
        return
      }
    }

    // 2. Gender Neighbour Rule Enforcement: Male and Female must NEVER be neighbours
    const activeGender: Gender = activePassenger.gender === 'woman' ? 'F' : 'M'
    const adjSeats = busTemplate?.adjacentSeatsOf ? busTemplate.adjacentSeatsOf(seatId) : neighbours(seatId)

    for (const adj of adjSeats) {
      // 1. Check other co-passengers in this booking session first
      const coPax = passengers.find((p) => p.seatId === adj && p.id !== activePassenger.id)
      if (coPax) {
        // When travelling with family or consent given, male and female members of the SAME booking CAN sit adjacent
        if (!effectiveFamily && !acceptAdjacent) {
          const coGender: Gender = coPax.gender === 'woman' ? 'F' : 'M'
          if (coGender !== activeGender) {
            showToast(
              `Seat ${seatId} cannot be selected: Adjacent to Seat ${adj} assigned to ${
                coPax.name || 'a passenger'
              } (${coGender === 'F' ? 'Female' : 'Male'}). Male and female travellers cannot sit next to each other.`
            )
            return
          }
        }
        // With Family active or consent given: Co-passengers can flexibly sit together!
        continue
      }

      // 2. Check existing confirmed or held seats of unrelated strangers on the bus
      const strangerAdjGender = getActiveSeatGender(normalizedSeatsMap[adj], now)
      if (strangerAdjGender && strangerAdjGender !== activeGender) {
        showToast(
          `Seat ${seatId} cannot be selected: Adjacent to Seat ${adj} (booked by an unrelated ${
            strangerAdjGender === 'F' ? 'female' : 'male'
          } traveller). Male and female passengers cannot sit next to each other.`
        )
        return
      }
    }

    // 3. Strict 3-Seat Bench Gender Rule: For seats 3, 4, 5 in any row,
    // if one seat is for female/male, all other seats in that 3-seat bench must be the same gender.
    if (isThreeSeatSide(seatId)) {
      const bench = threeSeatBenchOf(seatId)
      for (const bSeat of bench) {
        if (bSeat !== seatId) {
          // Check co-passengers in booking
          const coPax = passengers.find((p) => p.seatId === bSeat && p.id !== activePassenger.id)
          if (coPax && !effectiveFamily && !acceptAdjacent) {
            const coGender: Gender = coPax.gender === 'woman' ? 'F' : 'M'
            if (coGender !== activeGender) {
              showToast(
                `Seat ${seatId} cannot be selected: In the 3-seat row (${bench.join(', ')}), all seats must be reserved for the same gender (${activeGender === 'F' ? 'all female' : 'all male'}).`
              )
              return
            }
          }

          // Check existing passengers on bus
          const strangerBenchGender = getActiveSeatGender(normalizedSeatsMap[bSeat], now)
          if (strangerBenchGender && strangerBenchGender !== activeGender) {
            showToast(
              `Seat ${seatId} cannot be selected: In the 3-seat row (${bench.join(', ')}), Seat ${bSeat} is reserved for a ${strangerBenchGender === 'F' ? 'female' : 'male'} passenger. All seats in this 3-seat row must be the same gender.`
            )
            return
          }
        }
      }
    }

    // Assign seat to active passenger
    assignSeat(activePassenger.id, seatId)
    setError('')

    // Auto-advance to next passenger without seat, or cycle to next passenger if multiple passengers
    const nextPassenger = passengers.find(
      (p) => p.id !== activePassenger.id && !p.seatId
    )
    if (nextPassenger) {
      setActivePassengerId(nextPassenger.id)
    } else if (passengers.length > 1) {
      const curIdx = passengers.findIndex((p) => p.id === activePassenger.id)
      const nextIdx = (curIdx + 1) % passengers.length
      if (passengers[nextIdx]) {
        setActivePassengerId(passengers[nextIdx].id)
      }
    }
  }

  // Apply specific suggestion in one click
  const applySpecificSuggestion = (sug: Suggestion) => {
    if (!sug || sug.seatIds.length !== passengers.length) return
    sug.seatIds.forEach((sId, idx) => {
      const p = passengers[idx]
      if (p) {
        assignSeat(p.id, sId)
      }
    })
    setDismissedSuggestion(true)
    showToast(`Recommended seats (${sug.seatIds.join(', ')}) applied!`)
  }

  // Apply top suggestion in one click
  const applySuggestion = () => {
    if (topSuggestion) {
      applySpecificSuggestion(topSuggestion)
    }
  }

  // Automatically find and assign contiguous neighbour seats for family members (male and female)
  const autoAssignFamilySeats = (
    customPassengers = passengers,
    customMap = normalizedSeatsMap,
    notify = false
  ) => {
    if (customPassengers.length < 2) return false
    const now = Date.now()
    const nPax = customPassengers.length

    // Function to check if a candidate block of seat IDs is completely free and gender safe against strangers
    const isValidFamilyBlock = (candidateSeats: string[]) => {
      if (candidateSeats.length !== nPax) return false
      // 1. All seats must be free or held/selected by this booking
      for (const s of candidateSeats) {
        const state = customMap[s]
        if (state && (state.state === 'CONFIRMED' || state.state === 'BLOCKED')) return false
        if (state && state.state === 'HELD' && state.holdExpiresAt && state.holdExpiresAt > now) {
          if (!myHeldSeatIds.includes(s) && !customPassengers.some((p) => p.seatId === s)) return false
        }
      }

      // 2. Strict gender protection against unrelated passengers on the bus
      for (let i = 0; i < nPax; i++) {
        const sId = candidateSeats[i]
        const p = customPassengers[i]
        if (!p || !sId) continue
        const pGender: Gender = p.gender === 'woman' ? 'F' : 'M'
        const adjSeats = busTemplate?.adjacentSeatsOf ? busTemplate.adjacentSeatsOf(sId) : neighbours(sId)

        for (const adj of adjSeats) {
          // Co-passengers in this candidate group are exempt from stranger gender block!
          if (candidateSeats.includes(adj)) continue

          // Exclude seats previously held by co-passengers in this booking from stranger check
          if (customPassengers.some((cp) => cp.seatId === adj)) continue

          // Unrelated stranger on the bus must NOT be opposite gender
          const strangerGender = getActiveSeatGender(customMap[adj], now)
          if (strangerGender && strangerGender !== pGender) {
            return false // Adjacent to stranger of opposite gender
          }
        }
      }

      return true
    }

    const rows = ['B', 'A', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J']
    let chosenBlock: string[] | null = null

    if (nPax === 2) {
      // Priority 1: Left 2-seat window/aisle side-by-side pair (e.g. B1 & B2, A1 & A2)
      for (const r of rows) {
        const pair = [`${r}1`, `${r}2`]
        if (isValidFamilyBlock(pair)) {
          chosenBlock = pair
          break
        }
      }
      // Priority 2: Right side adjacent pairs (e.g. B4 & B5, or B3 & B4)
      if (!chosenBlock) {
        for (const r of rows) {
          const pairRight = [`${r}4`, `${r}5`]
          if (isValidFamilyBlock(pairRight)) {
            chosenBlock = pairRight
            break
          }
          const pairMid = [`${r}3`, `${r}4`]
          if (isValidFamilyBlock(pairMid)) {
            chosenBlock = pairMid
            break
          }
        }
      }
      // Priority 3: Across aisle (e.g. B2 & B3)
      if (!chosenBlock) {
        for (const r of rows) {
          const pairAisle = [`${r}2`, `${r}3`]
          if (isValidFamilyBlock(pairAisle)) {
            chosenBlock = pairAisle
            break
          }
        }
      }
    } else if (nPax === 3) {
      // Priority 1: Right 3-seat block (3, 4, 5 in same row: e.g. B3, B4, B5)
      for (const r of rows) {
        const trio = [`${r}3`, `${r}4`, `${r}5`]
        if (isValidFamilyBlock(trio)) {
          chosenBlock = trio
          break
        }
      }
      // Priority 2: Left pair + aisle (e.g. B1, B2, B3)
      if (!chosenBlock) {
        for (const r of rows) {
          const trio = [`${r}1`, `${r}2`, `${r}3`]
          if (isValidFamilyBlock(trio)) {
            chosenBlock = trio
            break
          }
        }
      }
    } else if (nPax === 4) {
      for (let i = 0; i < rows.length - 1; i++) {
        const r1 = rows[i]
        const r2 = rows[i + 1]
        const quad = [`${r1}1`, `${r1}2`, `${r2}1`, `${r2}2`]
        if (isValidFamilyBlock(quad)) {
          chosenBlock = quad
          break
        }
      }
    } else if (nPax === 5) {
      for (const r of rows) {
        const quint = [`${r}1`, `${r}2`, `${r}3`, `${r}4`, `${r}5`]
        if (isValidFamilyBlock(quint)) {
          chosenBlock = quint
          break
        }
      }
    } else if (nPax === 6) {
      for (let i = 0; i < rows.length - 1; i++) {
        const r1 = rows[i]
        const r2 = rows[i + 1]
        const six = [`${r1}3`, `${r1}4`, `${r1}5`, `${r2}3`, `${r2}4`, `${r2}5`]
        if (isValidFamilyBlock(six)) {
          chosenBlock = six
          break
        }
      }
    }

    // Fallback: topSuggestion from rules engine
    if (!chosenBlock && topSuggestion && topSuggestion.seatIds.length === nPax) {
      if (isValidFamilyBlock(topSuggestion.seatIds)) {
        chosenBlock = topSuggestion.seatIds
      }
    }

    if (chosenBlock && chosenBlock.length === nPax) {
      chosenBlock.forEach((sId, idx) => {
        const p = customPassengers[idx]
        if (p) {
          assignSeat(p.id, sId)
        }
      })
      setActivePassengerId(customPassengers[0]?.id || '')
      setError('')
      if (notify) {
        showToast(
          `Adjacent neighbour seats (${chosenBlock.join(
            ', '
          )}) automatically selected for your group!`
        )
      }
      return true
    }
    return false
  }

  const handleToggleFamily = () => {
    const nextVal = !effectiveFamily
    toggleFamily()
    setLocalFamily(nextVal)

    if (nextVal) {
      const ok = autoAssignFamilySeats(passengers, normalizedSeatsMap, true)
      if (!ok) {
        showToast('With Family active: You can select adjacent neighbour seats together.')
      }
    } else {
      showToast('Family mode turned off.')
    }
  }

  // Auto-assign family neighbour seats on initial mount or when family mode is active and unassigned
  const autoAssignedPaxKeyRef = useRef('')
  useEffect(() => {
    if (effectiveFamily && passengers.length >= 2) {
      const hasUnassigned = passengers.some((p) => !p.seatId)
      const currentPaxKey = passengers.map((p) => p.id).join(',')
      if (hasUnassigned && autoAssignedPaxKeyRef.current !== currentPaxKey) {
        const assigned = autoAssignFamilySeats(passengers, normalizedSeatsMap, false)
        if (assigned) {
          autoAssignedPaxKeyRef.current = currentPaxKey
        }
      }
    }
  }, [effectiveFamily, passengers, normalizedSeatsMap])

  // Continue to Review & Hold seats
  const continueToReview = async () => {
    if (selectedSeats.length !== passengerCount) {
      return setError(
        `Select ${passengerCount} seat${passengerCount === 1 ? '' : 's'} to continue.`
      )
    }

    // Enforce that NO assigned seats in the booking violate the neighbour gender rule
    for (const p of passengers) {
      if (!p.seatId) continue
      const pGender: Gender = p.gender === 'woman' ? 'F' : 'M'
      const adjSeats = busTemplate?.adjacentSeatsOf ? busTemplate.adjacentSeatsOf(p.seatId) : neighbours(p.seatId)
      for (const adj of adjSeats) {
        const busAdjGender = getActiveSeatGender(normalizedSeatsMap[adj], Date.now())
        if (busAdjGender && busAdjGender !== pGender) {
          return setError(
            `Seat ${p.seatId} (${p.name || 'Passenger'}) is adjacent to Seat ${adj} (${
              busAdjGender === 'F' ? 'Female' : 'Male'
            }). Male and female passengers cannot sit next to each other.`
          )
        }
        if (!effectiveFamily && !acceptAdjacent) {
          const coPax = passengers.find((o) => o.seatId === adj && o.id !== p.id)
          if (coPax) {
            const coGender: Gender = coPax.gender === 'woman' ? 'F' : 'M'
            if (coGender !== pGender) {
              return setError(
                `Seats ${p.seatId} and ${adj} are adjacent, but assigned to different genders (${
                  p.name || 'P1'
                } and ${coPax.name || 'P2'}). Opposite genders cannot sit next to each other.`
              )
            }
          }
        }
      }
    }

    try {
      setHolding(true)
      setError('')
      const headers = await getApiAuthHeaders()

      const payload = {
        routeId: searchParamsRef.current.route || 'AHM_PUN',
        date: searchParamsRef.current.date || todayIST(),
        tripId: searchParamsRef.current.tripId || 'AHM_PUN_0600',
        family: effectiveFamily,
        acceptAdjacent,
        passengers: passengers.map((p) => ({
          seatId: p.seatId || '',
          gender: p.gender === 'woman' ? 'F' : 'M',
          age: Number(p.age) || 25,
        })),
      }

      const res = await fetch('/api/seats/hold', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      })

      const data = await res.json()

      if (!res.ok) {
        // Handle conflict with fresh map
        if (data.error?.details?.freshMap) {
          setPublicDoc(data.error.details.freshMap)
        }
        throw new Error(data.error?.message || 'Seat just taken, please re-pick.')
      }

      if (Array.isArray(data.seatIds)) {
        setMyHeldSeatIds(data.seatIds)
      }
      setHold(data.grp, data.holdToken, data.holdExpiresAt)
      startHold()
      router.push('/booking/summary')
    } catch (err: unknown) {
      const rawMsg = err instanceof Error ? err.message : 'Failed to hold seats'
      let msg = rawMsg
      if (
        rawMsg.includes('configuration-not-found') ||
        rawMsg.includes('CONFIGURATION_NOT_FOUND') ||
        rawMsg.includes('auth/')
      ) {
        msg = 'Connection warning: Please try proceeding or refreshing the page.'
      }
      setError(msg)
    } finally {
      setHolding(false)
    }
  }

  // Render individual seat button
  const renderSeatButton = (seatId: string) => {
    const isSelected = selectedSeats.includes(seatId)
    const assignedPassenger = passengers.find((p) => p.seatId === seatId)
    const now = Date.now()

    // Build effective map for active passenger incorporating other chosen seats
    const effectiveMap = { ...normalizedSeatsMap }
    for (const p of passengers) {
      if (p.seatId && p.id !== activePassenger?.id) {
        effectiveMap[p.seatId] = {
          state: 'HELD',
          gender: (p.gender === 'woman' ? 'F' : 'M') as Gender,
          holdExpiresAt: now + 600000,
        }
      }
    }

    const entry = effectiveMap[seatId]
    const isMyHold = myHeldSeatIds.includes(seatId)
    const isOccupied =
      entry &&
      (entry.state === 'CONFIRMED' ||
        entry.state === 'BLOCKED' ||
        (entry.state === 'HELD' &&
          entry.holdExpiresAt &&
          entry.holdExpiresAt > now &&
          !isMyHold &&
          !passengers.some((p) => p.seatId === seatId && p.id === activePassenger?.id)))

    // Gender of booked seat if occupied
    let bookedGender: 'F' | 'M' | null = null
    if (isOccupied) {
      const rawG = (entry as any)?.gender || publicDoc.taken?.[seatId] || publicDoc.held?.[seatId]?.gender
      if (rawG) {
        bookedGender = rawG === 'F' || rawG === 'female' || rawG === 'woman' ? 'F' : 'M'
      }
    }

    // Check neighbour genders for active passenger
    // 3-Seat Bench Rule: On columns 3, 4, 5 (the 3-seat bench), if ANY seat on that bench is occupied
    // or selected by male/female, ALL other seats on that bench share that gender restriction.
    const adjSeats = isThreeSeatSide(seatId)
      ? threeSeatBenchOf(seatId).filter((s) => s !== seatId)
      : busTemplate?.adjacentSeatsOf
      ? busTemplate.adjacentSeatsOf(seatId)
      : neighbours(seatId)
    let hasFemaleNeighbour = false
    let hasMaleNeighbour = false

    for (const adj of adjSeats) {
      const pOnSeat = passengers.find((p) => p.seatId === adj)
      if (pOnSeat) {
        // Co-passenger neighbour check: only enforce opposite gender block when NOT travelling with family
        if (!effectiveFamily && !acceptAdjacent) {
          const g = (pOnSeat.gender || '').toLowerCase()
          if (g.startsWith('w') || g.startsWith('f')) hasFemaleNeighbour = true
          if (g.startsWith('m')) hasMaleNeighbour = true
        }
        // If family mode is active or consent given, co-passengers do NOT trigger gender-block for each other!
        continue
      }

      // Unrelated stranger on the bus
      const strangerG = getActiveSeatGender(normalizedSeatsMap[adj], now)
      if (strangerG === 'F') hasFemaleNeighbour = true
      if (strangerG === 'M') hasMaleNeighbour = true
    }

    const activeG = (activePassenger?.gender || '').toLowerCase()
    const activeGender: Gender = activeG.startsWith('w') || activeG.startsWith('f') ? 'F' : 'M'
    const isGenderBlocked =
      !isOccupied &&
      !isSelected &&
      ((activeGender === 'M' && hasFemaleNeighbour) || (activeGender === 'F' && hasMaleNeighbour))

    const isLadiesOnly = !isOccupied && !isSelected && hasFemaleNeighbour && !hasMaleNeighbour

    const isSuggested =
      topSuggestion && !dismissedSuggestion && topSuggestion.seatIds.includes(seatId) && !isGenderBlocked

    // Classes
    const classes = [
      'flow-seat',
      isSelected ? 'is-selected' : '',
      isOccupied ? 'taken booked is-booked' : '',
      isOccupied && bookedGender === 'F' ? 'booked-female' : '',
      isOccupied && bookedGender === 'M' ? 'booked-male' : '',
      !isOccupied && !isSelected && isLadiesOnly ? 'ladies-reserved' : '',
      !isOccupied && !isSelected && isGenderBlocked ? 'gender-blocked' : '',
      !isOccupied && !isSelected && !isGenderBlocked ? 'available' : '',
      isSuggested && !isSelected ? 'suggested' : '',
    ]
      .filter(Boolean)
      .join(' ')

    let titleLabel = `Seat ${seatId}`
    if (isSelected) {
      titleLabel = `Seat ${seatId} - Selected for ${assignedPassenger?.name || 'passenger'}`
    } else if (isOccupied) {
      titleLabel = `Seat ${seatId} - Booked ${
        bookedGender === 'F' ? '(Female)' : bookedGender === 'M' ? '(Male)' : ''
      } [Unavailable]`
    } else if (isGenderBlocked) {
      titleLabel = `Seat ${seatId} - Reserved for ${
        activeGender === 'M' ? 'Female' : 'Male'
      } travellers (Opposite gender sitting adjacent)`
    } else if (isLadiesOnly) {
      titleLabel = `Seat ${seatId} - Ladies Seat (Adjacent to Female traveller)`
    } else {
      titleLabel = `Seat ${seatId} - Available`
    }

    return (
      <button
        key={seatId}
        type="button"
        data-seat-id={seatId}
        disabled={Boolean(isOccupied || isGenderBlocked)}
        className={classes}
        onClick={() => chooseSeat(seatId)}
        aria-label={titleLabel}
        title={titleLabel}
        aria-pressed={isSelected}
      >
        <BusSeatGraphic
          isSelected={isSelected}
          isOccupied={Boolean(isOccupied)}
          bookedGender={bookedGender}
          isLadiesOnly={Boolean(isLadiesOnly)}
          isGenderBlocked={Boolean(isGenderBlocked)}
        />
      </button>
    )
  }

  return (
    <main className="account-page seats-flow">
      <BookingHeader onMenu={() => setSheet((prev) => !prev)} />

      {/* Cityscape Hero Banner with CHOOSE YOUR SEATS & Hold Timer matching Choose Your Journey */}
      <section className="seats-hero availability-hero" aria-label="Seat Selection Hero">
        <div className="seats-hero-overlay availability-hero-overlay" />
        <div className="availability-hero-copy">
          <div className="flex items-end justify-between flex-wrap gap-4">
            <div>
              <h1>
                CHOOSE YOUR<br />
                <span>SEATS.</span>
              </h1>
            </div>

            <div className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-black text-gray-950 bg-[#F8B018] px-4 py-2 rounded-full shadow-[0_2px_12px_rgba(0,0,0,0.45)] border border-yellow-300 shrink-0">
              <Clock size={14} className="text-gray-950 stroke-[2.5]" />
              <span>
                Hold expires in {Math.floor((holdTimerSeconds ?? 300) / 60)}:
                {((holdTimerSeconds ?? 300) % 60).toString().padStart(2, '0')}
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="booking-shell">

        {/* Suggestion Banner — Yellow-Orange (Amber) Theme */}
        {topSuggestion && !dismissedSuggestion && (
          <aside className="mb-4 p-4 sm:p-4.5 bg-gradient-to-br from-amber-50/98 via-amber-50/92 to-orange-50/80 border-2 border-[#F8B018]/60 rounded-2xl shadow-md shadow-amber-950/5 transition-all animate-in fade-in slide-in-from-top-2 duration-300">
            {/* Top Row: Icon + Title + Recommended Badge + Dismiss Button */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-[#F8B018]/25 border border-[#F8B018]/50 flex items-center justify-center text-amber-950 flex-shrink-0 shadow-2xs">
                  <Sparkles size={17} className="text-[#B45309]" />
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <strong className="text-xs sm:text-sm font-extrabold text-amber-950 block">
                      Recommended Seating Option
                    </strong>
                  </div>
                </div>
              </div>

              {/* Close Button at Top-Right with clear space */}
              <button
                type="button"
                onClick={() => setDismissedSuggestion(true)}
                className="p-1.5 -mr-1 -mt-1 text-amber-800/70 hover:text-amber-950 hover:bg-amber-200/50 rounded-lg transition-colors cursor-pointer shrink-0"
                aria-label="Dismiss suggestion"
                title="Dismiss suggestion"
              >
                <X size={16} />
              </button>
            </div>

            {/* Single Top Suggestion Card */}
            <div className="mt-3.5 grid grid-cols-1 gap-2.5">
              {suggestions.slice(0, 1).map((sug) => {
                return (
                  <div
                    key={sug.seatIds.join('-')}
                    className="p-3.5 rounded-xl border bg-amber-100/70 border-amber-400/90 shadow-2xs ring-1 ring-amber-400/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all"
                  >
                    <div>
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-[10px] font-black uppercase tracking-wider text-amber-950">
                          Top Pick
                        </span>
                        <span className="text-[9px] font-extrabold uppercase tracking-wider text-amber-950 bg-[#F8B018] px-1.5 py-0.5 rounded-full shadow-2xs">
                          Recommended
                        </span>
                      </div>
                      <strong className="text-sm sm:text-base font-black text-amber-950 block">
                        {sug.seatIds.length > 1 ? 'Seats' : 'Seat'} {sug.seatIds.join(', ')}
                      </strong>
                      <p className="text-[11px] font-medium text-amber-900/85 mt-0.5 leading-snug">
                        {sug.reason === 'NEXT_TO_SAME_GENDER' && 'Seated directly next to same-gender passengers'}
                        {sug.reason === 'FAMILY_BLOCK' && 'Aisle-split / gender-safe bench'}
                        {sug.reason === 'SAME_ZONE' && 'Seated together in coach zone'}
                        {sug.reason === 'FRESH_ZONE' && 'Fresh open zone matching preferences'}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => applySpecificSuggestion(sug)}
                      className="py-2.5 px-4 text-xs font-black rounded-lg shadow-2xs transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-1.5 border bg-gradient-to-r from-amber-500 via-[#F8B018] to-orange-500 hover:from-amber-600 hover:to-orange-600 text-gray-950 border-amber-300 shrink-0"
                    >
                      <Sparkles size={13} className="text-gray-950" />
                      <span>Use suggestion ({sug.seatIds.join(', ')})</span>
                    </button>
                  </div>
                )
              })}
            </div>
          </aside>
        )}

        <section className="profile-card flow-seat-card">
          {/* Passenger Chip Bar */}
          <div className="flow-passengers">
            <div className="flow-passengers-title">
              <h2>Active Passenger</h2>
              <span>
                {selectedSeats.length} of {passengerCount} seats selected
              </span>
            </div>

            <div className="flow-passenger-list">
              {passengers.map((passenger, index) => {
                const isActive = activePassenger?.id === passenger.id
                const isFem =
                  (passenger.gender || '').toLowerCase().startsWith('w') ||
                  (passenger.gender || '').toLowerCase().startsWith('f')
                const genderLabel = isFem ? 'F' : 'M'
                return (
                  <button
                    key={passenger.id}
                    type="button"
                    className={`flow-passenger-option ${isActive ? 'active' : ''}`}
                    onClick={() => setActivePassengerId(passenger.id)}
                    aria-pressed={isActive}
                  >
                    <span>
                      {passenger.name || `Passenger ${index + 1}`}{' '}
                      <span
                        className={`text-[10px] font-black uppercase px-1.5 py-0.5 rounded ${
                          isFem ? 'bg-pink-100 text-pink-700' : 'bg-blue-100 text-blue-700'
                        }`}
                      >
                        {genderLabel}
                      </span>
                    </span>
                    <strong>{passenger.seatId ? `Seat ${passenger.seatId}` : 'Choose seat'}</strong>
                  </button>
                )
              })}
            </div>

            <div className="flow-assignment-hint flex items-center justify-between flex-wrap gap-2 text-xs">
              {activePassenger ? (
                <div className="flex items-center gap-2 flex-wrap w-full justify-between">
                  <span>
                    Select seat for <b>{activePassenger.name || 'Passenger'}</b>
                  </span>
                </div>
              ) : (
                <span>Select a passenger chip above to assign their seat.</span>
              )}
            </div>
          </div>

          {/* Bus Fleet Bar */}
          <div className="flex items-center justify-end flex-wrap gap-2 pt-2 border-t border-gray-100">
            <div className="flex items-center gap-2">
              {loadingPublicMap && (
                <span className="flex items-center gap-1.5 text-[11px] text-[#F8B018] font-bold">
                  <Loader2 size={12} className="animate-spin text-[#F8B018]" /> Loading seats...
                </span>
              )}
              <span className="text-[11px] font-bold text-gray-500 font-mono">
                {busTemplate.busNumber}
              </span>
            </div>
          </div>

          {/* Coach Cabin Container matching screenshot structure */}
          <div className="flow-bus-shell flow-seat-map" role="group" aria-label="Choose bus seats">
            {/* Driver Cabin with Steering Wheel at top right */}
            <div className="flow-driver-cabin">
              <span className="text-[10px] font-extrabold text-gray-400 tracking-wider uppercase font-mono">
                Front · Driver Cabin
              </span>
              <div className="flow-steering-wheel" title="Driver's Side">
                <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
                  <circle cx="16" cy="16" r="13" stroke="#9CA3AF" strokeWidth="2.5" />
                  <circle cx="16" cy="16" r="3.5" fill="#9CA3AF" />
                  <line x1="16" y1="3" x2="16" y2="12.5" stroke="#9CA3AF" strokeWidth="2.5" strokeLinecap="round" />
                  <line x1="6.8" y1="21.3" x2="13.5" y2="17.8" stroke="#9CA3AF" strokeWidth="2.5" strokeLinecap="round" />
                  <line x1="25.2" y1="21.3" x2="18.5" y2="17.8" stroke="#9CA3AF" strokeWidth="2.5" strokeLinecap="round" />
                </svg>
              </div>
            </div>

            {/* Front entrance seats if template has frontSeats (e.g. 44-seater) */}
            {busTemplate.frontSeats && busTemplate.frontSeats.length > 0 && (
              <div className="flow-seat-row-front mb-2 pb-2 border-b border-gray-100 flex justify-end gap-1.5">
                {busTemplate.frontSeats.map((sId) => renderSeatButton(sId))}
              </div>
            )}

            {/* Main Passenger Rows */}
            <div className="flow-seat-rows">
              {busTemplate.rows.map((row) => (
                <div className="flow-seat-row" key={row.rowLabel}>
                  <div className="flow-seat-col-left">
                    {row.leftSeats.map((sId) => renderSeatButton(sId))}
                  </div>
                  <div className="flow-seat-aisle" aria-hidden="true" />
                  <div className="flow-seat-col-right">
                    {row.rightSeats.map((sId) => renderSeatButton(sId))}
                  </div>
                </div>
              ))}
            </div>

            {/* Rear Bench */}
            {busTemplate.rearBench.length > 0 && (
              <div className="flow-seat-row-rear">
                {busTemplate.rearBench.map((sId) => renderSeatButton(sId))}
              </div>
            )}
          </div>

          {/* Rules Legend */}
          <div className="flow-seat-legend">
            <span>
              <i style={{ background: '#FFFFFF', borderColor: '#5A6474' }} />
              Available
            </span>
            <span>
              <i style={{ background: '#F8B018', borderColor: '#0B0F19' }} />
              Selected
            </span>
            <span>
              <i style={{ background: '#D8DAE0', borderColor: '#5A6474' }} />
              Booked
            </span>
            <span>
              <i style={{ background: '#FDF2F8', borderColor: '#A855F7' }} />
              Ladies Reserved
            </span>
            <span>
              <i style={{ background: '#F1F5F9', borderColor: '#94A3B8', opacity: 0.5 }} />
              Opposite Blocked
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
            <div className="my-2">
              <ThemedErrorBanner
                title="Seat Selection Notice"
                message={error}
                onDismiss={() => setError('')}
                variant="warning"
                compact
              />
            </div>
          )}
        </section>
      </section>

      {/* Toast Notification */}
      {toastMessage && (
        <div
          role="status"
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 text-xs font-semibold max-w-sm text-center animate-in fade-in slide-in-from-bottom-3 duration-200"
        >
          <Info size={16} className="text-[#F8B018] flex-shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Navigation Drawer in Light Theme matching Brand Standard */}
      <NavDrawer
        open={sheet}
        onClose={() => setSheet(false)}
        currentUser={currentUser}
        userName={userName}
        userPhone={userPhone}
        onLogout={handleLogout}
        theme="light"
      />
    </main>
  )
}
