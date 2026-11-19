'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  ArrowRight,
  Minus,
  Plus,
  ShieldCheck,
  UserCheck,
  Users,
  Sliders,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { useBookingStore, type RiderGender, type PassengerPrefs } from '@/lib/booking-store'
import { todayIST } from '@/lib/time/ist'
import { fetchCurrentProfile } from '@/lib/auth/client-auth'
import { SavedPassenger } from '@/lib/schema/account'
import { getApiAuthHeaders } from '@/lib/firebase/client'
import { getRouteWithCache, formatPickupDisplay, formatDropDisplay } from '@/lib/routes/route-client'
import { Route, resolveRouteId, format12hTime } from '@/lib/types/route'
import { ThemedErrorBanner } from '@/components/ui/ThemedErrorBanner'
import { ThemedDropdown, DropdownOption } from '@/components/ui/ThemedDropdown'

function Header() {
  return (
    <header className="account-header sticky top-0 z-50 bg-white border-b border-gray-200 shadow-xs">
      <Link href="/availability" className="account-back" aria-label="Back to buses">
        <ArrowLeft />
      </Link>
      <span className="page-brand">
        <span className="page-brand-mark">UT</span>
        <span className="page-brand-name">UDAY TRAVELS</span>
      </span>
    </header>
  )
}

function Progress({ active }: { active: number }) {
  return (
    <nav className="booking-progress" aria-label="Booking progress">
      {['Bus', 'Passengers', 'Seats', 'Review', 'Payment'].map((step, index) => (
        <span key={step} className={index <= active ? 'active' : ''}>
          <b>{index + 1}</b>
          {step}
        </span>
      ))}
    </nav>
  )
}

function PassengerCard({
  index,
  name,
  age,
  gender,
  prefs,
  onChange,
  onPrefsChange,
  savedTravellers,
  onPickSaved,
}: {
  index: number
  name: string
  age: string
  gender?: RiderGender
  prefs?: PassengerPrefs
  onChange: (updates: { name?: string; age?: string; gender?: RiderGender }) => void
  onPrefsChange: (prefs: Partial<PassengerPrefs>) => void
  savedTravellers: SavedPassenger[]
  onPickSaved: (saved: SavedPassenger) => void
}) {
  const [showPrefs, setShowPrefs] = useState(false)

  return (
    <fieldset className="passenger-card">
      <legend>Passenger {index + 1}</legend>
      <div className="passenger-card-heading">
        <span>Passenger details</span>
        <small className="text-red-500 font-semibold">* Required</small>
      </div>

      {/* Quick Select from Saved Travellers */}
      {savedTravellers.length > 0 && (
        <div className="mb-3 p-2 bg-amber-50/70 border border-amber-200/70 rounded-md">
          <span className="text-[11px] font-bold text-amber-900 block mb-1.5 flex items-center gap-1">
            <UserCheck size={13} className="text-[#F8B018]" /> Fill from Saved Travellers:
          </span>
          <div className="flex flex-wrap gap-1.5">
            {savedTravellers.map((saved) => (
              <button
                key={saved.id}
                type="button"
                onClick={() => onPickSaved(saved)}
                className="px-2 py-1 text-xs bg-white border border-amber-300 rounded text-gray-800 hover:bg-[#F8B018] hover:text-white transition-colors flex items-center gap-1"
              >
                <span>{saved.name}</span>
                <small className="opacity-75">
                  ({saved.age}, {saved.gender === 'woman' ? 'F' : 'M'})
                </small>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="passenger-row">
        <label className="account-label">
          Name
          <input
            value={name}
            onChange={(event) => onChange({ name: event.target.value })}
            placeholder="As per ID proof"
            required
          />
        </label>
        <label className="account-label">
          Age
          <input
            value={age}
            onChange={(event) => onChange({ age: event.target.value })}
            type="number"
            min="1"
            max="100"
            placeholder="Age"
            required
          />
        </label>
      </div>

      <div className="gender-section">
        <span className="account-label">
          Gender <span className="text-red-500">*</span>
        </span>
        <div className="gender-toggle">
          <button
            type="button"
            className={gender === 'woman' ? 'gender-choice woman selected' : 'gender-choice woman'}
            onClick={() => onChange({ gender: 'woman' })}
            aria-pressed={gender === 'woman'}
          >
            Woman
          </button>
          <button
            type="button"
            className={gender === 'man' ? 'gender-choice man selected' : 'gender-choice man'}
            onClick={() => onChange({ gender: 'man' })}
            aria-pressed={gender === 'man'}
          >
            Man
          </button>
        </div>
      </div>

      {/* Seat Preferences (Window / Aisle & Front / Middle / Rear) */}
      <div className="mt-3 pt-2 border-t border-gray-100">
        <button
          type="button"
          onClick={() => setShowPrefs(!showPrefs)}
          className="text-xs text-[#E89A00] font-semibold flex items-center gap-1.5 hover:underline"
        >
          <Sliders size={13} />
          {showPrefs ? 'Hide seat preferences' : 'Set seat preferences (optional)'}
        </button>

        {showPrefs && (
          <div className="mt-2.5 p-2.5 bg-gray-50 rounded-lg space-y-2 border border-gray-100">
            <div>
              <span className="text-[11px] font-bold text-gray-700 block mb-1">
                Seat Position:
              </span>
              <div className="flex gap-2">
                {[
                  { id: 'any', label: 'Any' },
                  { id: 'window', label: 'Window' },
                  { id: 'aisle', label: 'Aisle' },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() =>
                      onPrefsChange({ seatType: opt.id as 'any' | 'window' | 'aisle' })
                    }
                    className={`px-2.5 py-1 text-xs rounded border transition-colors ${
                      (prefs?.seatType || 'any') === opt.id
                        ? 'bg-[#F8B018] text-white border-[#F8B018] font-bold'
                        : 'bg-white text-gray-700 border-gray-300'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <span className="text-[11px] font-bold text-gray-700 block mb-1">Coach Area:</span>
              <div className="flex flex-wrap gap-2">
                {[
                  { id: 'any', label: 'Any Area' },
                  { id: 'front', label: 'Front (A-C)' },
                  { id: 'middle', label: 'Middle (D-G)' },
                  { id: 'rear', label: 'Rear (H-J)' },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() =>
                      onPrefsChange({ area: opt.id as 'any' | 'front' | 'middle' | 'rear' })
                    }
                    className={`px-2.5 py-1 text-xs rounded border transition-colors ${
                      (prefs?.area || 'any') === opt.id
                        ? 'bg-[#F8B018] text-white border-[#F8B018] font-bold'
                        : 'bg-white text-gray-700 border-gray-300'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </fieldset>
  )
}

export default function PassengersPage() {
  const router = useRouter()
  const {
    passengerCount,
    passengers,
    journey,
    family,
    boarding,
    dropping,
    pickupSnapshot,
    dropSnapshot,
    setJourney,
    setStops,
    setPassengerCount,
    updatePassenger,
    setPassengerPrefs,
    toggleFamily,
  } = useBookingStore()

  const [step, setStep] = useState<'count' | 'details'>('count')
  const [savedTravellers, setSavedTravellers] = useState<SavedPassenger[]>([])
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [saveToProfile, setSaveToProfile] = useState(true)
  const [error, setError] = useState('')
  const [routeData, setRouteData] = useState<Route | null>(null)
  const [loadingRoute, setLoadingRoute] = useState(true)
  const [routeNotAvailable, setRouteNotAvailable] = useState(false)

  // 1. Initialize route points with cache & quota optimization
  useEffect(() => {
    let active = true
    async function loadRouteData() {
      const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null
      const routeParam = journey.routeId || searchParams?.get('route') || journey.from || 'AHM_PUN'
      const toParam = journey.to || (routeParam === 'AHM_PUN' ? 'Pune' : 'Ahilyanagar')
      const canonicalId = resolveRouteId(routeParam, toParam)
      if (!canonicalId) {
        if (active) {
          setRouteNotAvailable(true)
          setLoadingRoute(false)
        }
        return
      }

      setLoadingRoute(true)
      try {
        const route = await getRouteWithCache(canonicalId)
        if (!active) return

        if (!route || !route.active || !route.pickupPoints || route.pickupPoints.length === 0) {
          setRouteData(route)
          setRouteNotAvailable(true)
        } else {
          setRouteData(route)
          setRouteNotAvailable(false)
        }
      } catch (err) {
        console.warn('[PassengersPage] Failed to load route points:', err)
        if (active) setRouteNotAvailable(true)
      } finally {
        if (active) setLoadingRoute(false)
      }
    }

    loadRouteData()
    return () => {
      active = false
    }
  }, [journey.routeId, journey.from, journey.to])

  // 1. Initialize journey parameters from query
  useEffect(() => {
    if (boarding === 'Office · 6:30 AM') {
      setStops('', dropping)
    }
    const searchParams = new URLSearchParams(window.location.search)
    const busName = searchParams.get('busName') || journey.busName
    const route = searchParams.get('route') || journey.routeId || 'AHM_PUN'
    const tripId = searchParams.get('tripId') || searchParams.get('busId') || journey.tripId || ''
    const date = searchParams.get('date') || journey.date || todayIST()
    const from = route === 'AHM_PUN' ? 'Ahilyanagar' : 'Pune'
    const to = route === 'AHM_PUN' ? 'Pune' : 'Ahilyanagar'
    const fare = Number(searchParams.get('fare')) || journey.fare || 200

    if (tripId || busName) {
      setJourney({
        from,
        to,
        routeId: route,
        tripId,
        busId: tripId,
        busName: busName || 'Uday Express',
        date,
        departure: searchParams.get('departure') || journey.departure || '06:00',
        arrival: searchParams.get('arrival') || journey.arrival || '08:45',
        fare,
      })
    }
  }, [
    setJourney,
    journey.busName,
    journey.routeId,
    journey.tripId,
    journey.date,
    journey.departure,
    journey.arrival,
    journey.fare,
  ])

  // 2. Fetch saved passengers if user is logged in
  useEffect(() => {
    async function loadSaved() {
      try {
        const data = await fetchCurrentProfile()
        if (data.profile) {
          setIsLoggedIn(true)
          if (data.savedPassengers && data.savedPassengers.length > 0) {
            setSavedTravellers(data.savedPassengers)
            const firstPassenger = passengers[0]
            if (firstPassenger && !firstPassenger.name && data.savedPassengers[0]) {
              const primary = data.savedPassengers[0]
              updatePassenger(firstPassenger.id, {
                name: primary.name,
                age: String(primary.age),
                gender: primary.gender?.toLowerCase() === 'female' || primary.gender?.toLowerCase() === 'woman' ? 'woman' : 'man',
              })
            }
          }
        }
      } catch (err) {
        console.warn('Saved travellers fetch warning:', err)
      }
    }
    loadSaved()
  }, [])

  const total = passengerCount * journey.fare

  const continueToDetails = () => {
    setError('')
    setStep('details')
  }

  const continueToSeats = async () => {
    // 1. Validation
    if (routeNotAvailable) {
      return setError('Boarding points not available for this route yet.')
    }
    if (!boarding) {
      return setError('Please choose your pick-up boarding point.')
    }
    if (!dropping) {
      return setError('Please choose your dropping destination point.')
    }

    const incomplete = passengers.findIndex(
      (passenger) => !passenger.name.trim() || !passenger.age || !passenger.gender
    )
    if (incomplete >= 0) {
      return setError(
        `Please complete Passenger ${incomplete + 1} details (name, age, and gender are strictly required).`
      )
    }

    // 2. Auto-save new travellers to Firestore if user is logged in
    if (isLoggedIn && saveToProfile) {
      try {
        const headers = await getApiAuthHeaders()
        for (const p of passengers) {
          const alreadySaved = savedTravellers.some(
            (s) => s.name.toLowerCase() === p.name.trim().toLowerCase()
          )
          if (!alreadySaved) {
            fetch('/api/account/passengers', {
              method: 'POST',
              headers,
              body: JSON.stringify({
                name: p.name.trim(),
                age: Number(p.age),
                gender: p.gender === 'woman' ? 'woman' : 'man',
              }),
            }).catch(() => {})
          }
        }
      } catch {}
    }

    const route = journey.routeId || 'AHM_PUN'
    const date = journey.date || todayIST()
    const tripId = journey.tripId || ''
    router.push(`/seats?route=${route}&date=${date}&tripId=${tripId}`)
  }

  return (
    <main className="account-page booking-page">
      <Header />
      <Progress active={1} />

      <section className="booking-shell">
        <div className="booking-intro">
          <h1 className="text-base sm:text-lg font-bold text-gray-900 tracking-tight">Passenger Details</h1>
        </div>

        {step === 'count' ? (
          <section className="profile-card count-card">
            <div className="count-row">
              <div>
                <span className="account-label">Adults / Travellers</span>
              </div>
              <div className="quantity-control">
                <button
                  type="button"
                  onClick={() => setPassengerCount(passengerCount - 1)}
                  disabled={passengerCount <= 1}
                  aria-label="Remove passenger"
                >
                  <Minus size={20} strokeWidth={3} />
                </button>
                <strong>{passengerCount}</strong>
                <button
                  type="button"
                  onClick={() => setPassengerCount(passengerCount + 1)}
                  disabled={passengerCount >= 6}
                  aria-label="Add passenger"
                >
                  <Plus size={20} strokeWidth={3} />
                </button>
              </div>
            </div>

            <div className="fare-card">
              <span>
                Total fare ({passengerCount} passenger{passengerCount > 1 ? 's' : ''})
              </span>
              <strong>₹{total}</strong>
            </div>

            <button className="account-primary" onClick={continueToDetails}>
              Continue to passenger details <ArrowRight size={17} />
            </button>
          </section>
        ) : (
          <form
            className="passenger-form"
            onSubmit={(event) => {
              event.preventDefault()
              continueToSeats()
            }}
          >
            {/* STOPS SELECTION */}
            <section className="profile-card location-card">
              <div className="profile-card-title">
                <div>
                  <ShieldCheck size={20} />
                  <h2>Choose your stops</h2>
                </div>
                <span>Required</span>
              </div>

              {loadingRoute ? (
                <div className="py-4 text-center text-sm text-gray-500">
                  Loading stops for route...
                </div>
              ) : routeNotAvailable ? (
                <div className="p-4 bg-amber-50 border border-amber-300 rounded-lg text-amber-900">
                  <p className="font-semibold text-sm">Boarding points not available for this route yet</p>
                  <p className="text-xs text-amber-700 mt-1">
                    Please select an active route with scheduled stops, or contact support.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <ThemedDropdown
                    id="pickup-select"
                    label={`Pick-up point (${journey.from})`}
                    placeholder="Select pickup point"
                    value={pickupSnapshot?.pointId || ''}
                    required
                    options={(routeData?.pickupPoints || [])
                      .filter((p) => p.active !== false)
                      .sort((a, b) => a.sequence - b.sequence)
                      .map((point) => ({
                        value: point.id,
                        label: point.name,
                        subLabel: format12hTime(point.pickupTime),
                      }))}
                    onChange={(selectedId) => {
                      const p = (routeData?.pickupPoints || []).find((item) => item.id === selectedId)
                      if (p) {
                        setStops(
                          formatPickupDisplay(p),
                          dropping,
                          { pointId: p.id, name: p.name, pickupTime: p.pickupTime },
                          dropSnapshot
                        )
                      } else {
                        setStops('', dropping, null, dropSnapshot)
                      }
                    }}
                  />

                  <ThemedDropdown
                    id="drop-select"
                    label={`Drop point (${journey.to})`}
                    placeholder="Select drop point"
                    value={dropSnapshot?.pointId || ''}
                    required
                    options={(routeData?.dropPoints || [])
                      .filter((d) => d.active !== false)
                      .sort((a, b) => a.sequence - b.sequence)
                      .map((point) => ({
                        value: point.id,
                        label: point.name,
                      }))}
                    onChange={(selectedId) => {
                      const d = (routeData?.dropPoints || []).find((item) => item.id === selectedId)
                      if (d) {
                        setStops(
                          boarding,
                          formatDropDisplay(d),
                          pickupSnapshot,
                          { pointId: d.id, name: d.name }
                        )
                      } else {
                        setStops(boarding, '', pickupSnapshot, null)
                      }
                    }}
                  />
                </div>
              )}
            </section>

            {/* PASSENGERS LIST */}
            <section className="profile-card">
              <div className="profile-card-title">
                <div>
                  <Users size={20} />
                  <h2>
                    {passengerCount} passenger{passengerCount > 1 ? 's' : ''}
                  </h2>
                </div>
                <span>₹{total} total</span>
              </div>

              {passengers.map((passenger, index) => (
                <PassengerCard
                  key={passenger.id}
                  index={index}
                  name={passenger.name}
                  age={passenger.age}
                  gender={passenger.gender}
                  prefs={passenger.prefs}
                  onChange={(updates) => updatePassenger(passenger.id, updates)}
                  onPrefsChange={(p) => setPassengerPrefs(passenger.id, p)}
                  savedTravellers={savedTravellers}
                  onPickSaved={(saved) => {
                    updatePassenger(passenger.id, {
                      name: saved.name,
                      age: String(saved.age),
                      gender: saved.gender?.toLowerCase() === 'female' || saved.gender?.toLowerCase() === 'woman' ? 'woman' : 'man',
                    })
                  }}
                />
              ))}

              <div className="pt-2 space-y-2">
                {passengerCount >= 2 && (
                  <label className="family-option">
                    <input type="checkbox" checked={family} onChange={toggleFamily} />
                    We&apos;re travelling together
                    <small>Helps suggest contiguous seats together</small>
                  </label>
                )}

                {isLoggedIn && (
                  <label className="family-option">
                    <input
                      type="checkbox"
                      checked={saveToProfile}
                      onChange={(e) => setSaveToProfile(e.target.checked)}
                    />
                    Save travellers to profile? <span>Auto-save to Firebase</span>
                    <small>Saves entered passengers for fast future bookings</small>
                  </label>
                )}
              </div>
            </section>

            {error && (
              <div className="my-3">
                <ThemedErrorBanner
                  title="Required Details"
                  message={error}
                  onDismiss={() => setError('')}
                  variant="warning"
                />
              </div>
            )}

            <button
              className="account-primary"
              type="submit"
              disabled={routeNotAvailable || loadingRoute}
            >
              {routeNotAvailable ? 'Stops Not Available' : 'Continue to seat selection'} <ArrowRight size={17} />
            </button>
          </form>
        )}
      </section>
    </main>
  )
}
