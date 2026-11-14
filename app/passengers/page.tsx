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
  Sparkles,
  BookmarkCheck,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { useBookingStore, type RiderGender } from '@/lib/booking-store'
import { todayIST } from '@/lib/time/ist'
import { fetchCurrentProfile } from '@/lib/auth/client-auth'
import { SavedPassenger } from '@/lib/schema/account'
import { getApiAuthHeaders } from '@/lib/firebase/client'

const pickupPoints = [
  'Office',
  'Ekvira Chowk',
  'Yashodha Nagar',
  'HDFC Bank',
  'Vaani Nagar',
  'Petrol Pump',
  'Bhistbag Chowk',
  'Balaji Kaman',
  'Sona Nagar Chowk',
  'Professor Chowk',
  'Premdan Chowk',
  'Zopadi Canteen',
  'Sarda College',
  'Delhigate',
  'Nepti Naka Chowk',
  'Swastik Chowk',
  'Vinayak Nagar',
  'Kinetic Chowk',
  'Rangoli Hotel',
  'Ambika Nagar Stop',
]

const dropPoints = [
  'Wakadewadi',
  'Sangamwadi',
  'Yerwada',
  'Shastri Nagar',
  'Ramwadi Naka',
  'Four Points',
  'Wadgaonsheri',
  'Viman Nagar',
  'Chandan Nagar',
  'Tata Guard Room',
  'Kharadi Bye Pass',
  'Wagholi',
]

function Header() {
  return (
    <header className="account-header">
      <Link href="/availability" className="account-back" aria-label="Back to buses">
        <ArrowLeft />
      </Link>
      <span className="page-brand">
        <span className="page-brand-mark">UT</span>
        <span className="page-brand-name">UDAY TRAVELS</span>
      </span>
      <span className="step-chip">2 / 5</span>
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
  onChange,
  savedTravellers,
  onPickSaved,
}: {
  index: number
  name: string
  age: string
  gender?: RiderGender
  onChange: (updates: { name?: string; age?: string; gender?: RiderGender }) => void
  savedTravellers: SavedPassenger[]
  onPickSaved: (saved: SavedPassenger) => void
}) {
  return (
    <fieldset className="passenger-card">
      <legend>Passenger {index + 1}</legend>
      <div className="passenger-card-heading">
        <span>Passenger details</span>
        <small>Required</small>
      </div>

      {/* Quick Select from Saved Travellers */}
      {savedTravellers.length > 0 && (
        <div className="mb-3 p-2 bg-amber-50/70 border border-amber-200/70 rounded-md">
          <span className="text-[11px] font-bold text-amber-900 block mb-1.5 flex items-center gap-1">
            <UserCheck size={13} className="text-[#FF9D00]" /> Fill from Saved Travellers:
          </span>
          <div className="flex flex-wrap gap-1.5">
            {savedTravellers.map((saved) => (
              <button
                key={saved.id}
                type="button"
                onClick={() => onPickSaved(saved)}
                className="px-2 py-1 text-xs bg-white border border-amber-300 rounded text-gray-800 hover:bg-[#FF9D00] hover:text-white transition-colors flex items-center gap-1"
              >
                <span>{saved.name}</span>
                <small className="opacity-75">({saved.age}, {saved.gender === 'woman' ? 'F' : 'M'})</small>
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
          />
        </label>
      </div>
      <div className="gender-section">
        <span className="account-label">Gender</span>
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
    setJourney,
    setStops,
    setPassengerCount,
    updatePassenger,
    toggleFamily,
  } = useBookingStore()

  const [step, setStep] = useState<'count' | 'details'>('count')
  const [savedTravellers, setSavedTravellers] = useState<SavedPassenger[]>([])
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [saveToProfile, setSaveToProfile] = useState(true)
  const [error, setError] = useState('')

  // 1. Initialize journey parameters from query
  useEffect(() => {
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
  }, [setJourney, journey.busName, journey.routeId, journey.tripId, journey.date, journey.departure, journey.arrival, journey.fare])

  // 2. Fetch saved passengers if user is logged in
  useEffect(() => {
    async function loadSaved() {
      try {
        const data = await fetchCurrentProfile()
        if (data.profile) {
          setIsLoggedIn(true)
          if (data.savedPassengers && data.savedPassengers.length > 0) {
            setSavedTravellers(data.savedPassengers)
            // Pre-fill Passenger 1 with primary user profile if passenger 1 is currently empty
            const firstPassenger = passengers[0]
            if (firstPassenger && !firstPassenger.name && data.savedPassengers[0]) {
              const primary = data.savedPassengers[0]
              updatePassenger(firstPassenger.id, {
                name: primary.name,
                age: String(primary.age),
                gender: primary.gender,
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
      return setError(`Please complete Passenger ${incomplete + 1} details.`)
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
      <Progress active={step === 'count' ? 1 : 1} />

      <section className="booking-shell">
        <div className="booking-intro">
          <p>PASSENGER DETAILS</p>
          <h1>{step === 'count' ? 'How many passengers are travelling?' : 'Who is travelling?'}</h1>
          <small>
            {journey.busName} · {journey.from} → {journey.to}
          </small>
        </div>

        {step === 'count' ? (
          <section className="profile-card count-card">
            <div className="count-row">
              <div>
                <span className="account-label">Adults / Travellers</span>
                <small>₹{journey.fare} per passenger</small>
              </div>
              <div className="quantity-control">
                <button
                  type="button"
                  onClick={() => setPassengerCount(passengerCount - 1)}
                  disabled={passengerCount <= 1}
                  aria-label="Remove passenger"
                >
                  <Minus size={18} />
                </button>
                <strong>{passengerCount}</strong>
                <button
                  type="button"
                  onClick={() => setPassengerCount(passengerCount + 1)}
                  disabled={passengerCount >= 6}
                  aria-label="Add passenger"
                >
                  <Plus size={18} />
                </button>
              </div>
            </div>

            <div className="fare-card">
              <span>Total fare ({passengerCount} passenger{passengerCount > 1 ? 's' : ''})</span>
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

              <label className="account-label">
                Pick-up point ({journey.from})
                <select
                  value={boarding}
                  onChange={(event) => setStops(event.target.value, dropping)}
                  required
                >
                  <option value="">Select pick-up point</option>
                  {pickupPoints.map((point, index) => (
                    <option
                      key={point}
                      value={`${point} · ${
                        index < 6
                          ? '6:30 AM'
                          : index < 7
                          ? '6:35 AM'
                          : index < 10
                          ? '6:40 AM'
                          : index < 14
                          ? '6:45 AM'
                          : index < 15
                          ? '6:50 AM'
                          : index < 16
                          ? '7:00 AM'
                          : '7:05 AM'
                      }`}
                    >
                      {point} ·{' '}
                      {index < 6
                        ? '6:30 AM'
                        : index < 7
                        ? '6:35 AM'
                        : index < 10
                        ? '6:40 AM'
                        : index < 14
                        ? '6:45 AM'
                        : index < 15
                        ? '6:50 AM'
                        : index < 16
                        ? '7:00 AM'
                        : '7:05 AM'}
                    </option>
                  ))}
                </select>
              </label>

              <label className="account-label">
                Drop point ({journey.to})
                <select
                  value={dropping}
                  onChange={(event) => setStops(boarding, event.target.value)}
                  required
                >
                  <option value="">Select drop point</option>
                  {dropPoints.map((point) => (
                    <option key={point} value={point}>
                      {point}
                    </option>
                  ))}
                </select>
              </label>
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
                  onChange={(updates) => updatePassenger(passenger.id, updates)}
                  savedTravellers={savedTravellers}
                  onPickSaved={(saved) => {
                    updatePassenger(passenger.id, {
                      name: saved.name,
                      age: String(saved.age),
                      gender: saved.gender,
                    })
                  }}
                />
              ))}

              <div className="pt-2 space-y-2">
                <label className="family-option">
                  <input type="checkbox" checked={family} onChange={toggleFamily} />
                  Travelling together? <span>Family / Group</span>
                  <small>Permits adjacent seating for family members</small>
                </label>

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
              <p className="inline-error" role="alert">
                ! {error}
              </p>
            )}

            <button className="account-primary" type="submit">
              Continue to seat selection <ArrowRight size={17} />
            </button>
          </form>
        )}
      </section>
    </main>
  )
}
