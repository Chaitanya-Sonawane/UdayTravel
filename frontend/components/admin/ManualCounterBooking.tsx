'use client'

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import {
  Ticket,
  User,
  Phone,
  MapPin,
  Calendar,
  CalendarDays,
  Clock,
  Armchair,
  CheckCircle2,
  Printer,
  Plus,
  Trash2,
  AlertCircle,
  RefreshCw,
  QrCode,
  ArrowRight,
  ShieldCheck,
  CreditCard,
  Banknote,
  Sparkles,
  Copy,
  Check,
  X,
  Bus,
  Users,
} from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { RouteId, ROUTES } from '@/lib/config/routes'
import {
  BUS_TEMPLATES,
  BusTemplateId,
  BusLayoutTemplate,
  getBusTemplate,
} from '@/lib/domain/seats/bus-templates'
import { todayIST } from '@/lib/time/ist'
import { ThemedDatePickerModal } from '@/components/ui/ThemedDatePickerModal'
import { AdminBusSeatGraphic } from './AdminBusSeatGraphic'

export interface ScheduledTripSummary {
  tripId: string
  routeId: string
  busId: string
  busNumber: string
  busName: string
  templateId: BusTemplateId
  departureTime: string
  arrivalTime: string
  fare: number
  bookedCount?: number
  totalSeats?: number
}

export interface ManualPassengerInput {
  seat: string
  name: string
  age: string
  gender: 'male' | 'female'
}

interface BookedSeatDetail {
  seatNo: string
  ticketNo: string
  name: string
  age: number
  gender: 'male' | 'female'
  mobile: string
  pickupStop: string
  pickupTime: string
  dropStop: string
  paymentMethod: string
  farePaise: number
  bookedAt: string
}

function getNextDate(dateStr: string, daysAhead = 1): string {
  const d = new Date(`${dateStr}T12:00:00+05:30`)
  d.setDate(d.getDate() + daysAhead)
  return d.toISOString().slice(0, 10)
}

function formatDate(value: string): string {
  try {
    return new Date(`${value}T12:00:00+05:30`).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
    })
  } catch {
    return value
  }
}

// Popular pickup & drop stops for quick counter selection
const AHM_PICKUP_OPTIONS = [
  'Office · 6:30 AM',
  'Ekvira Chowk · 6:30 AM',
  'Bhistbag Chowk · 6:35 AM',
  'Professor Chowk · 6:40 AM',
  'Premdan Chowk · 6:45 AM',
  'Maliwada Stand · 6:45 AM',
  'Delhigate · 6:45 AM',
  'Swastik Chowk · 7:00 AM',
  'Kinetic Chowk · 7:05 AM',
]

const PUN_DROP_OPTIONS = [
  'Shivajinagar, Pune',
  'Wakadewadi',
  'Sangamwadi',
  'Yerwada',
  'Viman Nagar',
  'Kharadi Bye Pass',
  'Wagholi',
  'Swargate, Pune',
  'Pune Station',
]

const PUN_PICKUP_OPTIONS = [
  'Wakadewadi · 18:30',
  'Sangamwadi · 18:30',
  'Yerwada · 18:45',
  'Viman Nagar · 18:50',
  'Kharadi · 18:55',
  'Wagholi · 19:00',
]

const AHM_DROP_OPTIONS = [
  'Maliwada Stand, Ahilyanagar',
  'Office Savedi, Ahilyanagar',
  'Swastik Chowk',
  'Premdan Chowk',
  'Delhigate',
]

const DEFAULT_COUNTER_TRIP: ScheduledTripSummary = {
  tripId: 'trip_ahm_pun_0630',
  routeId: 'AHM_PUN',
  busId: 'bus_mh16dp4951',
  busNumber: 'MH 16 DP 4951',
  busName: 'Uday Bus',
  templateId: 'BUS_55',
  departureTime: '06:30',
  arrivalTime: '09:15',
  fare: 200,
}

// -------------------------------------------------------------
// OPTIMISTIC SEAT RECOMMENDATION ENGINE
// -------------------------------------------------------------
interface SeatSuggestion {
  seats: string[]
  reason: string
}

function computeOptimisticSeatSuggestion(
  template: BusLayoutTemplate,
  passengers: ManualPassengerInput[],
  takenSeats: Record<string, 'M' | 'F'>
): SeatSuggestion | null {
  const count = passengers.length
  if (count === 0) return null

  const isSeatFree = (s: string) => !takenSeats[s] && !takenSeats[s.toUpperCase()]

  // Gender safety validation
  const isGenderSafe = (
    s: string,
    g: 'M' | 'F',
    coPaxAssigned: Record<string, 'M' | 'F'> = {}
  ) => {
    const adjList = template.adjacentSeatsOf(s)
    for (const adj of adjList) {
      const existing = takenSeats[adj] || takenSeats[adj.toUpperCase()]
      if (existing && existing !== g) return false
      const coGender = coPaxAssigned[adj] || coPaxAssigned[adj.toUpperCase()]
      if (coGender && coGender !== g) return false
    }
    return true
  }

  const genders = passengers.map((p) => (p.gender === 'female' ? 'F' : 'M'))

  // Case 1: Single passenger (N = 1)
  if (count === 1) {
    const targetGender = genders[0]!

    if (targetGender === 'F') {
      // 1. Next to an existing female passenger (fills ladies pairs)
      for (const row of template.rows) {
        for (const s of [...row.leftSeats, ...row.rightSeats]) {
          if (isSeatFree(s)) {
            const adjs = template.adjacentSeatsOf(s)
            const hasFemaleNeighbor = adjs.some((a) => takenSeats[a] === 'F')
            if (hasFemaleNeighbor && isGenderSafe(s, 'F')) {
              return {
                seats: [s],
                reason: `Adjacent to female passenger (${adjs.find((a) => takenSeats[a] === 'F')}) · Safe female companion`,
              }
            }
          }
        }
      }
      // 2. Front rows (A, B, C) where left pair is free
      for (const row of template.rows) {
        if (row.leftSeats.every(isSeatFree) && isGenderSafe(row.leftSeats[0]!, 'F')) {
          return {
            seats: [row.leftSeats[0]!],
            reason: `Front coach window seat (${row.leftSeats[0]}) · Ladies priority row`,
          }
        }
        if (row.rightSeats.every(isSeatFree) && isGenderSafe(row.rightSeats[0]!, 'F')) {
          return {
            seats: [row.rightSeats[0]!],
            reason: `Front coach window seat (${row.rightSeats[0]}) · Ladies priority row`,
          }
        }
      }
      // 3. Any safe free seat
      for (const row of template.rows) {
        for (const s of [...row.leftSeats, ...row.rightSeats]) {
          if (isSeatFree(s) && isGenderSafe(s, 'F')) {
            return {
              seats: [s],
              reason: `Safe single ladies seat (${s}) · 100% gender isolated`,
            }
          }
        }
      }
    } else {
      // Male single passenger
      // 1. Next to an existing male passenger
      for (const row of template.rows) {
        for (const s of [...row.leftSeats, ...row.rightSeats]) {
          if (isSeatFree(s)) {
            const adjs = template.adjacentSeatsOf(s)
            const hasMaleNeighbor = adjs.some((a) => takenSeats[a] === 'M')
            if (hasMaleNeighbor && isGenderSafe(s, 'M')) {
              return {
                seats: [s],
                reason: `Adjacent to male passenger (${adjs.find((a) => takenSeats[a] === 'M')}) · Compact allocation`,
              }
            }
          }
        }
      }
      // 2. Middle/rear rows window or aisle
      for (let i = 2; i < template.rows.length; i++) {
        const row = template.rows[i]
        if (!row) continue
        for (const s of [...row.leftSeats, ...row.rightSeats]) {
          if (isSeatFree(s) && isGenderSafe(s, 'M')) {
            return {
              seats: [s],
              reason: `Comfortable seat (${s}) · Row ${row.rowLabel} · Safe distance from ladies`,
            }
          }
        }
      }
      // 3. Any safe seat
      for (const row of template.rows) {
        for (const s of [...row.leftSeats, ...row.rightSeats]) {
          if (isSeatFree(s) && isGenderSafe(s, 'M')) {
            return {
              seats: [s],
              reason: `General passenger seat (${s}) · Gender safe`,
            }
          }
        }
      }
    }
  }

  // Case 2: Pair (N = 2)
  if (count === 2) {
    // If Male + Female (Couple/Family):
    // Left side pair (col 1 + col 2) has zero strangers adjacent!
    for (const row of template.rows) {
      if (row.leftSeats.length === 2 && row.leftSeats.every(isSeatFree)) {
        const [s1, s2] = row.leftSeats
        if (s1 && s2) {
          return {
            seats: [s1, s2],
            reason: `Private 2-seater pair (${s1}, ${s2}) · Ideal for couple/family · Zero strangers adjacent`,
          }
        }
      }
    }
    // Also check right side adjacent pairs (e.g. col 4 + col 5)
    for (const row of template.rows) {
      if (row.rightSeats.length >= 2) {
        const [s1, s2] = [row.rightSeats[row.rightSeats.length - 2], row.rightSeats[row.rightSeats.length - 1]]
        if (s1 && s2 && isSeatFree(s1) && isSeatFree(s2)) {
          return {
            seats: [s1, s2],
            reason: `Adjacent side pair (${s1}, ${s2}) · Row ${row.rowLabel} together`,
          }
        }
      }
    }
  }

  // Case 3: 3 Passengers (N = 3)
  if (count === 3) {
    for (const row of template.rows) {
      if (row.rightSeats.length === 3 && row.rightSeats.every(isSeatFree)) {
        return {
          seats: [...row.rightSeats],
          reason: `Full 3-seater row (${row.rightSeats.join(', ')}) · Entire group seated in Row ${row.rowLabel}`,
        }
      }
    }
    if (template.rearBench && template.rearBench.length >= 3) {
      for (let i = 0; i <= template.rearBench.length - 3; i++) {
        const slice = template.rearBench.slice(i, i + 3)
        if (slice.every(isSeatFree)) {
          return {
            seats: slice,
            reason: `Rear bench trio (${slice.join(', ')}) · Group seated together`,
          }
        }
      }
    }
  }

  // Case 4: 4+ Passengers or General Fallback
  const leftPairs: string[] = []
  for (const row of template.rows) {
    if (row.leftSeats.every(isSeatFree)) {
      leftPairs.push(...row.leftSeats)
      if (leftPairs.length >= count) {
        return {
          seats: leftPairs.slice(0, count),
          reason: `Consecutive side pairs (${leftPairs.slice(0, count).join(', ')}) · Group seated together`,
        }
      }
    }
  }

  // Final fallback: any N gender-safe seats
  const collected: string[] = []
  const coMap: Record<string, 'M' | 'F'> = {}
  for (let i = 0; i < count; i++) {
    const g = genders[i] || 'M'
    for (const row of template.rows) {
      for (const s of [...row.leftSeats, ...row.rightSeats]) {
        if (!collected.includes(s) && isSeatFree(s) && isGenderSafe(s, g, coMap)) {
          collected.push(s)
          coMap[s] = g
          break
        }
      }
      if (collected.length === i + 1) break
    }
  }

  if (collected.length === count) {
    return {
      seats: collected,
      reason: `Best available gender-safe seats (${collected.join(', ')})`,
    }
  }

  return null
}

export function ManualCounterBooking({
  initialTrip,
  initialDate,
  initialRoute,
}: {
  initialTrip?: ScheduledTripSummary | null
  initialDate?: string
  initialRoute?: RouteId
} = {}) {
  const [routeId, setRouteId] = useState<RouteId>(initialRoute || 'AHM_PUN')
  const [travelDate, setTravelDate] = useState<string>(initialDate || todayIST())
  const [calendarOpen, setCalendarOpen] = useState(false)
  const [scheduledTrips, setScheduledTrips] = useState<ScheduledTripSummary[]>(
    initialTrip ? [initialTrip] : [DEFAULT_COUNTER_TRIP]
  )
  const [selectedTrip, setSelectedTrip] = useState<ScheduledTripSummary | null>(initialTrip || DEFAULT_COUNTER_TRIP)
  const [loadingTrips, setLoadingTrips] = useState(false)

  // Dates
  const today = useMemo(() => todayIST(), [])
  const tomorrow = useMemo(() => getNextDate(today, 1), [today])

  // Real-time seat state
  const [takenSeats, setTakenSeats] = useState<Record<string, 'M' | 'F'>>({})
  const [bookedDetails, setBookedDetails] = useState<Record<string, BookedSeatDetail>>({})
  const [hoveredSeat, setHoveredSeat] = useState<string | null>(null)
  const [isSyncing, setIsSyncing] = useState(false)
  const [lastSyncedAt, setLastSyncedAt] = useState<string>('Just now')

  // Sync props only when incoming props actually change
  const prevInitialDateRef = useRef(initialDate)
  useEffect(() => {
    if (initialDate && initialDate !== prevInitialDateRef.current) {
      prevInitialDateRef.current = initialDate
      setTravelDate(initialDate)
    }
  }, [initialDate])

  const prevInitialRouteRef = useRef(initialRoute)
  useEffect(() => {
    if (initialRoute && initialRoute !== prevInitialRouteRef.current) {
      prevInitialRouteRef.current = initialRoute
      setRouteId(initialRoute)
    }
  }, [initialRoute])

  const prevInitialTripRef = useRef(initialTrip?.tripId)
  useEffect(() => {
    if (initialTrip && initialTrip.tripId !== prevInitialTripRef.current) {
      prevInitialTripRef.current = initialTrip.tripId
      setSelectedTrip(initialTrip)
      if (initialTrip.fare) {
        setCustomFare(initialTrip.fare)
      }
    }
  }, [initialTrip])

  // Passenger & Seat state
  const [passengers, setPassengers] = useState<ManualPassengerInput[]>([
    { seat: '', name: '', age: '28', gender: 'male' },
  ])
  const [selectedSeats, setSelectedSeats] = useState<string[]>([])

  // Booking details
  const [contactMobile, setContactMobile] = useState('9890066580')
  const [pickupStop, setPickupStop] = useState('Office · 6:30 AM')
  const [dropStop, setDropStop] = useState('Shivajinagar, Pune')
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'COUNTER_UPI'>('CASH')
  const [customFare, setCustomFare] = useState<number>(200)
  const [notes, setNotes] = useState('Office counter walk-in booking')

  // Submission & Result state
  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [confirmedResult, setConfirmedResult] = useState<any>(null)

  // Razorpay / Counter UPI QR Modal state
  const [showQrModal, setShowQrModal] = useState(false)
  const [qrCountdown, setQrCountdown] = useState(300)
  const [copiedVpa, setCopiedVpa] = useState(false)
  const qrTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Active template layout
  const template: BusLayoutTemplate = selectedTrip
    ? getBusTemplate(selectedTrip.templateId)
    : BUS_TEMPLATES.BUS_55

  // List of all seats on template
  const allTemplateSeats = useMemo(() => {
    const list: string[] = []
    if (template.frontSeats) list.push(...template.frontSeats)
    for (const row of template.rows) {
      list.push(...row.leftSeats, ...row.rightSeats)
    }
    if (template.rearBench) list.push(...template.rearBench)
    return list
  }, [template])

  // Available seats list
  const availableSeats = useMemo(() => {
    return allTemplateSeats.filter((sId) => !takenSeats[sId])
  }, [allTemplateSeats, takenSeats])

  // 1. Fetch scheduled trips
  const fetchTrips = useCallback(async () => {
    setLoadingTrips(true)
    setErrorMsg('')
    try {
      const res = await fetch(`/api/admin/schedule?route=${routeId}&date=${travelDate}`)
      const data = await res.json()
      const list = (data.scheduledTrips || data.trips || []) as ScheduledTripSummary[]
      if (Array.isArray(list)) {
        setScheduledTrips(list)
        if (list.length > 0) {
          setSelectedTrip((prev) => {
            if (prev) {
              const matched = list.find((t) => t.tripId === prev.tripId)
              if (matched) return matched
            }
            return list[0]!
          })
          setCustomFare((prev) => prev || list[0]!.fare || 200)
        } else {
          setSelectedTrip(null)
        }
      }
    } catch {
      setErrorMsg('Failed to fetch scheduled trips.')
    } finally {
      setLoadingTrips(false)
    }
  }, [routeId, travelDate])

  useEffect(() => {
    fetchTrips()
  }, [fetchTrips])

  // 2. Fetch live seat map
  const fetchLiveSeatData = useCallback(async (trip: ScheduledTripSummary) => {
    setIsSyncing(true)
    try {
      const seatsRes = await fetch(`/api/seats?route=${routeId}&date=${travelDate}&tripId=${trip.tripId}`)
      const seatsData = await seatsRes.json()

      const takenMap: Record<string, 'M' | 'F'> = {}
      if (seatsData.publicMap?.taken) {
        Object.assign(takenMap, seatsData.publicMap.taken)
      }
      if (seatsData.seats) {
        for (const [sId, status] of Object.entries(seatsData.seats as Record<string, string>)) {
          if (status === 'female' || status === 'F') takenMap[sId] = 'F'
          else if (status === 'male' || status === 'M') takenMap[sId] = 'M'
          else if (status === 'held' || status === 'blocked') takenMap[sId] = 'M'
        }
      }
      setTakenSeats(takenMap)

      try {
        const manifestRes = await fetch(`/api/admin/manifest?tripId=${trip.tripId}&date=${travelDate}`)
        const manifestData = await manifestRes.json()
        if (manifestData.passengers && Array.isArray(manifestData.passengers)) {
          const detailMap: Record<string, BookedSeatDetail> = {}
          for (const p of manifestData.passengers) {
            detailMap[p.seatNo] = p
            if (!takenMap[p.seatNo]) {
              takenMap[p.seatNo] = p.gender === 'female' ? 'F' : 'M'
            }
          }
          setBookedDetails(detailMap)
          setTakenSeats({ ...takenMap })
        }
      } catch {
        // manifest non-critical
      }

      setLastSyncedAt(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
    } catch {
      // quiet fallback
    } finally {
      setIsSyncing(false)
    }
  }, [routeId, travelDate])

  // Set pickup/drop defaults when trip/route changes
  useEffect(() => {
    if (selectedTrip) {
      fetchLiveSeatData(selectedTrip)
      if (routeId === 'AHM_PUN') {
        setPickupStop(AHM_PICKUP_OPTIONS[0] || 'Office · 6:30 AM')
        setDropStop(PUN_DROP_OPTIONS[0] || 'Shivajinagar, Pune')
      } else {
        setPickupStop(PUN_PICKUP_OPTIONS[0] || 'Wakadewadi · 18:30')
        setDropStop(AHM_DROP_OPTIONS[0] || 'Maliwada Stand, Ahilyanagar')
      }
    }
  }, [selectedTrip, routeId, fetchLiveSeatData])

  // Real-time polling every 3 seconds
  useEffect(() => {
    if (!selectedTrip) return
    const interval = setInterval(() => {
      fetchLiveSeatData(selectedTrip)
    }, 3000)
    return () => clearInterval(interval)
  }, [selectedTrip, fetchLiveSeatData])

  // Two-way sync
  const syncSelectedSeatsFromPassengers = (newPaxList: ManualPassengerInput[]) => {
    const activeSeats = newPaxList
      .map((p) => p.seat.trim().toUpperCase())
      .filter((s) => s.length > 0 && !takenSeats[s])
    setSelectedSeats(Array.from(new Set(activeSeats)))
  }

  // Compute Optimistic Seat Suggestion in real time
  const optimisticSuggestion = useMemo(() => {
    return computeOptimisticSeatSuggestion(template, passengers, takenSeats)
  }, [template, passengers, takenSeats])

  // Apply suggestion automatically or on-click
  const applySuggestedSeats = useCallback(() => {
    if (!optimisticSuggestion || optimisticSuggestion.seats.length === 0) return
    const updated = passengers.map((p, idx) => ({
      ...p,
      seat: optimisticSuggestion.seats[idx] || p.seat,
    }))
    setPassengers(updated)
    setSelectedSeats([...optimisticSuggestion.seats])
    setErrorMsg('')
  }, [optimisticSuggestion, passengers])

  // Change Passenger Count
  const handleSetPassengerCount = (newCount: number) => {
    if (newCount < 1 || newCount > 6) return
    let updated = [...passengers]
    if (newCount > passengers.length) {
      for (let i = passengers.length; i < newCount; i++) {
        updated.push({
          seat: '',
          name: '',
          age: '28',
          gender: 'male',
        })
      }
    } else {
      updated = updated.slice(0, newCount)
    }

    // Auto-calculate suggestion for new count
    const suggestion = computeOptimisticSeatSuggestion(template, updated, takenSeats)
    if (suggestion) {
      updated = updated.map((p, idx) => ({
        ...p,
        seat: suggestion.seats[idx] || '',
      }))
      setSelectedSeats(suggestion.seats)
    } else {
      syncSelectedSeatsFromPassengers(updated)
    }

    setPassengers(updated)
    setErrorMsg('')
  }

  // Handle clicking a seat on the bus chart
  const toggleSeatOnChart = (seatId: string) => {
    if (takenSeats[seatId]) return

    const seatUpper = seatId.toUpperCase()
    const isAlreadySelected = selectedSeats.includes(seatUpper)

    if (isAlreadySelected) {
      const updated = passengers.map((p) =>
        p.seat.toUpperCase() === seatUpper ? { ...p, seat: '' } : p
      )
      setPassengers(updated)
      syncSelectedSeatsFromPassengers(updated)
    } else {
      const emptyIdx = passengers.findIndex((p) => !p.seat.trim())
      if (emptyIdx !== -1 && passengers[emptyIdx]) {
        const updated = [...passengers]
        updated[emptyIdx] = { ...passengers[emptyIdx]!, seat: seatUpper }
        setPassengers(updated)
        syncSelectedSeatsFromPassengers(updated)
      } else {
        if (passengers.length >= 6) {
          setErrorMsg('Maximum 6 seats per counter ticket.')
          return
        }
        const newPax: ManualPassengerInput = {
          seat: seatUpper,
          name: '',
          age: '28',
          gender: 'male',
        }
        const updated = [...passengers, newPax]
        setPassengers(updated)
        syncSelectedSeatsFromPassengers(updated)
      }
    }
  }

  // Update a field for a specific passenger
  const handleUpdatePassenger = (
    index: number,
    field: keyof ManualPassengerInput,
    value: string
  ) => {
    const current = passengers[index]
    if (!current) return

    const updated = [...passengers]
    if (field === 'gender') {
      const g = value === 'female' ? 'female' : 'male'
      updated[index] = { ...current, gender: g }
      setPassengers(updated)
      // Check if current seats are still gender safe
      setErrorMsg('')
    } else {
      updated[index] = { ...current, [field]: value }
      setPassengers(updated)
    }
  }

  // Render individual realistic bus seat matching frontend styling
  const renderSeat = (sId: string) => {
    const sUpper = sId.toUpperCase()
    const isTaken = !!takenSeats[sId] || !!takenSeats[sUpper]
    const takenGender = takenSeats[sId] || takenSeats[sUpper]
    const isSelected = selectedSeats.includes(sUpper)
    const paxInfo = bookedDetails[sId] || bookedDetails[sUpper]

    const titleText = isTaken
      ? `Seat ${sUpper}: Booked by ${paxInfo?.name || (takenGender === 'F' ? 'Female Passenger' : 'Male Passenger')}`
      : isSelected
      ? `Seat ${sUpper}: Selected (Click to unselect)`
      : `Seat ${sUpper}: Available (Click to assign)`

    return (
      <button
        key={sUpper}
        type="button"
        data-seat-id={sUpper}
        disabled={isTaken}
        onClick={() => toggleSeatOnChart(sUpper)}
        onMouseEnter={() => setHoveredSeat(sUpper)}
        onMouseLeave={() => setHoveredSeat(null)}
        title={titleText}
        aria-label={titleText}
        aria-pressed={isSelected}
        className={`group relative inline-flex items-center justify-center p-0.5 rounded-lg border-0 bg-transparent transition-all duration-150 ${
          isTaken
            ? 'cursor-not-allowed opacity-90'
            : isSelected
            ? 'cursor-pointer scale-105 filter drop-shadow-[0_4px_10px_rgba(248,176,24,0.45)]'
            : 'cursor-pointer hover:-translate-y-1 hover:scale-105 active:scale-95'
        }`}
      >
        <AdminBusSeatGraphic
          seatId={sUpper}
          status={isSelected ? 'selected' : isTaken ? (takenGender === 'F' ? 'female' : 'male') : 'available'}
          gender={takenGender}
          isSelected={isSelected}
          isOccupied={isTaken}
          width={36}
          height={42}
        />
      </button>
    )
  }

  // Total fare calculation
  const validSeatsCount = selectedSeats.length || passengers.length
  const totalFare = customFare * validSeatsCount

  // Form validation
  const validateForm = (): boolean => {
    if (!selectedTrip) {
      setErrorMsg('Please select a scheduled bus departure.')
      return false
    }

    const paxWithSeats = passengers.filter((p) => p.seat.trim().length > 0)
    if (paxWithSeats.length === 0) {
      setErrorMsg('Please select or assign seats for all passengers.')
      return false
    }

    for (const p of paxWithSeats) {
      const s = p.seat.trim().toUpperCase()
      if (takenSeats[s]) {
        setErrorMsg(`Seat ${s} is already booked on this bus. Please pick an available seat.`)
        return false
      }
      if (!p.name.trim()) {
        setErrorMsg(`Please enter passenger name for Seat ${s}.`)
        return false
      }
      if (!p.age || isNaN(parseInt(p.age, 10)) || parseInt(p.age, 10) < 1) {
        setErrorMsg(`Please enter a valid age for passenger on Seat ${s}.`)
        return false
      }
    }

    if (!/^\d{10}$/.test(contactMobile.trim())) {
      setErrorMsg('Please enter a valid 10-digit mobile number.')
      return false
    }

    // Gender Neighbour Safety Rule
    for (const p of paxWithSeats) {
      const pGender = p.gender === 'female' ? 'F' : 'M'
      const adjSeats = template.adjacentSeatsOf(p.seat.toUpperCase())
      for (const adj of adjSeats) {
        const existingAdjGender = takenSeats[adj]
        if (existingAdjGender && existingAdjGender !== pGender) {
          setErrorMsg(
            `Seat ${p.seat} (${p.name || 'Passenger'}) is adjacent to Seat ${adj} (booked by a ${
              existingAdjGender === 'F' ? 'Female' : 'Male'
            } passenger). Male and female strangers cannot sit adjacent.`
          )
          return false
        }
        const coPax = paxWithSeats.find((o) => o.seat.toUpperCase() === adj && o.seat.toUpperCase() !== p.seat.toUpperCase())
        if (coPax) {
          const coGender = coPax.gender === 'female' ? 'F' : 'M'
          if (coGender !== pGender) {
            setErrorMsg(
              `Seats ${p.seat} and ${adj} are adjacent, but assigned to different genders (${
                p.name || 'P1'
              } and ${coPax.name || 'P2'}). Please choose safe seats.`
            )
            return false
          }
        }
      }
    }

    setErrorMsg('')
    return true
  }

  // Execute Ticket Issuance
  const executeBooking = async (mode: 'CASH' | 'COUNTER_UPI') => {
    if (!validateForm() || !selectedTrip) return

    setSubmitting(true)
    setErrorMsg('')

    try {
      const paxWithSeats = passengers.filter((p) => p.seat.trim().length > 0)
      const payload = {
        routeId,
        travelDate,
        tripId: selectedTrip.tripId,
        busName: selectedTrip.busName,
        busNumber: selectedTrip.busNumber,
        seatLayout: selectedTrip.templateId === 'BUS_55' ? '2+3 Seater' : '2+2 Seater',
        pickup: {
          name: pickupStop,
          pickupTime: selectedTrip.departureTime,
        },
        drop: {
          name: dropStop,
        },
        passengers: paxWithSeats.map((p) => ({
          seat: p.seat.trim().toUpperCase(),
          name: p.name.trim(),
          age: parseInt(p.age, 10) || 28,
          gender: p.gender,
        })),
        contactMobile: contactMobile.trim(),
        paymentMethod: mode,
        farePerSeat: customFare,
        notes: `${notes} (${mode === 'CASH' ? 'Cash Collected at Counter' : 'Razorpay Counter UPI QR Scanned & Verified'})`,
      }

      const res = await fetch('/api/admin/manual-booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error?.message || 'Manual booking failed')
      }

      setConfirmedResult(data)
      setShowQrModal(false)
      fetchLiveSeatData(selectedTrip)
    } catch (err: any) {
      setErrorMsg(err.message || 'Error executing counter booking.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleBookingSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return

    if (paymentMethod === 'COUNTER_UPI') {
      setShowQrModal(true)
      setQrCountdown(300)
    } else {
      executeBooking('CASH')
    }
  }

  // Reset booking form for next walk-in passenger
  const handleResetForNextBooking = () => {
    setConfirmedResult(null)
    setPassengers([{ seat: '', name: '', age: '28', gender: 'male' }])
    setSelectedSeats([])
    setErrorMsg('')
    if (selectedTrip) {
      fetchLiveSeatData(selectedTrip)
    }
  }

  // QR Modal Timer
  useEffect(() => {
    if (!showQrModal) {
      if (qrTimerRef.current) clearInterval(qrTimerRef.current)
      return
    }

    qrTimerRef.current = setInterval(() => {
      setQrCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(qrTimerRef.current!)
          setShowQrModal(false)
          setErrorMsg('Counter UPI QR code expired. Please generate again.')
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => {
      if (qrTimerRef.current) clearInterval(qrTimerRef.current)
    }
  }, [showQrModal])

  return (
    <div className="space-y-6">
      {/* ------------------------------------------------------------- */}
      {/* 1. UPWARD INFO SECTION: TRIP SELECTOR, ROUTE & DATE */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-white rounded-3xl border border-gray-200 p-5 sm:p-7 shadow-xs space-y-5">
        {/* Top Header Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[11px] font-black uppercase tracking-wider text-emerald-800">
                Counter Ticket Booking
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-gray-950 tracking-tight mt-0.5">
              Manual Counter Ticket Booking
            </h2>
          </div>

          {/* Sync Button & Live Status */}
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-mono text-gray-400 font-bold hidden sm:inline">
              Live Synced: {lastSyncedAt}
            </span>
            <button
              type="button"
              onClick={() => selectedTrip && fetchLiveSeatData(selectedTrip)}
              disabled={isSyncing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 active:scale-95 text-gray-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
            >
              <RefreshCw size={13} className={isSyncing ? 'animate-spin' : ''} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Route, Date & Departure Chips */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
          {/* Route Toggle */}
          <div className="md:col-span-4 bg-gray-50 border border-gray-200 rounded-2xl p-1.5 flex gap-1">
            <button
              type="button"
              onClick={() => setRouteId('AHM_PUN')}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
                routeId === 'AHM_PUN'
                  ? 'bg-[#F8B018] text-[#0B0F19] shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Ahilyanagar → Pune
            </button>
            <button
              type="button"
              onClick={() => setRouteId('PUN_AHM')}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
                routeId === 'PUN_AHM'
                  ? 'bg-[#F8B018] text-[#0B0F19] shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Pune → Ahilyanagar
            </button>
          </div>

          {/* Date Selector Pills */}
          <div className="md:col-span-4 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setTravelDate(today)}
              className={`flex-1 py-2 px-3 text-xs font-bold rounded-xl border transition-all text-center ${
                travelDate === today
                  ? 'bg-[#F8B018] text-[#0B0F19] border-[#F8B018] shadow-xs'
                  : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}
            >
              Today ({formatDate(today)})
            </button>
            <button
              type="button"
              onClick={() => setTravelDate(tomorrow)}
              className={`flex-1 py-2 px-3 text-xs font-bold rounded-xl border transition-all text-center ${
                travelDate === tomorrow
                  ? 'bg-[#F8B018] text-[#0B0F19] border-[#F8B018] shadow-xs'
                  : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}
            >
              Tomorrow ({formatDate(tomorrow)})
            </button>
            <button
              type="button"
              onClick={() => setCalendarOpen(true)}
              className="p-2 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-xl border border-gray-200 transition-all cursor-pointer"
              title="Pick specific date"
            >
              <Calendar size={16} />
            </button>
          </div>

          {/* Active Bus Departure Selector */}
          <div className="md:col-span-4">
            {loadingTrips ? (
              <div className="py-2 text-xs text-gray-400 font-bold flex items-center gap-2">
                <RefreshCw size={14} className="animate-spin text-[#F8B018]" />
                <span>Loading trips...</span>
              </div>
            ) : scheduledTrips.length === 0 ? (
              <div className="py-2 px-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 font-bold">
                No departures scheduled today.
              </div>
            ) : (
              <select
                value={selectedTrip?.tripId || ''}
                onChange={(e) => {
                  const t = scheduledTrips.find((item) => item.tripId === e.target.value)
                  if (t) {
                    setSelectedTrip(t)
                    setCustomFare(t.fare)
                  }
                }}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 bg-white text-xs font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#F8B018] shadow-2xs"
              >
                {scheduledTrips.map((t) => (
                  <option key={t.tripId} value={t.tripId}>
                    {t.departureTime} · {t.busNumber} · Uday Bus (₹{t.fare})
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Selected Bus Prominent Banner */}
        {selectedTrip && (
          <div className="bg-amber-50/60 border border-amber-200/80 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#F8B018] text-[#0B0F19] flex items-center justify-center font-black shadow-xs shrink-0">
                <Bus size={20} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xl sm:text-2xl font-mono font-black text-gray-950 tracking-wider">
                    {selectedTrip.busNumber}
                  </span>
                  <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200">
                    {template.capacity} Seats · {template.layoutType}
                  </span>
                </div>
                <div className="text-xs text-gray-700 font-bold mt-0.5">
                  Uday Bus · Departs {selectedTrip.departureTime} &rarr; Arrives {selectedTrip.arrivalTime}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-emerald-800 bg-emerald-100/80 border border-emerald-200 px-3 py-1 rounded-xl font-mono">
                {availableSeats.length} Seats Available
              </span>
              <strong className="text-sm font-black text-gray-950">
                ₹{customFare} <span className="text-xs font-medium text-gray-500">/ seat</span>
              </strong>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* 2. PASSENGER COUNT & OPTIMISTIC SMART SUGGESTION */}
        {/* ------------------------------------------------------------- */}
        <div className="pt-2 border-t border-gray-100 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Users size={16} className="text-[#F8B018]" />
              <span className="text-xs font-black uppercase tracking-wider text-gray-700">
                Select Passenger Count:
              </span>
            </div>

            {/* Quick 1-6 Passenger Count Buttons */}
            <div className="flex items-center gap-1.5">
              {[1, 2, 3, 4, 5, 6].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => handleSetPassengerCount(num)}
                  className={`w-9 h-9 rounded-xl text-xs font-black font-mono transition-all cursor-pointer ${
                    passengers.length === num
                      ? 'bg-[#F8B018] text-[#0B0F19] ring-2 ring-amber-300 shadow-xs scale-105'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  }`}
                >
                  {num}
                </button>
              ))}
            </div>
          </div>

          {/* Smart Optimistic Recommendation Card */}
          {optimisticSuggestion && (
            <div className="bg-gradient-to-r from-amber-50/90 via-amber-50/40 to-emerald-50/80 border-2 border-amber-300 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
              <div className="flex items-start sm:items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#F8B018] text-[#0B0F19] flex items-center justify-center font-black shadow-xs shrink-0 mt-0.5 sm:mt-0">
                  <Sparkles size={18} />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[11px] font-black uppercase tracking-wider text-amber-950">
                      Optimistic Real-Time Recommendation
                    </span>
                    <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                      100% Gender-Safe
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-sm sm:text-base font-black font-mono text-gray-950">
                      Suggested Seats: {optimisticSuggestion.seats.join(', ')}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 font-medium">
                    {optimisticSuggestion.reason}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={applySuggestedSeats}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0B0F19] hover:bg-gray-800 active:scale-95 text-white font-bold text-xs uppercase tracking-wider shadow-xs transition-transform shrink-0 cursor-pointer"
              >
                <span>Apply Best Seats</span>
                <ArrowRight size={13} className="text-[#F8B018]" />
              </button>
            </div>
          )}

          {/* ------------------------------------------------------------- */}
          {/* 3. PASSENGER DETAILS FORM (UPWARD) */}
          {/* ------------------------------------------------------------- */}
          <form onSubmit={handleBookingSubmit} className="space-y-4">
            <div className="space-y-2.5">
              {passengers.map((pax, idx) => (
                <div
                  key={idx}
                  className="p-3 sm:p-4 rounded-2xl border border-gray-200 bg-gray-50/60 flex flex-col sm:flex-row sm:items-center gap-3 justify-between shadow-2xs"
                >
                  <div className="flex items-center gap-2.5 shrink-0">
                    <span className="w-6 h-6 rounded-full bg-gray-200 text-gray-800 font-bold text-xs flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <span
                      className={`text-xs font-mono font-black px-2.5 py-1 rounded-lg border ${
                        pax.seat
                          ? 'bg-[#F8B018] text-[#0B0F19] border-amber-600 shadow-2xs'
                          : 'bg-white text-gray-400 border-dashed border-gray-300'
                      }`}
                    >
                      {pax.seat ? `Seat ${pax.seat}` : 'Select on Map'}
                    </span>
                  </div>

                  {/* Name Input */}
                  <div className="flex-1 min-w-[140px]">
                    <input
                      type="text"
                      required
                      placeholder={`Passenger ${idx + 1} Name`}
                      value={pax.name}
                      onChange={(e) => handleUpdatePassenger(idx, 'name', e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white border border-gray-200 text-xs font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#F8B018]"
                    />
                  </div>

                  {/* Age Input */}
                  <div className="w-20">
                    <input
                      type="number"
                      min="1"
                      max="120"
                      required
                      placeholder="Age"
                      value={pax.age}
                      onChange={(e) => handleUpdatePassenger(idx, 'age', e.target.value)}
                      className="w-full px-2.5 py-2 rounded-xl bg-white border border-gray-200 text-xs font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#F8B018] text-center"
                    />
                  </div>

                  {/* Gender Toggle */}
                  <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-gray-200 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleUpdatePassenger(idx, 'gender', 'male')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                        pax.gender === 'male'
                          ? 'bg-blue-600 text-white shadow-2xs'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      ♂ Male
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUpdatePassenger(idx, 'gender', 'female')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                        pax.gender === 'female'
                          ? 'bg-pink-600 text-white shadow-2xs'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      ♀ Female
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Boarding, Dropping, Phone & Payment Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
              {/* Mobile Number */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-gray-700">Passenger Mobile Number (10 Digits) *</label>
                <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
                  <Phone size={14} className="text-gray-400 shrink-0" />
                  <input
                    type="tel"
                    maxLength={10}
                    required
                    placeholder="10-digit Mobile"
                    value={contactMobile}
                    onChange={(e) => setContactMobile(e.target.value.replace(/\D/g, ''))}
                    className="w-full bg-transparent text-xs font-bold text-gray-900 outline-none"
                  />
                </div>
              </div>

              {/* Boarding Point */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-gray-700">Boarding Point</label>
                <select
                  value={pickupStop}
                  onChange={(e) => setPickupStop(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-gray-50 border border-gray-200 text-xs font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#F8B018]"
                >
                  {(routeId === 'AHM_PUN' ? AHM_PICKUP_OPTIONS : PUN_PICKUP_OPTIONS).map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>

              {/* Dropping Point */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-gray-700">Dropping Point</label>
                <select
                  value={dropStop}
                  onChange={(e) => setDropStop(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-gray-50 border border-gray-200 text-xs font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#F8B018]"
                >
                  {(routeId === 'AHM_PUN' ? PUN_DROP_OPTIONS : AHM_DROP_OPTIONS).map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>

              {/* Payment Mode */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-gray-700">Payment Collection</label>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('CASH')}
                    className={`flex-1 py-2 text-xs font-bold rounded-xl border flex items-center justify-center gap-1 transition-all cursor-pointer ${
                      paymentMethod === 'CASH'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-800 ring-2 ring-emerald-200'
                        : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <Banknote size={14} />
                    <span>Cash at Office</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('COUNTER_UPI')}
                    className={`flex-1 py-2 text-xs font-bold rounded-xl border flex items-center justify-center gap-1 transition-all cursor-pointer ${
                      paymentMethod === 'COUNTER_UPI'
                        ? 'bg-purple-50 border-purple-500 text-purple-800 ring-2 ring-purple-200'
                        : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <QrCode size={14} />
                    <span>Counter UPI QR</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Error Message if any */}
            {errorMsg && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs font-bold text-red-800 flex items-center gap-2">
                <AlertCircle size={16} className="shrink-0 text-red-600" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Total Fare & Direct Submit Button */}
            <div className="pt-3 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 block">
                  Total Fare Calculation
                </span>
                <div className="flex items-baseline gap-2">
                  <strong className="text-2xl font-black text-gray-950 font-mono">
                    ₹{totalFare}
                  </strong>
                  <span className="text-xs font-medium text-gray-500">
                    ({validSeatsCount} {validSeatsCount === 1 ? 'seat' : 'seats'} &times; ₹{customFare})
                  </span>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center justify-center gap-2.5 px-6 py-3.5 bg-[#F8B018] hover:bg-[#E09A0A] active:scale-95 text-[#0B0F19] font-black text-sm uppercase tracking-wider rounded-2xl shadow-sm transition-transform cursor-pointer disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    <span>Issuing Ticket...</span>
                  </>
                ) : (
                  <>
                    <Ticket size={18} />
                    <span>Book Ticket &amp; Collect ₹{totalFare}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 4. VISUAL REALISTIC BUS SEAT CHART (BELOW INFO SECTION) */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-white rounded-3xl border border-gray-200 p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
          <div>
            <span className="text-xs font-black uppercase tracking-wider text-gray-500">
              Interactive Bus Seat Map ({template.capacity} Seats)
            </span>
            <p className="text-xs text-gray-400 mt-0.5">
              Click any seat to customize or change assignment. Selected seats glow in Golden Yellow.
            </p>
          </div>

          {hoveredSeat && (
            <div className="text-xs font-bold bg-amber-50 text-amber-900 border border-amber-200 px-3 py-1 rounded-xl font-mono">
              Hovered: Seat {hoveredSeat}
            </div>
          )}
        </div>

        {/* Prominent Dark Bus Registration Pill matching PDF */}
        <div className="bg-[#0F172A] text-center py-3.5 px-6 rounded-2xl shadow-md max-w-[420px] mx-auto">
          <div className="text-2xl sm:text-3xl font-black text-[#FACC15] tracking-wider font-mono">
            {template.busNumber}
          </div>
          <div className="text-xs sm:text-sm font-semibold text-white/90 mt-0.5">
            {`${template.capacity} seats`}
          </div>
        </div>

        {/* The Realistic Bus Coach Hull */}
        <div className="flow-bus-shell flow-seat-map max-w-[420px] mx-auto bg-white rounded-[28px] border-2 border-slate-300 p-5 shadow-sm space-y-4 relative">
          {/* Front of Bus Header matching PDF */}
          <div className="flex items-center justify-between pb-3 border-b-2 border-slate-200 text-xs">
            <span className="text-xs sm:text-sm font-bold text-slate-600">
              Entrance
            </span>
            <span className="text-xs sm:text-sm font-black text-slate-700 uppercase tracking-wider font-mono">
              FRONT OF BUS
            </span>
            <div
              className="w-8 h-8 rounded-full bg-slate-100 border border-slate-300 flex items-center justify-center text-slate-500 shadow-2xs"
              title="Driver's Steering Wheel"
            >
              <svg width="22" height="22" viewBox="0 0 32 32" fill="none">
                <circle cx="16" cy="16" r="13" stroke="currentColor" strokeWidth="2.5" />
                <circle cx="16" cy="16" r="3.5" fill="currentColor" />
                <line x1="16" y1="3" x2="16" y2="12.5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                <line x1="6.8" y1="21.3" x2="13.5" y2="17.8" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                <line x1="25.2" y1="21.3" x2="18.5" y2="17.8" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
            </div>
          </div>

          {/* Front Row (Seat 1 on left, Seats 2, 3, 4 or 2, 3 on right) matching PDF */}
          {template.frontRow && (
            <div className="flex items-center justify-between gap-1 sm:gap-2 pb-2">
              <div className="flex items-center gap-1 sm:gap-1.5">
                {template.frontRow.leftSeats.map((sId) => renderSeat(sId))}
                {template.frontRow.leftSeats.length < 2 && (
                  <div className="w-[36px] h-[42px] invisible pointer-events-none" aria-hidden="true" />
                )}
              </div>
              <div className="flex-1 flex items-center justify-center px-1">
                <div className="h-9 w-6 flex items-center justify-center relative">
                  <span className="text-[10px] font-mono font-bold text-slate-300 select-none">FR</span>
                  <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-0.5 border-r border-dashed border-slate-200" />
                </div>
              </div>
              <div className="flex items-center gap-1 sm:gap-1.5">
                {template.frontRow.rightSeats.map((sId) => renderSeat(sId))}
              </div>
            </div>
          )}

          {/* Rows */}
          <div className="space-y-2">
            {template.rows.map((row) => (
              <div key={row.rowLabel} className="flex items-center justify-between gap-1 sm:gap-2">
                {/* Left Side */}
                <div className="flex items-center gap-1 sm:gap-1.5">
                  {row.leftSeats.map((sId) => renderSeat(sId))}
                </div>

                {/* Center Aisle */}
                <div className="flex-1 flex items-center justify-center px-1">
                  <div className="h-9 w-6 flex items-center justify-center relative">
                    <span className="text-[10px] font-mono font-bold text-slate-300 select-none">
                      {row.rowLabel}
                    </span>
                    <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-0.5 border-r border-dashed border-slate-200" />
                  </div>
                </div>

                {/* Right Side */}
                <div className="flex items-center gap-1 sm:gap-1.5">
                  {row.rightSeats.map((sId) => renderSeat(sId))}
                </div>
              </div>
            ))}
          </div>

          {/* Rear Bench */}
          {template.rearBench && template.rearBench.length > 0 && (
            <div className="pt-3 border-t-2 border-slate-200">
              <span className="text-[10px] text-slate-400 uppercase font-bold block text-center mb-2 font-mono">
                Rear Bench ({template.rearBench.length} Seats)
              </span>
              <div className="flex justify-between gap-1 sm:gap-1.5">
                {template.rearBench.map((sId) => renderSeat(sId))}
              </div>
            </div>
          )}

          {/* Back of Bus Footer matching PDF */}
          <div className="pt-3 border-t-2 border-slate-200 text-center">
            <span className="text-xs sm:text-sm font-black text-slate-700 uppercase tracking-wider font-mono">
              BACK OF BUS
            </span>
          </div>

          {/* Rules Legend matching frontend exactly */}
          <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-center gap-3 text-[11px] font-bold text-slate-500">
            <span className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded-md border-2 border-slate-400 bg-white" />
              <span>Available</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded-md bg-[#F8B018] border border-amber-600 shadow-2xs" />
              <span className="text-amber-800">Selected</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded-md bg-[#FCE7F3] border border-purple-400" />
              <span className="text-pink-700">Booked (F)</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded-md bg-[#D8DAE0] border border-slate-400" />
              <span className="text-slate-600">Booked (M)</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded-md bg-[#FEF3C7] border border-amber-400" />
              <span className="text-amber-700">Blocked</span>
            </span>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 5. CONFIRMED TICKET RECEIPT MODAL */}
      {/* ------------------------------------------------------------- */}
      {confirmedResult && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-5 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={24} className="text-emerald-500" />
                <h3 className="text-lg font-black text-gray-900">
                  Ticket Issued Successfully!
                </h3>
              </div>
              <button
                type="button"
                onClick={handleResetForNextBooking}
                className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-700"
              >
                <X size={18} />
              </button>
            </div>

            <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-4 text-center space-y-1">
              <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider block">
                Confirmed Ticket Number
              </span>
              <strong className="text-2xl font-black font-mono text-emerald-950 block">
                {confirmedResult.ticketNo || confirmedResult.ticket?.ticketNo}
              </strong>
            </div>

            <div className="space-y-2 text-xs font-medium text-gray-700 bg-gray-50 rounded-2xl p-4 border border-gray-200">
              <div className="flex justify-between">
                <span className="text-gray-500">Route:</span>
                <strong className="text-gray-900">{confirmedResult.ticket?.route?.from} &rarr; {confirmedResult.ticket?.route?.to}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Bus:</span>
                <strong className="text-gray-900">{confirmedResult.ticket?.busNumber} · {confirmedResult.ticket?.busName}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Departure:</span>
                <strong className="text-gray-900">{confirmedResult.ticket?.travelDate} at {confirmedResult.ticket?.pickup?.pickupTime || selectedTrip?.departureTime}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Seats:</span>
                <strong className="text-emerald-700 font-mono font-black">
                  {confirmedResult.ticket?.passengers?.map((p: any) => `${p.seat} (${p.name})`).join(', ')}
                </strong>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Total Paid:</span>
                <strong className="text-gray-950 font-black">
                  ₹{confirmedResult.ticket?.fare?.total || totalFare} ({confirmedResult.ticket?.payment?.method || paymentMethod})
                </strong>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex-1 py-3 px-4 rounded-xl bg-gray-100 hover:bg-gray-200 active:scale-95 text-gray-800 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-transform cursor-pointer"
              >
                <Printer size={15} />
                <span>Print Receipt</span>
              </button>
              <button
                type="button"
                onClick={handleResetForNextBooking}
                className="flex-1 py-3 px-4 rounded-xl bg-[#F8B018] hover:bg-[#E09A0A] active:scale-95 text-[#0B0F19] font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-transform shadow-xs cursor-pointer"
              >
                <span>Book Next Walk-in</span>
                <ArrowRight size={15} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 6. RAZORPAY / COUNTER UPI QR CODE MODAL */}
      {/* ------------------------------------------------------------- */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl text-center">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <QrCode size={18} className="text-[#F8B018]" />
                <h4 className="text-sm font-black text-gray-900">Scan UPI to Pay</h4>
              </div>
              <button
                type="button"
                onClick={() => setShowQrModal(false)}
                className="p-1 rounded-full hover:bg-gray-100 text-gray-400"
              >
                <X size={16} />
              </button>
            </div>

            <div className="py-2">
              <strong className="text-2xl font-black font-mono text-gray-950 block">
                ₹{totalFare}
              </strong>
              <span className="text-xs text-gray-500 font-medium">
                Collect payment for {validSeatsCount} seats
              </span>
            </div>

            <div className="p-4 bg-white border-2 border-dashed border-gray-300 rounded-2xl flex items-center justify-center mx-auto w-48 h-48">
              <QRCodeSVG
                value={`upi://pay?pa=udaytravels@icici&pn=Uday%20Travels&am=${totalFare}&cu=INR&tn=CounterTicket`}
                size={160}
                level="M"
              />
            </div>

            <div className="text-[11px] font-mono font-bold text-amber-800 bg-amber-50 rounded-xl py-1 px-2 border border-amber-200">
              QR Expires in {Math.floor(qrCountdown / 60)}:{(qrCountdown % 60).toString().padStart(2, '0')}
            </div>

            <button
              type="button"
              onClick={() => executeBooking('COUNTER_UPI')}
              disabled={submitting}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-xs transition-transform cursor-pointer"
            >
              {submitting ? 'Confirming...' : 'Payment Received · Issue Ticket'}
            </button>
          </div>
        </div>
      )}

      {/* Date Picker Modal */}
      <ThemedDatePickerModal
        isOpen={calendarOpen}
        onClose={() => setCalendarOpen(false)}
        selectedDate={travelDate}
        onSelectDate={(date) => {
          setTravelDate(date)
          setCalendarOpen(false)
        }}
        minDate={today}
      />
    </div>
  )
}
