'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  ArrowRight,
  Minus,
  Plus,
  ShieldCheck,
  User,
  UserCheck,
  Users,
  Check,
  MapPin,
  Calendar,
  Clock,
  Sparkles,
  Menu,
  UserRound,
} from 'lucide-react'
import { useEffect, useState, useMemo } from 'react'
import { useBookingStore, type RiderGender, type PassengerPrefs } from '@/lib/booking-store'
import { todayIST } from '@/lib/time/ist'
import { fetchCurrentProfile, subscribeToAuth, signOutUser } from '@/lib/auth/client-auth'
import { SavedPassenger, UserProfile } from '@/lib/schema/account'
import { getApiAuthHeaders } from '@/lib/firebase/client'
import {
  getRouteWithCache,
  formatPickupDisplay,
  formatDropDisplay,
  getAdjustedPickupTime,
} from '@/lib/routes/route-client'
import { Route, resolveRouteId, format12hTime } from '@/lib/types/route'
import { ThemedErrorBanner } from '@/components/ui/ThemedErrorBanner'
import { ThemedDropdown } from '@/components/ui/ThemedDropdown'
import NavDrawer from '@/components/navigation/NavDrawer'

function Header({ onMenu }: { onMenu?: () => void }) {
  return (
    <header className="availability-header account-header sticky top-0 z-50 bg-white border-b border-gray-200 shadow-xs flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Link href="/availability" className="account-back" aria-label="Back to buses">
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
  userProfile,
  onPickProfile,
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
  userProfile?: UserProfile | null
  onPickProfile?: () => void
  savedTravellers: SavedPassenger[]
  onPickSaved: (saved: SavedPassenger) => void
}) {
  // Deduplicate and combine into single 1-click option per person (no duplicate profile/self)
  // Available for Passenger 1 and all passengers below from saved travellers
  const quickTravellers = useMemo(() => {
    const list: Array<{
      id: string
      name: string
      age: number | string
      gender?: string
      isSelf: boolean
      isProfile: boolean
    }> = []

    if (userProfile?.name) {
      list.push({
        id: 'profile_self',
        name: userProfile.name,
        age: userProfile.age,
        gender: userProfile.gender,
        isSelf: true,
        isProfile: true,
      })
    }

    savedTravellers.forEach((saved) => {
      const isProfileMatch =
        userProfile?.name &&
        saved.name.trim().toLowerCase() === userProfile.name.trim().toLowerCase()

      if (saved.isSelf || isProfileMatch) {
        if (list.length === 0) {
          list.push({
            id: saved.id,
            name: saved.name,
            age: saved.age,
            gender: saved.gender,
            isSelf: true,
            isProfile: false,
          })
        }
      } else {
        list.push({
          id: saved.id,
          name: saved.name,
          age: saved.age,
          gender: saved.gender,
          isSelf: false,
          isProfile: false,
        })
      }
    })

    return list
  }, [index, userProfile, savedTravellers])

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs mb-4 hover:border-slate-300 transition-all">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 mb-3.5 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center text-xs font-black">
            {index + 1}
          </div>
          <h3 className="text-sm font-bold text-slate-900">Passenger {index + 1}</h3>
          {index === 0 && (
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded-full">
              Primary
            </span>
          )}
        </div>
        <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1">
          <span className="text-rose-500 font-bold">*</span> Required
        </span>
      </div>

      {/* Quick Select: Single Unified 1-Click Fill Option (available for Passenger 1 and all travellers below) */}
      {quickTravellers.length > 0 && (
        <div className="mb-3.5 p-2.5 sm:p-3 bg-amber-50/60 border border-amber-200/80 rounded-xl">
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-1.5">
              <UserCheck size={13} className="text-amber-600" />
              <span className="text-[11px] font-black text-amber-950 uppercase tracking-wider">
                1-Click Auto Fill:
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {quickTravellers.map((traveller) => {
              const isSelected = name.trim().toLowerCase() === traveller.name.trim().toLowerCase()
              return (
                <button
                  key={traveller.id}
                  type="button"
                  onClick={() => {
                    if (traveller.isProfile && onPickProfile) {
                      onPickProfile()
                    } else {
                      onPickSaved({
                        id: traveller.id,
                        name: traveller.name,
                        age: Number(traveller.age) || 30,
                        gender:
                          traveller.gender?.toLowerCase() === 'female' ||
                          traveller.gender?.toLowerCase() === 'woman'
                            ? 'Female'
                            : 'Male',
                        isSelf: traveller.isSelf,
                      })
                    }
                  }}
                  title={`Fill with ${traveller.name}`}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-xl border transition-all cursor-pointer shadow-2xs active:scale-95 ${
                    isSelected
                      ? 'bg-amber-500 text-white border-amber-500 ring-2 ring-amber-400/30 font-bold shadow-xs'
                      : 'bg-white hover:bg-amber-100/60 text-slate-800 border-amber-200 hover:border-amber-300 font-semibold'
                  }`}
                >
                  <User size={13} className={isSelected ? 'text-white' : 'text-amber-600'} />
                  <span className="font-bold">{traveller.name}</span>
                  <span className="text-[11px] opacity-80 font-normal">
                    ({traveller.age}y, {traveller.gender === 'woman' || traveller.gender?.toLowerCase() === 'female' ? 'F' : 'M'})
                  </span>
                  {traveller.isSelf && (
                    <span
                      className={`text-[9px] uppercase font-black px-1.5 py-0.5 rounded-md tracking-wider ${
                        isSelected ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-900'
                      }`}
                    >
                      Self
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Inputs: Name & Age */}
      <div className="grid grid-cols-[1fr_96px] sm:grid-cols-[1fr_110px] gap-3 mb-3.5">
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            Name <span className="text-rose-500">*</span>
          </label>
          <input
            value={name}
            onChange={(event) => onChange({ name: event.target.value })}
            placeholder="As per ID proof"
            required
            className="w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 text-sm font-semibold text-slate-900 placeholder:text-slate-400 placeholder:font-normal outline-none transition-all"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            Age <span className="text-rose-500">*</span>
          </label>
          <input
            value={age}
            onChange={(event) => onChange({ age: event.target.value })}
            type="number"
            min="1"
            max="100"
            placeholder="Age"
            required
            className="w-full h-11 px-3 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 text-sm font-semibold text-slate-900 placeholder:text-slate-400 placeholder:font-normal outline-none transition-all text-center"
          />
        </div>
      </div>

      {/* Gender Selection */}
      <div className="mb-3.5">
        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
          Gender <span className="text-rose-500">*</span>
        </label>
        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={() => onChange({ gender: 'woman' })}
            aria-pressed={gender === 'woman'}
            className={`h-11 rounded-xl font-bold text-sm flex items-center justify-center transition-all cursor-pointer border ${
              gender === 'woman'
                ? 'bg-rose-50/90 border-rose-400 text-rose-700 ring-2 ring-rose-400/30 shadow-2xs font-extrabold'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300'
            }`}
          >
            Woman
          </button>
          <button
            type="button"
            onClick={() => onChange({ gender: 'man' })}
            aria-pressed={gender === 'man'}
            className={`h-11 rounded-xl font-bold text-sm flex items-center justify-center transition-all cursor-pointer border ${
              gender === 'man'
                ? 'bg-amber-50/90 border-amber-500 text-amber-950 ring-2 ring-amber-400/30 shadow-2xs font-extrabold'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300'
            }`}
          >
            Man
          </button>
        </div>
      </div>
    </div>
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

  const [step, setStep] = useState<'count' | 'details'>('details')
  const [savedTravellers, setSavedTravellers] = useState<SavedPassenger[]>([])

  // Ensure we always have exact cards matching passengerCount
  const effectivePassengers = useMemo(() => {
    const count = Math.max(1, Math.min(6, passengerCount || 1))
    const list = [...passengers]
    while (list.length < count) {
      list.push({
        id: `passenger-${list.length + 1}`,
        name: '',
        age: '',
        prefs: { seatType: 'any', area: 'any' },
      })
    }
    return list.slice(0, count)
  }, [passengers, passengerCount])
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [saveToProfile, setSaveToProfile] = useState(false)
  const [error, setError] = useState('')
  const [routeData, setRouteData] = useState<Route | null>(null)
  const [loadingRoute, setLoadingRoute] = useState(true)
  const [routeNotAvailable, setRouteNotAvailable] = useState(false)
  const [sheet, setSheet] = useState(false)
  const [currentUser, setCurrentUser] = useState<any>(null)

  useEffect(() => {
    const unsub = subscribeToAuth((user) => {
      setCurrentUser(user)
    })
    return () => unsub()
  }, [])

  const handleLogout = async () => {
    await signOutUser()
    setCurrentUser(null)
    setUserProfile(null)
    setIsLoggedIn(false)
    setSheet(false)
  }

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
      } catch {
        // Safe catch for route points load
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
    const countParam = Number(searchParams.get('count'))
    if (countParam && countParam > 0 && countParam <= 6) {
      setPassengerCount(countParam)
    }
    setStep('details')

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

  // 2. Fetch profile info and saved passengers, and synchronize with logged in account
  useEffect(() => {
    let active = true

    async function syncProfile() {
      try {
        const data = await fetchCurrentProfile()
        if (!active) return

        if (data.profile) {
          setIsLoggedIn(true)
          setUserProfile(data.profile)

          if (data.savedPassengers && data.savedPassengers.length > 0) {
            setSavedTravellers(data.savedPassengers)
          } else {
            setSavedTravellers([])
          }

          const normalizedGender =
            data.profile.gender === 'woman' ||
            data.profile.gender?.toLowerCase() === 'female'
              ? 'woman'
              : 'man'

          const store = useBookingStore.getState()
          const p1 = store.passengers[0]
          const lastSyncedMobile =
            typeof window !== 'undefined'
              ? localStorage.getItem('uday_last_synced_pax_mobile')
              : null
          const lastSyncedUid =
            typeof window !== 'undefined'
              ? localStorage.getItem('uday_last_synced_account_uid')
              : null
          const isDifferentAccount = Boolean(
            (lastSyncedMobile &&
              data.profile.mobile &&
              lastSyncedMobile !== data.profile.mobile) ||
            (lastSyncedUid &&
              data.profile.uid &&
              lastSyncedUid !== data.profile.uid)
          )

          const isAccountChanged =
            isDifferentAccount ||
            !lastSyncedMobile ||
            (p1 && p1.name.trim().toLowerCase() !== data.profile.name.trim().toLowerCase())

          if (p1) {
            const needsUpdate =
              isAccountChanged ||
              !p1.name.trim()

            if (needsUpdate) {
              store.updatePassenger(p1.id, {
                name: data.profile.name,
                age: String(data.profile.age || 28),
                gender: normalizedGender,
              })
              if (typeof window !== 'undefined') {
                if (data.profile.mobile) {
                  localStorage.setItem(
                    'uday_last_synced_pax_mobile',
                    data.profile.mobile
                  )
                }
                if (data.profile.uid) {
                  localStorage.setItem(
                    'uday_last_synced_account_uid',
                    data.profile.uid
                  )
                }
              }

              // When a new account is created or switched:
              // Reset all companion passengers (Passenger 2+) to blank so the user can input new info!
              if (store.passengers.length > 1) {
                for (let i = 1; i < store.passengers.length; i++) {
                  const p = store.passengers[i]
                  if (p) {
                    store.updatePassenger(p.id, {
                      name: '',
                      age: '',
                      gender: undefined,
                    })
                  }
                }
              }
            }
          }

          // Ensure companion passengers (Passenger 2+) are never populated with duplicate single passenger SELF profile
          if (store.passengers.length > 1) {
            for (let i = 1; i < store.passengers.length; i++) {
              const p = store.passengers[i]
              if (
                p &&
                p.name.trim().toLowerCase() === data.profile.name.trim().toLowerCase() &&
                p.age === String(data.profile.age)
              ) {
                store.updatePassenger(p.id, {
                  name: '',
                  age: '',
                  gender: undefined,
                })
              }
            }
          }
        } else {
          setIsLoggedIn(false)
          setUserProfile(null)
          setSavedTravellers([])
        }
      } catch {
        // Safe catch for saved travellers fetch
      }
    }

    syncProfile()

    // Listen for real-time auth changes or account switches
    const unsubAuth = subscribeToAuth(() => {
      syncProfile()
    })

    return () => {
      active = false
      unsubAuth()
    }
  }, [])

  const total = passengerCount * journey.fare

  const continueToDetails = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }
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
    <main className="account-page booking-page min-h-screen bg-slate-50 text-slate-900 pb-20">
      <Header onMenu={() => setSheet((prev) => !prev)} />
      <Progress active={1} />

      <section className="booking-shell max-w-xl lg:max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
        {/* Journey Summary Strip */}
        <div className="mb-4 p-4 bg-white border border-slate-200/90 rounded-2xl shadow-2xs flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-amber-600 uppercase tracking-wider">
              <span>{journey.busName || 'Uday Express'}</span>
            </div>
            <div className="text-base font-extrabold text-slate-900 mt-0.5 tracking-tight">
              {journey.from || 'Ahilyanagar'} → {journey.to || 'Pune'}
            </div>
            <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 font-medium">
              <span className="flex items-center gap-1">
                <Clock size={12} className="text-slate-400" />
                {journey.departure || '06:00'}
              </span>
              <span className="flex items-center gap-1">
                <Calendar size={12} className="text-slate-400" />
                {journey.date || todayIST()}
              </span>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[11px] font-semibold text-slate-400 block uppercase tracking-wider">Fare</span>
            <span className="text-base font-black text-amber-600">₹{journey.fare || 200}</span>
            <span className="text-[11px] text-slate-400 block font-normal">/ seat</span>
          </div>
        </div>

        <div className="mb-4">
          <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">
            {step === 'count' ? 'Select Travellers' : 'Passenger Details'}
          </h1>
        </div>

        {step === 'count' ? (
          <section className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col gap-5">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-bold text-slate-900 block">Adults / Travellers</span>
                <span className="text-xs text-slate-500 block mt-0.5">Select number of passengers (max 6)</span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setPassengerCount(passengerCount - 1)}
                  disabled={passengerCount <= 1}
                  aria-label="Remove passenger"
                  className="w-11 h-11 rounded-xl border-2 border-amber-500 bg-amber-50 text-amber-600 hover:bg-amber-100 active:scale-95 transition-all flex items-center justify-center font-bold disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  <Minus size={18} strokeWidth={3} />
                </button>
                <strong className="text-xl font-extrabold text-slate-900 min-w-8 text-center">
                  {passengerCount}
                </strong>
                <button
                  type="button"
                  onClick={() => setPassengerCount(passengerCount + 1)}
                  disabled={passengerCount >= 6}
                  aria-label="Add passenger"
                  className="w-11 h-11 rounded-xl border-2 border-amber-500 bg-amber-50 text-amber-600 hover:bg-amber-100 active:scale-95 transition-all flex items-center justify-center font-bold disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  <Plus size={18} strokeWidth={3} />
                </button>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <span className="text-sm font-medium text-slate-600">
                Total fare ({passengerCount} passenger{passengerCount > 1 ? 's' : ''})
              </span>
              <strong className="text-xl font-extrabold text-amber-600">₹{total}</strong>
            </div>

            <button
              className="w-full min-h-[50px] rounded-xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white font-extrabold text-sm tracking-wide shadow-xs hover:shadow active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer"
              onClick={continueToDetails}
            >
              <span>Continue to passenger details</span>
              <ArrowRight size={17} />
            </button>
          </section>
        ) : (
          <form
            className="flex flex-col gap-4"
            onSubmit={(event) => {
              event.preventDefault()
              continueToSeats()
            }}
          >
            {/* STOPS SELECTION */}
            <section className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs">
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
                <div className="flex items-center gap-2 text-slate-900">
                  <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center">
                    <MapPin size={16} />
                  </div>
                  <h2 className="text-sm font-bold text-slate-900">Choose your stops</h2>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded-full">
                  Required
                </span>
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
                      .map((point) => {
                        const routeBase = routeData?.pickupPoints?.[0]?.pickupTime
                        const adjusted = getAdjustedPickupTime(
                          point.pickupTime,
                          journey.departure,
                          routeBase
                        )
                        return {
                          value: point.id,
                          label: point.name,
                          subLabel: format12hTime(adjusted),
                        }
                      })}
                    onChange={(selectedId) => {
                      const p = (routeData?.pickupPoints || []).find((item) => item.id === selectedId)
                      if (p) {
                        const routeBase = routeData?.pickupPoints?.[0]?.pickupTime
                        const adjusted = getAdjustedPickupTime(
                          p.pickupTime,
                          journey.departure,
                          routeBase
                        )
                        setStops(
                          formatPickupDisplay(p, journey.departure, routeBase),
                          dropping,
                          { pointId: p.id, name: p.name, pickupTime: adjusted },
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
            <section className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs">
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
                <div className="flex items-center gap-2 text-slate-900">
                  <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center">
                    <Users size={16} />
                  </div>
                  <h2 className="text-sm font-bold text-slate-900">
                    {passengerCount} Passenger{passengerCount > 1 ? 's' : ''}
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setStep('count')}
                    className="text-xs font-semibold text-slate-500 hover:text-amber-600 underline cursor-pointer"
                  >
                    Change
                  </button>
                </div>
              </div>

              {effectivePassengers.map((passenger, index) => (
                <PassengerCard
                  key={passenger.id || `passenger-${index + 1}`}
                  index={index}
                  name={passenger.name}
                  age={passenger.age}
                  gender={passenger.gender}
                  prefs={passenger.prefs}
                  onChange={(updates) => updatePassenger(passenger.id, updates)}
                  onPrefsChange={(p) => setPassengerPrefs(passenger.id, p)}
                  userProfile={userProfile}
                  onPickProfile={() => {
                    if (userProfile) {
                      const normalizedGender =
                        userProfile.gender === 'woman' ||
                        userProfile.gender?.toLowerCase() === 'female'
                          ? 'woman'
                          : 'man'
                      updatePassenger(passenger.id, {
                        name: userProfile.name,
                        age: String(userProfile.age),
                        gender: normalizedGender,
                      })
                    }
                  }}
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

              {/* Booking Options: Travelling Together & Save Travellers */}
              <div className="pt-2 space-y-2.5">
                {passengerCount >= 2 && (
                  <div
                    role="checkbox"
                    aria-checked={family}
                    tabIndex={0}
                    onClick={toggleFamily}
                    onKeyDown={(e) => {
                      if (e.key === ' ' || e.key === 'Enter') {
                        e.preventDefault()
                        toggleFamily()
                      }
                    }}
                    className={`w-full flex items-start gap-3.5 p-3.5 rounded-xl border transition-all cursor-pointer select-none group ${
                      family
                        ? 'border-amber-400 bg-amber-50/40 shadow-2xs'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div
                      className={`mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center flex-shrink-0 transition-all ${
                        family
                          ? 'bg-amber-500 border-amber-500 text-white shadow-2xs'
                          : 'border-slate-300 bg-white group-hover:border-amber-400'
                      }`}
                    >
                      {family && <Check size={13} strokeWidth={3} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-bold text-slate-900 block leading-tight">
                        We&apos;re travelling together
                      </span>
                      <span className="text-xs text-slate-500 block mt-1 leading-snug">
                        Helps suggest contiguous seats together
                      </span>
                    </div>
                  </div>
                )}

                {isLoggedIn && (
                  <div
                    role="checkbox"
                    aria-checked={saveToProfile}
                    tabIndex={0}
                    onClick={() => setSaveToProfile(!saveToProfile)}
                    onKeyDown={(e) => {
                      if (e.key === ' ' || e.key === 'Enter') {
                        e.preventDefault()
                        setSaveToProfile(!saveToProfile)
                      }
                    }}
                    className={`w-full flex items-start gap-3.5 p-3.5 rounded-xl border transition-all cursor-pointer select-none group ${
                      saveToProfile
                        ? 'border-amber-400 bg-amber-50/40 shadow-2xs'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div
                      className={`mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center flex-shrink-0 transition-all ${
                        saveToProfile
                          ? 'bg-amber-500 border-amber-500 text-white shadow-2xs'
                          : 'border-slate-300 bg-white group-hover:border-amber-400'
                      }`}
                    >
                      {saveToProfile && <Check size={13} strokeWidth={3} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-900 leading-tight">
                          Save travellers to profile?
                        </span>
                        <span className="text-[10px] font-bold tracking-wider uppercase text-amber-800 bg-amber-100/90 px-2 py-0.5 rounded-full">
                          Auto-save
                        </span>
                      </div>
                      <span className="text-xs text-slate-500 block mt-1 leading-snug">
                        Saves entered passengers for fast future bookings
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </section>

            {error && (
              <div className="my-1">
                <ThemedErrorBanner
                  title="Required Details"
                  message={error}
                  onDismiss={() => setError('')}
                  variant="warning"
                />
              </div>
            )}

            <button
              className="w-full min-h-[50px] rounded-xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white font-extrabold text-sm tracking-wide shadow-xs hover:shadow active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              type="submit"
              disabled={routeNotAvailable || loadingRoute}
            >
              <span>{routeNotAvailable ? 'Stops Not Available' : `Continue to select ${passengerCount > 1 ? `${passengerCount} seats` : 'seat'}`}</span>
              <ArrowRight size={17} />
            </button>
          </form>
        )}
      </section>

      <footer className="text-center text-xs text-gray-500 py-6">
        Need help? Call Uday Travels Support at{' '}
        <a href="tel:+919890066580" className="font-semibold text-amber-700 hover:underline">
          +91 98900 66580
        </a>
      </footer>

      {/* Navigation Drawer in Light Theme matching Brand Standard */}
      <NavDrawer
        open={sheet}
        onClose={() => setSheet(false)}
        currentUser={currentUser}
        userName={userProfile?.name || ''}
        userPhone={userProfile?.mobile || ''}
        onLogout={handleLogout}
        theme="light"
      />
    </main>
  )
}
