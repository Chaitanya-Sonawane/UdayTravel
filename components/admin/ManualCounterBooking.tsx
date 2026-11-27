'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  Ticket,
  User,
  Phone,
  MapPin,
  Calendar,
  CalendarDays,
  Clock,
  DollarSign,
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
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
  Info,
  X,
  Radio,
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

interface ScheduledTripSummary {
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

interface ManualPassengerInput {
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
  const today = React.useMemo(() => todayIST(), [])
  const tomorrow = React.useMemo(() => getNextDate(today, 1), [today])

  // Real-time seat state
  const [takenSeats, setTakenSeats] = useState<Record<string, 'M' | 'F'>>({})
  const [bookedDetails, setBookedDetails] = useState<Record<string, BookedSeatDetail>>({})
  const [hoveredSeat, setHoveredSeat] = useState<string | null>(null)
  const [isSyncing, setIsSyncing] = useState(false)
  const [lastSyncedAt, setLastSyncedAt] = useState<string>('Just now')
  const [showOccupancyLedger, setShowOccupancyLedger] = useState(false)

  // Sync props only when incoming props actually change from parent
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

  // Selection & Manual Passenger inputs (always initialized with 1 passenger slot)
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
  const [qrCountdown, setQrCountdown] = useState(300) // 5 minutes
  const [copiedVpa, setCopiedVpa] = useState(false)
  const qrTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Active template layout
  const template: BusLayoutTemplate = selectedTrip
    ? getBusTemplate(selectedTrip.templateId)
    : BUS_TEMPLATES.BUS_55

  // List of all seats on the current bus template
  const allTemplateSeats = React.useMemo(() => {
    const list: string[] = []
    if (template.frontSeats) list.push(...template.frontSeats)
    for (const row of template.rows) {
      list.push(...row.leftSeats, ...row.rightSeats)
    }
    if (template.rearBench) list.push(...template.rearBench)
    return list
  }, [template])

  // Available seats list
  const availableSeats = React.useMemo(() => {
    return allTemplateSeats.filter((sId) => !takenSeats[sId])
  }, [allTemplateSeats, takenSeats])

  // 1. Fetch scheduled trips for route & date
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

  // 2. Fetch live seats and passenger manifest for real-time visibility
  const fetchLiveSeatData = useCallback(async (trip: ScheduledTripSummary) => {
    setIsSyncing(true)
    try {
      // A. Fetch seat state from /api/seats
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

      // B. Fetch detailed passenger records from /api/admin/manifest
      try {
        const manifestRes = await fetch(`/api/admin/manifest?tripId=${trip.tripId}&date=${travelDate}`)
        const manifestData = await manifestRes.json()
        if (manifestData.passengers && Array.isArray(manifestData.passengers)) {
          const detailMap: Record<string, BookedSeatDetail> = {}
          for (const p of manifestData.passengers) {
            detailMap[p.seatNo] = p
            // Ensure gender is reflected on seat
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

  // Initialize trip selection
  useEffect(() => {
    if (selectedTrip) {
      setPassengers([{ seat: '', name: '', age: '28', gender: 'male' }])
      setSelectedSeats([])
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

  // Real-time polling every 3 seconds to track newly booked seats
  useEffect(() => {
    if (!selectedTrip) return
    const interval = setInterval(() => {
      fetchLiveSeatData(selectedTrip)
    }, 3000)
    return () => clearInterval(interval)
  }, [selectedTrip, fetchLiveSeatData])

  // Two-way synchronization between passengers array and selectedSeats array
  const syncSelectedSeatsFromPassengers = (newPaxList: ManualPassengerInput[]) => {
    const activeSeats = newPaxList
      .map((p) => p.seat.trim().toUpperCase())
      .filter((s) => s.length > 0 && !takenSeats[s])
    setSelectedSeats(Array.from(new Set(activeSeats)))
  }

  // Handle clicking a seat on the visual chart
  const toggleSeatOnChart = (seatId: string) => {
    if (takenSeats[seatId]) return

    const seatUpper = seatId.toUpperCase()
    const isAlreadySelected = selectedSeats.includes(seatUpper)

    if (isAlreadySelected) {
      // Remove this seat from passengers
      const updated: ManualPassengerInput[] = passengers.map((p) =>
        p.seat.toUpperCase() === seatUpper ? { ...p, seat: '' } : p
      )
      setPassengers(updated)
      syncSelectedSeatsFromPassengers(updated)
    } else {
      // Find the first passenger with an empty seat, or append a new passenger
      const emptyIdx = passengers.findIndex((p) => !p.seat.trim())
      if (emptyIdx !== -1 && passengers[emptyIdx]) {
        const updated: ManualPassengerInput[] = [...passengers]
        updated[emptyIdx] = { ...passengers[emptyIdx]!, seat: seatUpper }
        setPassengers(updated)
        syncSelectedSeatsFromPassengers(updated)
      } else {
        if (passengers.length >= 6) {
          alert('Maximum 6 seats per counter ticket.')
          return
        }
        const newPax: ManualPassengerInput = {
          seat: seatUpper,
          name: '',
          age: '28',
          gender: 'male',
        }
        const updated: ManualPassengerInput[] = [...passengers, newPax]
        setPassengers(updated)
        syncSelectedSeatsFromPassengers(updated)
      }
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
      ? `Seat ${sUpper}: Booked by ${paxInfo?.name || (takenGender === 'F' ? 'Female Passenger' : 'Male Passenger')}${paxInfo?.mobile ? ` (${paxInfo.mobile})` : ''}`
      : isSelected
      ? `Seat ${sUpper}: Selected for counter booking (Click to unselect)`
      : `Seat ${sUpper}: Available (Click to select for booking)`

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

  // Update a field for a specific passenger in the manual entry form
  const handleUpdatePassenger = (
    index: number,
    field: keyof ManualPassengerInput,
    value: string
  ) => {
    const current = passengers[index]
    if (!current) return

    const updated: ManualPassengerInput[] = [...passengers]
    if (field === 'seat') {
      const seatVal = value.trim().toUpperCase()
      updated[index] = { ...current, seat: seatVal }
      setPassengers(updated)
      syncSelectedSeatsFromPassengers(updated)
    } else if (field === 'gender') {
      updated[index] = { ...current, gender: value === 'female' ? 'female' : 'male' }
      setPassengers(updated)
    } else {
      updated[index] = { ...current, [field]: value }
      setPassengers(updated)
    }
  }

  // Add another passenger row manually
  const handleAddPassenger = () => {
    if (passengers.length >= 6) {
      alert('Maximum 6 seats can be booked in a single counter ticket.')
      return
    }
    // Pre-fill next available seat if any
    const currentlyUsed = new Set(passengers.map((p) => p.seat.toUpperCase()))
    const nextFree = availableSeats.find((s) => !currentlyUsed.has(s.toUpperCase())) || ''

    const newPax: ManualPassengerInput = {
      seat: nextFree,
      name: '',
      age: '28',
      gender: 'male',
    }
    const updated: ManualPassengerInput[] = [...passengers, newPax]
    setPassengers(updated)
    syncSelectedSeatsFromPassengers(updated)
  }

  // Remove passenger row
  const handleRemovePassenger = (index: number) => {
    if (passengers.length <= 1) {
      // Clear instead of removing last slot
      const updated: ManualPassengerInput[] = [{ seat: '', name: '', age: '28', gender: 'male' }]
      setPassengers(updated)
      syncSelectedSeatsFromPassengers(updated)
      return
    }
    const updated: ManualPassengerInput[] = passengers.filter((_, i) => i !== index)
    setPassengers(updated)
    syncSelectedSeatsFromPassengers(updated)
  }

  // Calculate total fare
  const validSeatsCount = passengers.filter((p) => p.seat.trim().length > 0).length
  const totalFare = customFare * (validSeatsCount || 1)

  // Validate form inputs
  const validateForm = (): boolean => {
    if (!selectedTrip) {
      setErrorMsg('Please select a scheduled bus trip.')
      return false
    }

    const paxWithSeats = passengers.filter((p) => p.seat.trim().length > 0)
    if (paxWithSeats.length === 0) {
      setErrorMsg('Please enter or select at least one seat number.')
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
      setErrorMsg('Please enter a valid 10-digit mobile number for the passenger.')
      return false
    }

    // Gender Neighbour Safety Rule
    for (const p of paxWithSeats) {
      const pGender = p.gender === 'female' ? 'F' : 'M'
      const adjSeats = template.adjacentSeatsOf(p.seat.toUpperCase())
      for (const adj of adjSeats) {
        // Check existing booked seat
        const existingAdjGender = takenSeats[adj]
        if (existingAdjGender && existingAdjGender !== pGender) {
          setErrorMsg(
            `Seat ${p.seat} (${p.name || 'Passenger'}) is adjacent to Seat ${adj} (booked by a ${
              existingAdjGender === 'F' ? 'Female' : 'Male'
            } passenger). Male and female passengers cannot sit next to each other.`
          )
          return false
        }
        // Check co-passengers in this booking
        const coPax = paxWithSeats.find((o) => o.seat.toUpperCase() === adj && o.seat.toUpperCase() !== p.seat.toUpperCase())
        if (coPax) {
          const coGender = coPax.gender === 'female' ? 'F' : 'M'
          if (coGender !== pGender) {
            setErrorMsg(
              `Seats ${p.seat} and ${adj} are adjacent, but assigned to different genders (${
                p.name || 'P1'
              } and ${coPax.name || 'P2'}). Male and female passengers cannot sit next to each other.`
            )
            return false
          }
        }
      }
    }

    setErrorMsg('')
    return true
  }

  // Execute Ticket Issuance (Cash or Counter UPI)
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
      // Refresh live seats immediately
      fetchLiveSeatData(selectedTrip)
    } catch (err: any) {
      setErrorMsg(err.message || 'Error executing counter booking.')
    } finally {
      setSubmitting(false)
    }
  }

  // Form submission handler
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return

    if (paymentMethod === 'COUNTER_UPI') {
      // Open Razorpay / UPI QR Code Scan Modal
      setQrCountdown(300)
      setShowQrModal(true)
    } else {
      // Immediate Cash Booking
      executeBooking('CASH')
    }
  }

  // Countdown timer for Razorpay QR modal
  useEffect(() => {
    if (showQrModal) {
      qrTimerRef.current = setInterval(() => {
        setQrCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(qrTimerRef.current!)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    } else {
      if (qrTimerRef.current) clearInterval(qrTimerRef.current)
    }
    return () => {
      if (qrTimerRef.current) clearInterval(qrTimerRef.current)
    }
  }, [showQrModal])

  // UPI string for Razorpay Dynamic QR
  const upiQrString = `upi://pay?pa=udaytravels.counter@razorpay&pn=Uday%20Travels&am=${totalFare}&cu=INR&tn=Counter%20Ticket%20Booking%20Seats%20${selectedSeats.join(',')}`

  const copyVpaToClipboard = () => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText('udaytravels.counter@razorpay')
      setCopiedVpa(true)
      setTimeout(() => setCopiedVpa(false), 2000)
    }
  }

  // Count booked seats
  const totalBookedCount = Object.keys(takenSeats).length
  const totalBusSeats = allTemplateSeats.length || 55
  const occupancyPercentage = Math.round((totalBookedCount / totalBusSeats) * 100)

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-[#F8B018] text-black font-black flex items-center justify-center text-xs shadow-xs">
              UT
            </span>
            <h2 className="text-lg font-black text-gray-900 tracking-tight">
              Counter Ticket Booking &amp; Real-time Seat Chart
            </h2>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Manual booking with Name, Age, Seat No, Phone · Cash &amp; Razorpay UPI QR modes
          </p>
        </div>

        {/* Route & Date controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex bg-gray-100 p-1 rounded-xl border border-gray-200">
            <button
              type="button"
              onClick={() => setRouteId('AHM_PUN')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                routeId === 'AHM_PUN'
                  ? 'bg-[#F8B018] text-white shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Ahilyanagar &rarr; Pune
            </button>
            <button
              type="button"
              onClick={() => setRouteId('PUN_AHM')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                routeId === 'PUN_AHM'
                  ? 'bg-[#F8B018] text-white shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Pune &rarr; Ahilyanagar
            </button>
          </div>

          {/* Quick Date Pills: Today & Tomorrow */}
          <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl border border-gray-200">
            <button
              type="button"
              onClick={() => setTravelDate(today)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                travelDate === today
                  ? 'bg-gray-900 text-white shadow-xs'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
              }`}
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => setTravelDate(tomorrow)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                travelDate === tomorrow
                  ? 'bg-gray-900 text-white shadow-xs'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
              }`}
            >
              Tomorrow
            </button>
          </div>

          {/* Choose Date — Webapp White & Yellow Theme */}
          <button
            type="button"
            onClick={() => setCalendarOpen(true)}
            className="relative flex items-center gap-2 bg-white hover:bg-amber-50/40 border border-gray-200 hover:border-[#F8B018] px-3.5 py-1.5 rounded-xl shadow-2xs transition-all cursor-pointer group select-none"
            title="Choose Date"
            aria-label="Choose date"
          >
            <CalendarDays size={14} className="text-[#F8B018] group-hover:scale-105 transition-transform shrink-0" />
            <div className="flex flex-col text-left">
              <span className="text-[9px] uppercase font-bold text-gray-400 leading-none">Choose date</span>
              <span className="text-xs font-black text-gray-900 leading-tight">
                {travelDate ? formatDate(travelDate) : 'Select date'}
              </span>
            </div>
            <ChevronDown size={12} className="text-gray-400 group-hover:text-[#F8B018] transition-colors shrink-0" />
          </button>
          <input
            type="date"
            value={travelDate}
            onChange={(e) => {
              if (e.target.value) setTravelDate(e.target.value)
            }}
            className="sr-only"
            aria-label="Choose travel date"
            tabIndex={-1}
          />

          <ThemedDatePickerModal
            isOpen={calendarOpen}
            onClose={() => setCalendarOpen(false)}
            selectedDate={travelDate}
            onSelectDate={(newDate) => {
              setTravelDate(newDate)
              setCalendarOpen(false)
            }}
            minDate={todayIST()}
            title="Choose Travel Date"
            routeContext="Manual Counter Booking · Direct Seat Allocation"
          />

          {/* Sync Button */}
          {selectedTrip && (
            <button
              type="button"
              onClick={() => fetchLiveSeatData(selectedTrip)}
              disabled={isSyncing}
              title="Refresh real-time seats"
              className="px-3 py-1.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-xs font-bold text-gray-700 flex items-center gap-1.5 shadow-2xs transition-colors"
            >
              <RefreshCw size={13} className={isSyncing ? 'animate-spin text-[#F8B018]' : 'text-gray-500'} />
              <span>{isSyncing ? 'Syncing...' : 'Sync Seats'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Confirmed Ticket Success Banner / Receipt */}
      {confirmedResult && (
        <div className="bg-gradient-to-br from-emerald-50 via-white to-emerald-50/40 rounded-2xl border-2 border-emerald-300 p-6 shadow-md animate-in fade-in duration-300">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-emerald-200 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-xs">
                <CheckCircle2 size={28} />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md">
                  ✓ Ticket Confirmed &amp; Issued Successfully
                </span>
                <h3 className="text-2xl font-black text-gray-900 font-mono tracking-tight mt-0.5">
                  PNR: {confirmedResult.ticketNo}
                </h3>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 bg-gray-900 hover:bg-black text-white text-xs font-bold rounded-xl transition-colors inline-flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Printer size={14} /> Print Counter Receipt
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfirmedResult(null)
                  setPassengers([{ seat: '', name: '', age: '28', gender: 'male' }])
                  setSelectedSeats([])
                }}
                className="px-4 py-2 bg-[#F8B018] hover:bg-[#e09b0b] text-gray-950 text-xs font-bold rounded-xl transition-colors inline-flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Plus size={14} /> Book Next Ticket
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 text-xs">
            <div>
              <span className="text-gray-500 block">Route &amp; Travel Date:</span>
              <strong className="text-gray-900 text-sm font-bold">
                {ROUTES[routeId]?.name} · {travelDate}
              </strong>
            </div>
            <div>
              <span className="text-gray-500 block">Bus &amp; Scheduled Departure:</span>
              <strong className="text-gray-900 text-sm font-bold">
                {confirmedResult.ticket?.busNumber} · {confirmedResult.ticket?.pickup?.pickupTime}
              </strong>
            </div>
            <div>
              <span className="text-gray-500 block">Confirmed Seats &amp; Passengers:</span>
              <strong className="text-emerald-700 text-sm font-black font-mono">
                {confirmedResult.ticket?.passengers?.map((p: any) => `${p.seat} (${p.name})`).join(', ')}
              </strong>
            </div>
            <div>
              <span className="text-gray-500 block">Total Amount Collected:</span>
              <strong className="text-gray-900 text-sm font-black font-mono">
                ₹{(confirmedResult.ticket?.fare?.totalPaise / 100).toFixed(2)} · {confirmedResult.ticket?.payment?.method === 'COUNTER_UPI' ? 'Razorpay UPI QR' : 'Cash at Counter'}
              </strong>
            </div>
          </div>
        </div>
      )}

      {/* Select Scheduled Bus Trip Card */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
            Select Bus Departure
          </span>
          {scheduledTrips.length === 0 && !loadingTrips && (
            <span className="text-xs text-rose-600 font-bold">
              No trips scheduled for this date.
            </span>
          )}
        </div>

        {loadingTrips ? (
          <div className="py-4 text-center text-xs text-gray-400">Loading scheduled buses...</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {scheduledTrips.map((trip) => {
              const isSelected = selectedTrip?.tripId === trip.tripId
              return (
                <div
                  key={trip.tripId}
                  onClick={() => setSelectedTrip(trip)}
                  className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                    isSelected
                      ? 'border-[#F8B018] bg-amber-50/50 shadow-xs'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-black text-gray-900 font-mono">
                      {trip.departureTime} &rarr; {trip.arrivalTime}
                    </span>
                    <span className="text-[10px] font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded-full">
                      {trip.templateId.replace('_', ' ')}
                    </span>
                  </div>
                  {/* Big font bus number */}
                  <div className="text-base sm:text-lg font-black font-mono text-gray-950 tracking-tight">
                    {trip.busNumber}
                  </div>
                  <div className="text-xs font-semibold text-gray-600 mt-0.5">{trip.busName}</div>
                  <div className="text-[11px] text-gray-500 font-mono mt-1 flex justify-end items-center">
                    <div className="flex items-center gap-1.5">
                      {typeof (trip as any).booked === 'number' && (trip as any).booked > 0 && (
                        <span className="text-[10px] font-black text-emerald-800 bg-emerald-100 px-1.5 py-0.2 rounded">
                          {(trip as any).booked} Booked
                        </span>
                      )}
                      <strong className="text-emerald-700 font-bold">₹{trip.fare} / seat</strong>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Main 2-Column Interface: Left = Real-time Seat Map, Right = Manual Passenger Form */}
      {selectedTrip && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Visual Bus Seat Map & Real-time Booked Seats Chart */}
          <div className="lg:col-span-7 bg-white rounded-2xl border border-gray-200 p-6 shadow-xs space-y-5">
            {/* Real-time Status Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-gray-100 gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <span className="flex h-2.5 w-2.5 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                  </span>
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700">
                    Real-time Seat Booking Chart
                  </span>
                </div>
                <h3 className="text-base font-extrabold text-gray-900 mt-0.5">
                  {template.name} ({totalBusSeats} Seats · {template.layoutType})
                </h3>
              </div>

              {/* Real-time stats and legend */}
              <div className="flex flex-wrap items-center gap-3 text-xs font-medium">
                <span className="px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 text-[11px] font-mono font-bold">
                  {totalBookedCount} Booked / {availableSeats.length} Free
                </span>
                <span className="flex items-center gap-1.5 text-gray-600">
                  <span className="w-3.5 h-3.5 rounded-md border border-gray-300 bg-white inline-block" /> Available
                </span>
                <span className="flex items-center gap-1.5 text-gray-600">
                  <span className="w-3.5 h-3.5 rounded-md bg-[#F8B018] inline-block" /> Selected
                </span>
                <span className="flex items-center gap-1.5 text-gray-600">
                  <span className="w-3.5 h-3.5 rounded-md bg-slate-700 inline-block" /> Booked
                </span>
              </div>
            </div>

            {/* Occupancy Progress Bar */}
            <div>
              <div className="flex justify-between text-[11px] text-gray-500 mb-1 font-mono">
                <span>Occupancy: {occupancyPercentage}%</span>
                <span>Last updated: {lastSyncedAt}</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-[#F8B018] h-2 rounded-full transition-all duration-500"
                  style={{ width: `${occupancyPercentage}%` }}
                />
              </div>
            </div>

            {/* Live Confirmed Bookings Ribbon */}
            {Object.keys(takenSeats).length > 0 && (
              <div className="bg-emerald-50/90 border border-emerald-200 rounded-2xl p-4 shadow-xs space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs font-black text-emerald-950 uppercase tracking-wider">
                      Live Confirmed Bookings ({Object.keys(takenSeats).length})
                    </span>
                  </div>
                  <span className="text-[10px] font-mono font-bold text-emerald-700">
                    Live Synced · {lastSyncedAt}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {Object.entries(takenSeats).map(([seatId, gender]) => {
                    const pax = bookedDetails[seatId]
                    return (
                      <div
                        key={seatId}
                        className="flex items-center justify-between bg-white border border-emerald-200 rounded-xl px-3 py-2 shadow-2xs"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="w-8 h-8 rounded-lg bg-emerald-600 text-white font-mono font-black text-xs flex items-center justify-center shrink-0">
                            {seatId}
                          </span>
                          <div className="text-left leading-tight">
                            <span className="text-xs font-extrabold text-gray-900 block">
                              {pax?.name || `Passenger (${gender === 'F' ? 'Female' : 'Male'})`}
                            </span>
                            <span className="text-[11px] text-gray-500 font-mono">
                              {pax?.ticketNo || 'Confirmed'} {pax?.mobile ? `· ${pax.mobile}` : ''}
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded ${gender === 'F' ? 'bg-pink-100 text-pink-700' : 'bg-blue-100 text-blue-700'}`}>
                            {gender === 'F' ? 'Female' : 'Male'}
                          </span>
                          {pax?.pickupStop && (
                            <span className="text-[10px] text-gray-400 font-medium">
                              {pax.pickupStop.split('·')[0]?.trim()}
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Visual Bus Hull Chart matching frontend */}
            <div className="flow-bus-shell flow-seat-map max-w-[420px] mx-auto bg-white rounded-[28px] border-2 border-slate-300 p-5 shadow-sm space-y-4 relative">
              {/* Driver & Entrance Header matching frontend */}
              <div className="flow-driver-cabin flex justify-between items-center pb-3 border-b-2 border-dashed border-slate-200">
                <div className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Front Entrance &rarr;</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">
                    Driver Cabin
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
              </div>

              {/* Front Cabin Seats if any */}
              {template.frontSeats && template.frontSeats.length > 0 && (
                <div className="flex items-center justify-end gap-1.5 pb-2.5 border-b border-slate-100">
                  <span className="text-[10px] font-mono font-bold text-slate-400 uppercase mr-1">
                    Front Cabin:
                  </span>
                  {template.frontSeats.map((sId) => renderSeat(sId))}
                </div>
              )}

              {/* Main Passenger Rows */}
              <div className="space-y-2">
                {template.rows.map((row) => (
                  <div key={row.rowLabel} className="flex items-center justify-between gap-1 sm:gap-2">
                    {/* Left Seats */}
                    <div className="flex items-center gap-1 sm:gap-1.5">
                      {row.leftSeats.map((sId) => renderSeat(sId))}
                    </div>

                    {/* Aisle Spacer with Textured Dashed Center Guide */}
                    <div className="flex-1 flex items-center justify-center px-1">
                      <div className="h-9 w-6 flex items-center justify-center relative">
                        <span className="text-[10px] font-mono font-bold text-slate-300 select-none">
                          {row.rowLabel}
                        </span>
                        <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-0.5 border-r border-dashed border-slate-200" />
                      </div>
                    </div>

                    {/* Right Seats */}
                    <div className="flex items-center gap-1 sm:gap-1.5">
                      {row.rightSeats.map((sId) => renderSeat(sId))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Rear Bench */}
              {template.rearBench && template.rearBench.length > 0 && (
                <div className="pt-3 border-t-2 border-slate-200">
                  <div className="text-[10px] text-slate-400 text-center uppercase tracking-widest mb-2 font-bold font-mono">
                    Rear Bench ({template.rearBench.length} Seats)
                  </div>
                  <div className="flex justify-between gap-1 sm:gap-1.5">
                    {template.rearBench.map((sId) => renderSeat(sId))}
                  </div>
                </div>
              )}

              {/* Rules Legend matching frontend exactly */}
              <div className="flex flex-wrap items-center justify-center gap-3 pt-3 border-t border-slate-100 text-xs font-medium">
                <span className="flex items-center gap-1.5 text-slate-600">
                  <span className="w-3.5 h-3.5 rounded-sm border-1.5 border-[#5A6474] bg-white inline-block shadow-2xs" />
                  <span>Available</span>
                </span>
                <span className="flex items-center gap-1.5 text-slate-900 font-bold">
                  <span className="w-3.5 h-3.5 rounded-sm border-1.5 border-[#0B0F19] bg-[#F8B018] inline-block shadow-2xs" />
                  <span>Selected</span>
                </span>
                <span className="flex items-center gap-1.5 text-slate-600">
                  <span className="w-3.5 h-3.5 rounded-sm border-1.5 border-[#5A6474] bg-[#D8DAE0] inline-block shadow-2xs" />
                  <span>Booked (Male)</span>
                </span>
                <span className="flex items-center gap-1.5 text-pink-700 font-bold">
                  <span className="w-3.5 h-3.5 rounded-sm border-1.5 border-[#A855F7] bg-[#FCE7F3] inline-block shadow-2xs" />
                  <span>Booked (Female)</span>
                </span>
              </div>
            </div>

            {/* Hovered Seat Detail Card (Shows Real-time Booking Details) */}
            {hoveredSeat && (
              <div className="p-3 bg-gray-900 text-white rounded-xl text-xs animate-in fade-in duration-150 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-lg bg-[#F8B018] text-black font-black flex items-center justify-center font-mono">
                    {hoveredSeat}
                  </span>
                  <div>
                    {takenSeats[hoveredSeat] ? (
                      <div>
                        <span className="text-emerald-400 font-bold uppercase text-[10px] tracking-wider">
                          ✓ Booked / Confirmed ({takenSeats[hoveredSeat] === 'F' ? 'Female' : 'Male'})
                        </span>
                        <div className="text-white font-bold text-xs">
                          {bookedDetails[hoveredSeat]?.name ? (
                            <span>
                              {bookedDetails[hoveredSeat].name} · {bookedDetails[hoveredSeat].mobile || ''}
                            </span>
                          ) : (
                            <span>Occupied Seat</span>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div>
                        <span className="text-amber-400 font-bold uppercase text-[10px] tracking-wider">
                          Available Seat
                        </span>
                        <div className="text-gray-300 text-xs">Click or type in form to book this seat</div>
                      </div>
                    )}
                  </div>
                </div>
                {takenSeats[hoveredSeat] && bookedDetails[hoveredSeat]?.ticketNo && (
                  <span className="text-gray-400 font-mono text-[11px]">
                    PNR: {bookedDetails[hoveredSeat].ticketNo}
                  </span>
                )}
              </div>
            )}

            {/* Realtime Booked Seats Manifest Toggle */}
            <div className="pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setShowOccupancyLedger(!showOccupancyLedger)}
                className="w-full flex items-center justify-between py-2 text-xs font-bold text-gray-700 hover:text-black cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <Ticket size={14} className="text-[#F8B018]" />
                  <span>View All Booked Seats List ({totalBookedCount})</span>
                </span>
                {showOccupancyLedger ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>

              {showOccupancyLedger && (
                <div className="mt-3 overflow-x-auto rounded-xl border border-gray-200">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-gray-100 text-[10px] uppercase font-bold text-gray-600">
                      <tr>
                        <th className="py-2 px-3">Seat</th>
                        <th className="py-2 px-3">Passenger</th>
                        <th className="py-2 px-3">Gender/Age</th>
                        <th className="py-2 px-3">Contact</th>
                        <th className="py-2 px-3">Boarding</th>
                        <th className="py-2 px-3">PNR</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {Object.keys(takenSeats).length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-4 text-center text-gray-400">
                            No seats booked yet on this departure.
                          </td>
                        </tr>
                      ) : (
                        Object.keys(takenSeats).map((sId) => {
                          const p = bookedDetails[sId]
                          const gender = takenSeats[sId]
                          return (
                            <tr key={sId} className="hover:bg-gray-50 font-medium">
                              <td className="py-2 px-3 font-mono font-bold text-gray-900">{sId}</td>
                              <td className="py-2 px-3 text-gray-800">{p?.name || 'Passenger'}</td>
                              <td className="py-2 px-3 text-gray-600">
                                <span
                                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                    gender === 'F' ? 'bg-pink-100 text-pink-700' : 'bg-blue-100 text-blue-700'
                                  }`}
                                >
                                  {gender === 'F' ? 'Female' : 'Male'}
                                </span>
                                {p?.age ? ` · ${p.age}y` : ''}
                              </td>
                              <td className="py-2 px-3 font-mono text-gray-600">{p?.mobile || '—'}</td>
                              <td className="py-2 px-3 text-gray-600">{p?.pickupStop || '—'}</td>
                              <td className="py-2 px-3 font-mono text-gray-500">{p?.ticketNo || '—'}</td>
                            </tr>
                          )
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Manual Booking Form (Name, Age, Seat No, Phone, Cash/Counter UPI) */}
          <div className="lg:col-span-5 bg-white rounded-2xl border border-gray-200 p-6 shadow-xs space-y-5">
            <div>
              <h3 className="text-base font-extrabold text-gray-900">
                {selectedSeats.length === 0
                  ? 'Manual Counter Booking'
                  : `Booking ${selectedSeats.length} Seat(s): ${selectedSeats.join(', ')}`}
              </h3>
            </div>

            {errorMsg && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-900 rounded-xl text-xs flex items-start gap-2 animate-in fade-in">
                <AlertCircle size={16} className="text-rose-600 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleFormSubmit} className="space-y-4">
              {/* Manual Passenger Fields (Seat No, Name, Age, Gender) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wide">
                    Passengers ({passengers.length})
                  </label>
                  <button
                    type="button"
                    onClick={handleAddPassenger}
                    className="inline-flex items-center gap-1 text-xs font-bold text-[#b87d00] hover:text-[#946400] transition-colors cursor-pointer"
                  >
                    <Plus size={14} /> Add Another Seat
                  </button>
                </div>

                {passengers.map((p, idx) => {
                  const sUpper = p.seat.trim().toUpperCase()
                  const isSeatTaken = !!takenSeats[sUpper]
                  const isSeatValid = allTemplateSeats.includes(sUpper)

                  return (
                    <div
                      key={idx}
                      className="p-3.5 bg-gray-50/80 rounded-xl border border-gray-200 space-y-2.5 transition-all focus-within:border-[#F8B018]"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-gray-700">
                          Passenger {idx + 1}
                        </span>
                        {passengers.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemovePassenger(idx)}
                            className="text-gray-400 hover:text-rose-600 p-1 rounded-md transition-colors cursor-pointer"
                            title="Remove passenger"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>

                      {/* Seat No input & Name input */}
                      <div className="grid grid-cols-12 gap-2">
                        {/* Seat No. Manual Input */}
                        <div className="col-span-4">
                          <label className="text-[10px] text-gray-500 uppercase font-bold block mb-0.5">
                            Seat No. *
                          </label>
                          <div className="relative">
                            <input
                              type="text"
                              value={p.seat}
                              onChange={(e) => handleUpdatePassenger(idx, 'seat', e.target.value)}
                              placeholder="e.g. A1"
                              required
                              className={`w-full bg-white border rounded-lg px-2.5 py-1.5 text-xs text-gray-900 font-mono font-bold uppercase focus:outline-hidden ${
                                isSeatTaken
                                  ? 'border-rose-400 bg-rose-50 text-rose-900'
                                  : 'border-gray-200 focus:border-[#F8B018]'
                              }`}
                            />
                          </div>
                          {isSeatTaken && (
                            <span className="text-[9px] text-rose-600 font-bold block mt-0.5">
                              ⚠️ Already Booked
                            </span>
                          )}
                        </div>

                        {/* Full Name Input */}
                        <div className="col-span-8">
                          <label className="text-[10px] text-gray-500 uppercase font-bold block mb-0.5">
                            Passenger Name *
                          </label>
                          <input
                            type="text"
                            value={p.name}
                            onChange={(e) => handleUpdatePassenger(idx, 'name', e.target.value)}
                            placeholder="e.g. Ramesh Patil"
                            required
                            className="w-full bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-900 font-semibold focus:outline-hidden focus:border-[#F8B018]"
                          />
                        </div>
                      </div>

                      {/* Age & Gender */}
                      <div className="grid grid-cols-12 gap-2">
                        <div className="col-span-5">
                          <label className="text-[10px] text-gray-500 uppercase font-bold block mb-0.5">
                            Age *
                          </label>
                          <input
                            type="number"
                            min="1"
                            max="120"
                            value={p.age}
                            onChange={(e) => handleUpdatePassenger(idx, 'age', e.target.value)}
                            required
                            className="w-full bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-900 font-semibold focus:outline-hidden focus:border-[#F8B018]"
                          />
                        </div>

                        <div className="col-span-7">
                          <label className="text-[10px] text-gray-500 uppercase font-bold block mb-0.5">
                            Gender *
                          </label>
                          <div className="flex bg-white rounded-lg border border-gray-200 p-0.5">
                            <button
                              type="button"
                              onClick={() => handleUpdatePassenger(idx, 'gender', 'male')}
                              className={`flex-1 py-1 text-xs font-bold rounded-md transition-all ${
                                p.gender === 'male'
                                  ? 'bg-blue-600 text-white shadow-xs'
                                  : 'text-gray-600 hover:text-black'
                              }`}
                            >
                              Male
                            </button>
                            <button
                              type="button"
                              onClick={() => handleUpdatePassenger(idx, 'gender', 'female')}
                              className={`flex-1 py-1 text-xs font-bold rounded-md transition-all ${
                                p.gender === 'female'
                                  ? 'bg-pink-600 text-white shadow-xs'
                                  : 'text-gray-600 hover:text-black'
                              }`}
                            >
                              Female
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Passenger Mobile Number (10 Digits) */}
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">
                  Passenger Mobile Number (10 Digits) *
                </label>
                <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 focus-within:border-[#F8B018]">
                  <Phone size={15} className="text-gray-400" />
                  <span className="text-xs text-gray-500 font-bold">+91</span>
                  <input
                    type="tel"
                    maxLength={10}
                    value={contactMobile}
                    onChange={(e) => setContactMobile(e.target.value.replace(/\D/g, ''))}
                    placeholder="9890066580"
                    required
                    className="w-full bg-transparent text-xs font-mono font-bold text-gray-900 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Boarding Point & Dropping Point */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-bold text-gray-700 block mb-1">
                    Boarding Point
                  </label>
                  <select
                    value={pickupStop}
                    onChange={(e) => setPickupStop(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-2.5 py-2 text-xs font-semibold text-gray-900 focus:outline-hidden focus:border-[#F8B018]"
                  >
                    {(routeId === 'AHM_PUN' ? AHM_PICKUP_OPTIONS : PUN_PICKUP_OPTIONS).map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-gray-700 block mb-1">
                    Dropping Point
                  </label>
                  <select
                    value={dropStop}
                    onChange={(e) => setDropStop(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-2.5 py-2 text-xs font-semibold text-gray-900 focus:outline-hidden focus:border-[#F8B018]"
                  >
                    {(routeId === 'AHM_PUN' ? PUN_DROP_OPTIONS : AHM_DROP_OPTIONS).map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Payment Collection Mode (Two Options: Cash or Counter UPI / Razorpay QR) */}
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1.5">
                  Payment Collection Mode
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  {/* Option 1: Cash at Office */}
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('CASH')}
                    className={`p-3 rounded-xl border flex items-center justify-center gap-2 text-xs font-bold transition-all cursor-pointer ${
                      paymentMethod === 'CASH'
                        ? 'border-[#F8B018] bg-amber-50 text-gray-950 ring-2 ring-[#F8B018]/30 shadow-xs'
                        : 'border-gray-200 bg-gray-50 text-gray-600 hover:border-[#F8B018]/50 hover:bg-amber-50/20 hover:text-gray-900'
                    }`}
                  >
                    <Banknote
                      size={16}
                      className={paymentMethod === 'CASH' ? 'text-[#B45309]' : 'text-gray-500'}
                    />
                    <span>Cash at Office</span>
                  </button>

                  {/* Option 2: Counter Razorpay UPI QR */}
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('COUNTER_UPI')}
                    className={`p-3 rounded-xl border flex items-center justify-center gap-2 text-xs font-bold transition-all cursor-pointer ${
                      paymentMethod === 'COUNTER_UPI'
                        ? 'border-[#F8B018] bg-amber-50 text-gray-950 ring-2 ring-[#F8B018]/30 shadow-xs'
                        : 'border-gray-200 bg-gray-50 text-gray-600 hover:border-[#F8B018]/50 hover:bg-amber-50/20 hover:text-gray-900'
                    }`}
                  >
                    <QrCode
                      size={16}
                      className={paymentMethod === 'COUNTER_UPI' ? 'text-[#B45309]' : 'text-[#F8B018]'}
                    />
                    <span>Counter UPI QR</span>
                  </button>
                </div>
              </div>

              {/* Total Calculation & Fare Rate */}
              <div className="p-4 bg-[#0B0F19] text-white rounded-xl flex items-center justify-between border border-white/10 shadow-sm">
                <div>
                  <span className="text-[10px] text-gray-400 uppercase tracking-widest block font-bold">
                    Total Amount to Collect
                  </span>
                  <div className="text-2xl font-black font-mono text-[#F8B018]">
                    ₹{totalFare.toFixed(2)}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-gray-400 block font-bold">
                    Rate / Seat: ₹{customFare}
                  </span>
                  <span className="text-xs font-bold text-gray-300">
                    {validSeatsCount} Seat{validSeatsCount !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>

              {/* Submit CTA */}
              <button
                type="submit"
                disabled={submitting || validSeatsCount === 0}
                className="w-full py-3.5 bg-[#F8B018] hover:bg-[#e09b0b] disabled:bg-gray-200 disabled:text-gray-400 text-gray-950 font-black text-sm rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
              >
                {submitting ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" /> Issuing Ticket...
                  </>
                ) : paymentMethod === 'COUNTER_UPI' ? (
                  <>
                    <QrCode size={18} /> Open Razorpay QR Scan Page (₹{totalFare})
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={18} /> Confirm &amp; Issue Ticket (₹{totalFare})
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* RAZORPAY / COUNTER UPI QR CODE SCAN PAGE MODAL */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div
            className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-100 flex flex-col animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="bg-[#0B0F19] text-white p-5 flex items-center justify-between border-b border-white/10">
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg bg-[#F8B018] text-black font-black flex items-center justify-center text-xs">
                  UT
                </span>
                <div>
                  <h3 className="font-black text-sm text-white tracking-wide">
                    Razorpay UPI QR Payment
                  </h3>
                  <span className="text-[11px] text-gray-400 font-mono">
                    Counter Desk · Instant Scan &amp; Pay
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowQrModal(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 text-center space-y-4">
              {/* Amount badge */}
              <div className="inline-block px-4 py-1.5 rounded-full bg-amber-50 border border-[#F8B018]/40">
                <span className="text-xs text-amber-900 font-medium">Amount to Pay: </span>
                <strong className="text-lg font-black text-gray-900 font-mono">₹{totalFare}.00</strong>
              </div>

              {/* QR Code Container */}
              <div className="p-4 bg-white rounded-2xl border-2 border-dashed border-gray-300 inline-block shadow-inner mx-auto">
                <QRCodeSVG
                  value={upiQrString}
                  size={200}
                  level="M"
                  includeMargin={true}
                />
              </div>

              {/* Live Waiting Animation & Timer */}
              <div className="flex items-center justify-center gap-2 text-xs font-mono text-gray-600">
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                <span>Awaiting customer scan...</span>
                <span className="text-gray-400 font-bold">
                  ({Math.floor(qrCountdown / 60)}:{(qrCountdown % 60).toString().padStart(2, '0')})
                </span>
              </div>

              {/* Accepted UPI Apps logos */}
              <div className="pt-2 border-t border-gray-100">
                <span className="text-[10px] text-gray-400 uppercase font-bold tracking-widest block mb-2">
                  Scan with any UPI App
                </span>
                <div className="flex items-center justify-center gap-2 text-xs font-bold text-gray-700">
                  <span className="px-2 py-1 rounded-md bg-gray-100 border border-gray-200">GPay</span>
                  <span className="px-2 py-1 rounded-md bg-gray-100 border border-gray-200">PhonePe</span>
                  <span className="px-2 py-1 rounded-md bg-gray-100 border border-gray-200">Paytm</span>
                  <span className="px-2 py-1 rounded-md bg-gray-100 border border-gray-200">BHIM UPI</span>
                </div>
              </div>

              {/* VPA Copy Info */}
              <div className="p-2.5 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-between text-xs">
                <span className="font-mono text-gray-600 font-medium">
                  VPA: <strong className="text-gray-900">udaytravels.counter@razorpay</strong>
                </span>
                <button
                  type="button"
                  onClick={copyVpaToClipboard}
                  className="p-1 text-gray-500 hover:text-[#F8B018] font-bold text-[11px] inline-flex items-center gap-1 cursor-pointer"
                >
                  {copiedVpa ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                  <span>{copiedVpa ? 'Copied' : 'Copy'}</span>
                </button>
              </div>

              {/* Booking Summary in Modal */}
              <div className="p-3 bg-amber-50/50 rounded-xl border border-amber-200/60 text-left text-xs space-y-1 font-medium text-gray-700">
                <div className="flex justify-between">
                  <span className="text-gray-500">Seats:</span>
                  <strong className="font-mono text-gray-900">
                    {passengers.filter((p) => p.seat.trim()).map((p) => p.seat.toUpperCase()).join(', ')}
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Primary Passenger:</span>
                  <span className="text-gray-900">{passengers[0]?.name || 'Passenger'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Mobile:</span>
                  <span className="font-mono text-gray-900">+91 {contactMobile}</span>
                </div>
              </div>

              {/* Actions in Modal */}
              <div className="space-y-2 pt-2">
                <button
                  type="button"
                  onClick={() => executeBooking('COUNTER_UPI')}
                  disabled={submitting}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
                >
                  {submitting ? (
                    <>
                      <RefreshCw size={16} className="animate-spin" /> Verifying &amp; Issuing...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={18} /> Confirm Payment Received &amp; Issue Ticket
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowQrModal(false)
                    setPaymentMethod('CASH')
                  }}
                  className="w-full py-2.5 text-xs font-bold text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
                >
                  Switch to Cash Payment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
