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
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useMemo, useRef } from 'react'
import { doc, onSnapshot } from 'firebase/firestore'
import { useBookingStore, type Passenger } from '@/lib/booking-store'
import { getClientDb } from '@/lib/firebase/client'
import { getApiAuthHeaders } from '@/lib/firebase/client'
import { subscribeToTripSeats } from '@/lib/firebase/rtdb'
import { todayIST } from '@/lib/time/ist'
import {
  ALL_SEAT_ROWS,
  ALL_SEAT_COLS,
  Gender,
  zoneOf,
  zoneGender,
  neighbours,
  getActiveSeatGender,
  levelFor,
  lowestAvailableLevel,
  suggestSeats,
  Suggestion,
  SeatState,
  normalizeSeats,
} from '@/lib/domain/seats/rules'
import { SeatPublicDoc } from '@/lib/data/seats.repo'
import { HOLD_TTL_MS } from '@/lib/config/seat-rules'

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
    family,
    toggleFamily,
    acceptAdjacent,
    setAcceptAdjacent,
    assignSeat,
    clearSeat,
    startHold,
    setHold,
    journey,
    setJourney,
  } = useBookingStore()

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

  // Level 2 Consent Dialog state
  const [pendingConsentSeat, setPendingConsentSeat] = useState<string | null>(null)

  // Hold Timer state
  const [holdTimerSeconds, setHoldTimerSeconds] = useState<number | null>(null)

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
      }, 3000)
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
        }
      } catch (err) {
        console.warn('[Seats] Metadata fetch warning:', err)
      } finally {
        if (active) setLoadingPublicMap(false)
      }
    }

    loadTripMeta()

    // Subscribe directly to seat_public/{tripId}_{date} with onSnapshot
    if (tripId && date) {
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
          (err) => {
            console.warn('[Seats] onSnapshot notice, fallback polling engaged:', err?.message || err)
            startFallbackPolling()
          }
        )
      } catch (err) {
        console.warn('[Seats] Firestore onSnapshot setup error, fallback polling engaged:', err)
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
    } catch (rtdbErr) {
      console.warn('[Seats] RTDB subscription warning:', rtdbErr)
    }

    // Suppress unhandled internal Firestore assertion error ID: ca9
    const handleGlobalError = (event: ErrorEvent) => {
      const msg = event?.message || ''
      if (
        msg.includes('INTERNAL ASSERTION FAILED') ||
        msg.includes('ID: ca9') ||
        msg.includes('WatchChangeAggregator')
      ) {
        event.preventDefault()
        event.stopPropagation()
        console.warn('[Firestore] Suppressed watch-change assertion (ID: ca9). Fallback polling active.')
        startFallbackPolling()
      }
    }

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event?.reason?.message || String(event?.reason || '')
      if (
        reason.includes('INTERNAL ASSERTION FAILED') ||
        reason.includes('ID: ca9') ||
        reason.includes('WatchChangeAggregator')
      ) {
        event.preventDefault()
        event.stopPropagation()
        console.warn('[Firestore] Suppressed watch-change promise rejection (ID: ca9). Fallback polling active.')
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
          (sId) => !normalizedSeatsMap[sId] || normalizedSeatsMap[sId].state === 'CONFIRMED'
        )
        if (takenRecently) {
          showToast('A previously recommended seat was just taken by another passenger.')
        }
      }
      prevSuggestedSeatsRef.current = currentIds
    }
  }, [topSuggestion, normalizedSeatsMap])

  // 3. Hold countdown timer (5 minutes)
  const storeHoldExpiresAt = useBookingStore((s) => s.holdExpiresAt)
  useEffect(() => {
    if (!storeHoldExpiresAt) {
      setHoldTimerSeconds(null)
      return
    }

    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.floor((storeHoldExpiresAt - Date.now()) / 1000))
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
      const otherPax = passengers.find((p) => p.seatId === seatId && p.id !== activePassenger.id)
      if (otherPax) {
        showToast(`Seat ${seatId} is already assigned to ${otherPax.name || 'another passenger in your booking'}.`)
        return
      }
      showToast(`Seat ${seatId} is currently held by another traveller.`)
      return
    }

    // 2. Strict Neighbour Check: Male and Female can NEVER be neighbour seats unless Family mode is active
    const oppositeGender: Gender = activeGender === 'F' ? 'M' : 'F'
    const nbrs = neighbours(seatId)
    const hasOppositeNeighbour = nbrs.some((nbrId) => {
      // Check other passengers in current booking
      const coPax = passengers.find((p) => p.seatId === nbrId && p.id !== activePassenger.id)
      if (coPax) {
        const coGender: Gender = coPax.gender === 'woman' ? 'F' : 'M'
        return coGender === oppositeGender
      }
      // Check database seats
      const nbrEntry = normalizedSeatsMap[nbrId]
      return getActiveSeatGender(nbrEntry, now) === oppositeGender
    })

    if (hasOppositeNeighbour && !family) {
      showToast(
        `Seat ${seatId} is next to a ${oppositeGender === 'F' ? 'female' : 'male'} passenger. Male and female travellers cannot be neighbour seats.`
      )
      return
    }

    // 3. Zone check: Non-family passengers of different genders cannot share a zone
    const z = zoneOf(seatId)
    if (!family) {
      const otherPaxInZone = passengers.filter(
        (p) => p.id !== activePassenger.id && p.seatId && zoneOf(p.seatId) === z
      )
      const hasOppositeInZone = otherPaxInZone.some(
        (p) => (p.gender === 'woman' ? 'F' : 'M') === oppositeGender
      )
      if (hasOppositeInZone) {
        showToast(
          `Male and female travellers cannot share the same zone unless Family booking is enabled.`
        )
        return
      }
    }

    // 4. Ladder check
    const lvl = levelFor(effectiveMap, seatId, activeGender, now, departureTimestamp)
    const minLvl = lowestAvailableLevel(effectiveMap, activeGender, now, departureTimestamp)

    // Locked for other gender
    if (lvl === null) {
      const zg = zoneGender(effectiveMap, z, now)
      if (zg && zg !== activeGender) {
        showToast(
          `Seat ${seatId} is in a ${
            zg === 'F' ? 'Women' : 'Men'
          } zone. Strangers of the other gender cannot sit here.`
        )
      } else {
        showToast(`Seat ${seatId} cannot be selected due to gender distance rules.`)
      }
      return
    }

    // If level is 2: requires explicit consent
    if (lvl === 2 && !acceptAdjacent) {
      setPendingConsentSeat(seatId)
      return
    }

    // Assign seat to active passenger
    assignSeat(activePassenger.id, seatId)
    setError('')

    // Auto-advance to next passenger without seat
    const nextPassenger = passengers.find(
      (p) => p.id !== activePassenger.id && !p.seatId
    )
    if (nextPassenger) {
      setActivePassengerId(nextPassenger.id)
    }
  }

  // Apply suggestion in one click
  const applySuggestion = () => {
    if (!topSuggestion || topSuggestion.seatIds.length !== passengers.length) return
    topSuggestion.seatIds.forEach((sId, idx) => {
      const p = passengers[idx]
      if (p) {
        assignSeat(p.id, sId)
      }
    })
    setDismissedSuggestion(true)
    showToast('Recommended seats applied!')
  }

  // Continue to Review & Hold seats
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

      const payload = {
        routeId: searchParamsRef.current.route || 'AHM_PUN',
        date: searchParamsRef.current.date || todayIST(),
        tripId: searchParamsRef.current.tripId || 'AHM_PUN_0600',
        family,
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
        if (data.error?.code === 'ADJACENT_CONSENT_REQUIRED') {
          setPendingConsentSeat(data.error.details?.seatId || selectedSeats[0])
          return
        }
        throw new Error(data.error?.message || 'Seat just taken, please re-pick.')
      }

      setHold(data.grp, data.holdToken, data.holdExpiresAt)
      startHold()
      router.push('/booking/summary')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to hold seats'
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
    const isOccupied =
      entry &&
      (entry.state === 'CONFIRMED' ||
        entry.state === 'BLOCKED' ||
        (entry.state === 'HELD' &&
          entry.holdExpiresAt &&
          entry.holdExpiresAt > now &&
          !passengers.some((p) => p.seatId === seatId && p.id === activePassenger?.id)))

    const isSuggested =
      topSuggestion && !dismissedSuggestion && topSuggestion.seatIds.includes(seatId)

    // Determine status class
    let colorClass = 'open'
    let isLocked = false

    if (isSelected) {
      colorClass = 'is-selected'
    } else if (isOccupied) {
      colorClass = 'taken'
    } else {
      const z = zoneOf(seatId)
      const zg = zoneGender(effectiveMap, z, now)
      const lvl = levelFor(effectiveMap, seatId, activeGender, now, departureTimestamp)

      const oppositeGender: Gender = activeGender === 'F' ? 'M' : 'F'
      const nbrs = neighbours(seatId)

      // Strict Neighbour Check: Male and Female can NEVER be neighbour seats unless Family mode is active
      const hasOppositeNeighbour =
        !family &&
        nbrs.some((nbrId) => {
          const coPax = passengers.find((p) => p.seatId === nbrId && p.id !== activePassenger?.id)
          if (coPax) {
            const coGender: Gender = coPax.gender === 'woman' ? 'F' : 'M'
            return coGender === oppositeGender
          }
          return getActiveSeatGender(effectiveMap[nbrId], now) === oppositeGender
        })

      // Zone check: Non-family passengers of different genders cannot share a zone
      const hasOppositeInZone =
        !family &&
        passengers.some(
          (p) =>
            p.id !== activePassenger?.id &&
            p.seatId &&
            zoneOf(p.seatId) === z &&
            (p.gender === 'woman' ? 'F' : 'M') === oppositeGender
        )

      if (lvl === null || hasOppositeNeighbour || hasOppositeInZone) {
        isLocked = true
        colorClass = 'locked'
      } else if (zg === 'F') {
        colorClass = 'pink'
      } else if (zg === 'M') {
        colorClass = 'blue'
      } else {
        colorClass = 'open'
      }
    }

    const classes = [
      'flow-seat',
      colorClass,
      isSelected ? 'is-selected' : '',
      isSuggested && !isSelected ? 'suggested' : '',
    ]
      .filter(Boolean)
      .join(' ')

    return (
      <button
        key={seatId}
        type="button"
        className={classes}
        onClick={() => chooseSeat(seatId)}
        aria-label={`Seat ${seatId}, ${
          isSelected
            ? `Assigned to ${assignedPassenger?.name || 'passenger'}`
            : isOccupied
            ? 'Taken'
            : isLocked
            ? 'Reserved for opposite gender'
            : 'Available'
        }`}
        aria-pressed={isSelected}
      >
        {isSelected ? (
          <Check size={17} strokeWidth={3} className="text-gray-900" />
        ) : isLocked ? (
          <Lock size={13} className="opacity-60 text-gray-400" />
        ) : null}
      </button>
    )
  }

  return (
    <main className="account-page seats-flow">
      <BookingHeader />

      <section className="booking-shell">
        <div className="booking-intro">
          <p>SEAT SELECTION</p>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h1>Choose your seats</h1>

            {holdTimerSeconds !== null && (
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900 bg-amber-100 px-2.5 py-1 rounded-full border border-amber-300 animate-pulse">
                <Clock size={13} />
                <span>
                  Hold expires in {Math.floor(holdTimerSeconds / 60)}:
                  {(holdTimerSeconds % 60).toString().padStart(2, '0')}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Suggestion Banner */}
        {topSuggestion && !dismissedSuggestion && (
          <aside className="mb-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between gap-3 shadow-sm">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 flex-shrink-0">
                <Sparkles size={16} />
              </div>
              <div>
                <strong className="text-xs font-bold text-emerald-950 block">
                  Best Match: Seats {topSuggestion.seatIds.join(', ')}
                </strong>
                <span className="text-[11px] text-emerald-700">
                  {topSuggestion.reason === 'NEXT_TO_SAME_GENDER' &&
                    'Seated directly next to same-gender passengers'}
                  {topSuggestion.reason === 'FAMILY_BLOCK' &&
                    'Perfect family block leaving no orphan seats'}
                  {topSuggestion.reason === 'SAME_ZONE' &&
                    'Seated together in your reserved zone'}
                  {topSuggestion.reason === 'FRESH_ZONE' &&
                    'Fresh open zone matching your preferences'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                type="button"
                onClick={applySuggestion}
                className="px-3 py-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-sm transition-colors"
              >
                Use suggestion
              </button>
              <button
                type="button"
                onClick={() => setDismissedSuggestion(true)}
                className="p-1.5 text-xs text-gray-500 hover:text-gray-800 rounded"
                aria-label="Dismiss suggestion"
              >
                <X size={15} />
              </button>
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
                const genderLabel = passenger.gender === 'woman' ? 'F' : 'M'
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
                      <small className="opacity-75 font-semibold">({genderLabel})</small>
                    </span>
                    <strong>{passenger.seatId ? `Seat ${passenger.seatId}` : 'Choose seat'}</strong>
                  </button>
                )
              })}
            </div>

            <p className="flow-assignment-hint">
              {activePassenger ? (
                <span>
                  Map is customized for{' '}
                  <b>{activePassenger.name || 'Passenger'}</b> (
                  {activePassenger.gender === 'woman' ? 'Woman' : 'Man'}). Free seats in other
                  gender zones are locked.
                </span>
              ) : (
                'Select a passenger chip above to assign their seat.'
              )}
            </p>
          </div>

          <div className="flow-driver">
            <CircleGauge size={24} aria-hidden="true" />
            <span>Front / Driver</span>
            {loadingPublicMap && (
              <span className="ml-auto flex items-center gap-1 text-xs text-[#F8B018]">
                <Loader2 size={12} className="animate-spin" /> Syncing live map...
              </span>
            )}
          </div>

          {/* Seat Grid: Rows A-J, 2 Left + 3 Right */}
          <div className="flow-seat-map" role="group" aria-label="Choose bus seats">
            <div className="flow-seat-head">
              <span />
              {[1, 2].map((num) => (
                <b key={`left-${num}`}>{num}</b>
              ))}
              <span />
              {[3, 4, 5].map((num) => (
                <b key={`right-${num}`}>{num}</b>
              ))}
            </div>

            {ALL_SEAT_ROWS.map((row) => (
              <div className="flow-seat-row" key={row}>
                <b className="flow-seat-label">{row}</b>
                {renderSeatButton(`${row}1`)}
                {renderSeatButton(`${row}2`)}
                <span className="flow-seat-aisle" aria-hidden="true" />
                {renderSeatButton(`${row}3`)}
                {renderSeatButton(`${row}4`)}
                {renderSeatButton(`${row}5`)}
              </div>
            ))}
          </div>

          {/* Rules Legend */}
          <div className="flow-seat-legend">
            <span>
              <i className="available" style={{ background: '#FFFFFF', borderColor: '#D1D5DB' }} />
              Open
            </span>
            <span>
              <i style={{ background: '#FFF0F6', borderColor: '#F3A2C4' }} />
              Women
            </span>
            <span>
              <i style={{ background: '#EFF6FF', borderColor: '#93C5FD' }} />
              Men
            </span>
            <span>
              <i
                style={{
                  background: '#F3F4F6',
                  borderColor: '#E5E7EB',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Lock size={10} className="text-gray-400" />
              </i>
              Reserved
            </span>
            <span>
              <i style={{ background: '#4B5563', borderColor: '#374151' }} />
              Booked
            </span>
            <span>
              <i style={{ background: '#F8B018', borderColor: '#D97706' }} />
              Selected
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
              ! {error}
            </p>
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

      {/* Level 2 Adjacent Consent Dialog */}
      {pendingConsentSeat && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-gray-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center mb-3">
              <AlertTriangle size={20} />
            </div>

            <h3 className="text-base font-bold text-gray-900 mb-1.5">
              Adjacent Seating Confirmation
            </h3>

            <p className="text-xs text-gray-600 leading-relaxed mb-4">
              All strict same-gender seats have been filled. The remaining seats on this coach are
              adjacent to a {activeGender === 'F' ? 'male' : 'female'} passenger. Would you like to
              proceed with seat <strong>{pendingConsentSeat}</strong>?
            </p>

            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={() => setPendingConsentSeat(null)}
                className="flex-1 py-2 text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Choose another seat
              </button>

              <button
                type="button"
                onClick={() => {
                  setAcceptAdjacent(true)
                  if (activePassenger && pendingConsentSeat) {
                    assignSeat(activePassenger.id, pendingConsentSeat)
                  }
                  setPendingConsentSeat(null)
                  showToast(`Seat ${pendingConsentSeat} selected with consent.`)
                }}
                className="flex-1 py-2 text-xs font-bold text-white bg-[#F8B018] hover:bg-[#e08b00] rounded-lg transition-colors shadow-sm"
              >
                Yes, continue
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
