'use client'

import React, { useState, useEffect } from 'react'
import {
  Ticket,
  User,
  Phone,
  MapPin,
  Calendar,
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
} from 'lucide-react'
import { RouteId, ROUTES } from '@/lib/config/routes'
import {
  BUS_TEMPLATES,
  BusTemplateId,
  BusLayoutTemplate,
  getBusTemplate,
} from '@/lib/domain/seats/bus-templates'
import { todayIST } from '@/lib/time/ist'

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

export function ManualCounterBooking() {
  const [routeId, setRouteId] = useState<RouteId>('AHM_PUN')
  const [travelDate, setTravelDate] = useState<string>(todayIST())
  const [scheduledTrips, setScheduledTrips] = useState<ScheduledTripSummary[]>([])
  const [selectedTrip, setSelectedTrip] = useState<ScheduledTripSummary | null>(null)
  const [loadingTrips, setLoadingTrips] = useState(false)

  // Seat state
  const [takenSeats, setTakenSeats] = useState<Record<string, 'M' | 'F'>>({})
  const [selectedSeats, setSelectedSeats] = useState<string[]>([])
  const [passengers, setPassengers] = useState<ManualPassengerInput[]>([])

  // Booking form state
  const [contactMobile, setContactMobile] = useState('')
  const [pickupStop, setPickupStop] = useState('')
  const [dropStop, setDropStop] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'COUNTER_UPI'>('CASH')
  const [customFare, setCustomFare] = useState<number>(200)
  const [notes, setNotes] = useState('Office counter walk-in booking')

  // Submission & Result state
  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [confirmedResult, setConfirmedResult] = useState<any>(null)

  // 1. Fetch scheduled trips for the selected route & date
  const fetchTrips = async () => {
    setLoadingTrips(true)
    setErrorMsg('')
    try {
      const res = await fetch(`/api/admin/schedule?route=${routeId}&date=${travelDate}`)
      const data = await res.json()
      if (data.scheduledTrips && Array.isArray(data.scheduledTrips)) {
        setScheduledTrips(data.scheduledTrips)
        if (data.scheduledTrips.length > 0) {
          setSelectedTrip(data.scheduledTrips[0])
          setCustomFare(data.scheduledTrips[0].fare || 200)
        } else {
          setSelectedTrip(null)
        }
      }
    } catch (err: any) {
      console.warn('Failed to load trips for admin booking:', err)
      setErrorMsg('Failed to fetch scheduled trips.')
    } finally {
      setLoadingTrips(false)
    }
  }

  useEffect(() => {
    fetchTrips()
  }, [routeId, travelDate])

  // 2. Fetch live seats for the selected trip
  const fetchLiveSeats = async (trip: ScheduledTripSummary) => {
    try {
      const res = await fetch(`/api/seats?route=${routeId}&date=${travelDate}&tripId=${trip.tripId}`)
      const data = await res.json()
      if (data.seats) {
        const takenMap: Record<string, 'M' | 'F'> = {}
        for (const [sId, entry] of Object.entries(data.seats as Record<string, any>)) {
          if (entry.state === 'CONFIRMED' || entry.state === 'BOOKED' || entry.taken) {
            takenMap[sId] = entry.gender === 'female' || entry.gender === 'F' ? 'F' : 'M'
          }
        }
        setTakenSeats(takenMap)
      }
    } catch {
      // Fallback
    }
  }

  useEffect(() => {
    if (selectedTrip) {
      setSelectedSeats([])
      setPassengers([])
      fetchLiveSeats(selectedTrip)
      const currentRoute = ROUTES[routeId]
      setPickupStop(currentRoute?.boardingPoints[0] || 'Office · 6:30 AM')
      setDropStop(currentRoute?.dropPoints[0] || 'Wakadewadi')
    }
  }, [selectedTrip])

  // Handle seat click
  const toggleSeat = (seatId: string) => {
    if (takenSeats[seatId]) return

    if (selectedSeats.includes(seatId)) {
      setSelectedSeats((prev) => prev.filter((s) => s !== seatId))
      setPassengers((prev) => prev.filter((p) => p.seat !== seatId))
    } else {
      if (selectedSeats.length >= 6) {
        alert('Maximum 6 seats per counter ticket.')
        return
      }
      setSelectedSeats((prev) => [...prev, seatId])
      setPassengers((prev) => [
        ...prev,
        {
          seat: seatId,
          name: '',
          age: '30',
          gender: 'male',
        },
      ])
    }
  }

  // Update passenger details
  const updatePassenger = (seatId: string, field: keyof ManualPassengerInput, val: string) => {
    setPassengers((prev) =>
      prev.map((p) => (p.seat === seatId ? { ...p, [field]: val } : p))
    )
  }

  // Submit Manual Booking
  const handleIssueTicket = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedTrip) {
      setErrorMsg('Please select a scheduled bus trip.')
      return
    }
    if (selectedSeats.length === 0) {
      setErrorMsg('Please select at least one available seat on the chart.')
      return
    }
    for (const p of passengers) {
      if (!p.name.trim()) {
        setErrorMsg(`Please enter passenger name for Seat ${p.seat}.`)
        return
      }
    }
    if (!/^\d{10}$/.test(contactMobile.trim())) {
      setErrorMsg('Please enter a valid 10-digit mobile number.')
      return
    }

    setSubmitting(true)
    setErrorMsg('')

    try {
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
        passengers: passengers.map((p) => ({
          seat: p.seat,
          name: p.name.trim(),
          age: parseInt(p.age, 10) || 28,
          gender: p.gender,
        })),
        contactMobile: contactMobile.trim(),
        paymentMethod,
        farePerSeat: customFare,
        notes,
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
      // Refresh seats
      if (selectedTrip) fetchLiveSeats(selectedTrip)
    } catch (err: any) {
      setErrorMsg(err.message || 'Error executing manual booking')
    } finally {
      setSubmitting(false)
    }
  }

  // Active template layout
  const template: BusLayoutTemplate = selectedTrip
    ? getBusTemplate(selectedTrip.templateId)
    : BUS_TEMPLATES.BUS_55

  const totalFare = customFare * selectedSeats.length

  return (
    <div className="space-y-6">
      {/* Step Header */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase tracking-wider">
              Admin Direct Counter Booking
            </span>
            <span className="text-xs text-gray-500 font-semibold">Instant Ticket &amp; Cash / UPI Issue</span>
          </div>
          <h2 className="text-xl font-extrabold text-gray-900">
            Manual Ticket Booking &amp; Passenger Registration
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Issue walk-in and telephone booking tickets with instant PNR generation and zero gateway deduction.
          </p>
        </div>

        {/* Route & Date selectors */}
        <div className="flex items-center gap-3">
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

          <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-xl">
            <Calendar size={14} className="text-gray-400" />
            <input
              type="date"
              value={travelDate}
              onChange={(e) => setTravelDate(e.target.value)}
              className="bg-transparent text-xs font-bold text-gray-800 focus:outline-hidden"
            />
          </div>
        </div>
      </div>

      {/* Confirmed Ticket Modal / Card (If ticket was just booked) */}
      {confirmedResult && (
        <div className="bg-gradient-to-br from-emerald-50 via-white to-emerald-50/30 rounded-2xl border-2 border-emerald-300 p-6 shadow-md animate-in fade-in duration-300">
          <div className="flex items-center justify-between pb-4 border-b border-emerald-200">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-xs">
                <CheckCircle2 size={28} />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md">
                  ✓ Ticket Confirmed &amp; Issued
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
                className="px-4 py-2 bg-gray-900 hover:bg-black text-white text-xs font-bold rounded-xl transition-colors inline-flex items-center gap-1.5 shadow-xs"
              >
                <Printer size={14} /> Print Receipt
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfirmedResult(null)
                  setSelectedSeats([])
                  setPassengers([])
                  setContactMobile('')
                }}
                className="px-4 py-2 bg-[#F8B018] hover:bg-[#e09b0b] text-gray-950 text-xs font-bold rounded-xl transition-colors inline-flex items-center gap-1.5 shadow-xs"
              >
                <Plus size={14} /> Book Another Ticket
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 text-xs">
            <div>
              <span className="text-gray-500 block">Route &amp; Date:</span>
              <strong className="text-gray-900 text-sm font-bold">
                {ROUTES[routeId]?.name} · {travelDate}
              </strong>
            </div>
            <div>
              <span className="text-gray-500 block">Bus &amp; Departure:</span>
              <strong className="text-gray-900 text-sm font-bold">
                {confirmedResult.ticket?.busNumber} · {confirmedResult.ticket?.pickup?.pickupTime}
              </strong>
            </div>
            <div>
              <span className="text-gray-500 block">Confirmed Seats:</span>
              <strong className="text-emerald-700 text-sm font-black font-mono">
                {confirmedResult.ticket?.passengers?.map((p: any) => p.seat).join(', ')}
              </strong>
            </div>
            <div>
              <span className="text-gray-500 block">Total Amount Collected:</span>
              <strong className="text-gray-900 text-sm font-black font-mono">
                ₹{(confirmedResult.ticket?.fare?.totalPaise / 100).toFixed(2)} ({confirmedResult.ticket?.payment?.method})
              </strong>
            </div>
          </div>
        </div>
      )}

      {/* Select Trip & Bus Pill Selector */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
            Step 1: Choose Bus &amp; Departure Schedule
          </span>
          {scheduledTrips.length === 0 && !loadingTrips && (
            <span className="text-xs text-rose-600 font-bold">
              No trips scheduled for this date. Please create one in the Scheduler tab first.
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
                  <div className="text-xs font-bold text-gray-800">{trip.busName}</div>
                  <div className="text-[11px] text-gray-500 font-mono mt-0.5 flex justify-between">
                    <span>{trip.busNumber}</span>
                    <strong className="text-emerald-700 font-bold">₹{trip.fare} / seat</strong>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Main 2-Column Interface: Visual Seat Chart on Left, Passenger Booking Form on Right */}
      {selectedTrip && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Visual Bus Seat Map (55, 44, or 33 Layout) */}
          <div className="lg:col-span-7 bg-white rounded-2xl border border-gray-200 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-gray-500 block">
                  Step 2: Select Available Seat(s)
                </span>
                <h3 className="text-base font-extrabold text-gray-900">
                  {template.name} ({template.capacity} Seats · {template.layoutType} Layout)
                </h3>
              </div>
              <div className="flex items-center gap-3 text-xs font-medium">
                <span className="flex items-center gap-1.5 text-gray-600">
                  <span className="w-3.5 h-3.5 rounded-md border border-gray-300 bg-white inline-block" /> Available
                </span>
                <span className="flex items-center gap-1.5 text-gray-600">
                  <span className="w-3.5 h-3.5 rounded-md bg-[#F8B018] inline-block" /> Selected
                </span>
                <span className="flex items-center gap-1.5 text-gray-600">
                  <span className="w-3.5 h-3.5 rounded-md bg-gray-400 inline-block" /> Booked
                </span>
              </div>
            </div>

            {/* Visual Bus Hull */}
            <div className="max-w-md mx-auto bg-gray-50 rounded-2xl border-2 border-dashed border-gray-300 p-4 space-y-3">
              {/* Driver & Cabin Header */}
              <div className="flex justify-between items-center pb-2 border-b border-gray-200 text-xs font-bold text-gray-400">
                <span className="text-[11px] uppercase tracking-wider">Entry Door &rarr;</span>
                <span className="px-2.5 py-0.5 bg-gray-200 text-gray-700 rounded-md text-[10px] font-mono">
                  Driver Cabin 🛞
                </span>
              </div>

              {/* Front Cabin Seats if any */}
              {template.frontSeats.length > 0 && (
                <div className="flex justify-end gap-2 pb-2 border-b border-gray-200">
                  {template.frontSeats.map((sId) => {
                    const isTaken = !!takenSeats[sId]
                    const isSelected = selectedSeats.includes(sId)
                    return (
                      <button
                        key={sId}
                        type="button"
                        disabled={isTaken}
                        onClick={() => toggleSeat(sId)}
                        className={`w-10 h-10 rounded-xl text-xs font-black font-mono transition-all flex items-center justify-center border ${
                          isTaken
                            ? 'bg-gray-300 text-gray-500 border-gray-400 cursor-not-allowed'
                            : isSelected
                            ? 'bg-[#F8B018] text-white border-amber-600 shadow-md scale-105'
                            : 'bg-white text-gray-800 border-gray-300 hover:border-[#F8B018]'
                        }`}
                      >
                        {sId}
                      </button>
                    )
                  })}
                </div>
              )}

              {/* Rows */}
              <div className="space-y-2">
                {template.rows.map((row) => (
                  <div key={row.rowLabel} className="flex items-center justify-between gap-2">
                    {/* Left Seats */}
                    <div className="flex items-center gap-1.5">
                      {row.leftSeats.map((sId) => {
                        const isTaken = !!takenSeats[sId]
                        const isSelected = selectedSeats.includes(sId)
                        return (
                          <button
                            key={sId}
                            type="button"
                            disabled={isTaken}
                            onClick={() => toggleSeat(sId)}
                            className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl text-xs font-black font-mono transition-all flex items-center justify-center border ${
                              isTaken
                                ? 'bg-gray-300 text-gray-500 border-gray-400 cursor-not-allowed'
                                : isSelected
                                ? 'bg-[#F8B018] text-white border-amber-600 shadow-md scale-105'
                                : 'bg-white text-gray-800 border-gray-300 hover:border-[#F8B018]'
                            }`}
                          >
                            {sId}
                          </button>
                        )
                      })}
                    </div>

                    {/* Aisle Spacer */}
                    <span className="text-[10px] text-gray-300 font-mono select-none px-1">
                      {row.rowLabel}
                    </span>

                    {/* Right Seats */}
                    <div className="flex items-center gap-1.5">
                      {row.rightSeats.map((sId) => {
                        const isTaken = !!takenSeats[sId]
                        const isSelected = selectedSeats.includes(sId)
                        return (
                          <button
                            key={sId}
                            type="button"
                            disabled={isTaken}
                            onClick={() => toggleSeat(sId)}
                            className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl text-xs font-black font-mono transition-all flex items-center justify-center border ${
                              isTaken
                                ? 'bg-gray-300 text-gray-500 border-gray-400 cursor-not-allowed'
                                : isSelected
                                ? 'bg-[#F8B018] text-white border-amber-600 shadow-md scale-105'
                                : 'bg-white text-gray-800 border-gray-300 hover:border-[#F8B018]'
                            }`}
                          >
                            {sId}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {/* Rear Bench */}
              {template.rearBench.length > 0 && (
                <div className="pt-2 border-t border-gray-200">
                  <div className="text-[10px] text-gray-400 text-center uppercase tracking-widest mb-1.5 font-bold">
                    Rear 6-Seat Bench
                  </div>
                  <div className="flex justify-between gap-1">
                    {template.rearBench.map((sId) => {
                      const isTaken = !!takenSeats[sId]
                      const isSelected = selectedSeats.includes(sId)
                      return (
                        <button
                          key={sId}
                          type="button"
                          disabled={isTaken}
                          onClick={() => toggleSeat(sId)}
                          className={`flex-1 h-9 rounded-xl text-xs font-black font-mono transition-all flex items-center justify-center border ${
                            isTaken
                              ? 'bg-gray-300 text-gray-500 border-gray-400 cursor-not-allowed'
                              : isSelected
                              ? 'bg-[#F8B018] text-white border-amber-600 shadow-md scale-105'
                              : 'bg-white text-gray-800 border-gray-300 hover:border-[#F8B018]'
                          }`}
                        >
                          {sId}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Passenger & Counter Booking Form */}
          <div className="lg:col-span-5 bg-white rounded-2xl border border-gray-200 p-6 shadow-xs space-y-5">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500 block">
                Step 3: Passenger &amp; Payment Details
              </span>
              <h3 className="text-base font-extrabold text-gray-900">
                {selectedSeats.length === 0
                  ? 'Please select seat(s) on chart'
                  : `Booking ${selectedSeats.length} Seat(s): ${selectedSeats.join(', ')}`}
              </h3>
            </div>

            {errorMsg && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-900 rounded-xl text-xs flex items-start gap-2">
                <AlertCircle size={16} className="text-rose-600 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleIssueTicket} className="space-y-4">
              {/* Passenger Inputs */}
              {passengers.map((p, idx) => (
                <div key={p.seat} className="p-3 bg-gray-50 rounded-xl border border-gray-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-amber-900 bg-amber-100 px-2 py-0.5 rounded-md font-mono">
                      Seat {p.seat}
                    </span>
                    <span className="text-[11px] text-gray-400 font-medium">Passenger {idx + 1}</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                    <div className="sm:col-span-6">
                      <label className="text-[10px] text-gray-500 uppercase font-bold block mb-0.5">Full Name</label>
                      <input
                        type="text"
                        value={p.name}
                        onChange={(e) => updatePassenger(p.seat, 'name', e.target.value)}
                        placeholder="e.g. Ramesh Patil"
                        required
                        className="w-full bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-900 font-semibold focus:outline-hidden focus:border-[#F8B018]"
                      />
                    </div>
                    <div className="sm:col-span-3">
                      <label className="text-[10px] text-gray-500 uppercase font-bold block mb-0.5">Age</label>
                      <input
                        type="number"
                        min="1"
                        max="120"
                        value={p.age}
                        onChange={(e) => updatePassenger(p.seat, 'age', e.target.value)}
                        required
                        className="w-full bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-900 font-semibold focus:outline-hidden focus:border-[#F8B018]"
                      />
                    </div>
                    <div className="sm:col-span-3">
                      <label className="text-[10px] text-gray-500 uppercase font-bold block mb-0.5">Gender</label>
                      <select
                        value={p.gender}
                        onChange={(e) => updatePassenger(p.seat, 'gender', e.target.value as any)}
                        className="w-full bg-white border border-gray-200 rounded-lg px-2 py-1.5 text-xs text-gray-900 font-semibold focus:outline-hidden focus:border-[#F8B018]"
                      >
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                      </select>
                    </div>
                  </div>
                </div>
              ))}

              {/* Contact Mobile */}
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">
                  Passenger Mobile Number (10 Digits) *
                </label>
                <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
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

              {/* Pickup & Drop Stops */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-bold text-gray-700 block mb-1">Boarding Point</label>
                  <input
                    type="text"
                    value={pickupStop}
                    onChange={(e) => setPickupStop(e.target.value)}
                    required
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold text-gray-900 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-gray-700 block mb-1">Dropping Point</label>
                  <input
                    type="text"
                    value={dropStop}
                    onChange={(e) => setDropStop(e.target.value)}
                    required
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold text-gray-900 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Payment Mode Selection */}
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">Payment Collection Mode</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('CASH')}
                    className={`p-2.5 rounded-xl border flex items-center justify-center gap-2 text-xs font-bold transition-all ${
                      paymentMethod === 'CASH'
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-900 shadow-xs'
                        : 'border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <Banknote size={16} /> Cash at Office
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('COUNTER_UPI')}
                    className={`p-2.5 rounded-xl border flex items-center justify-center gap-2 text-xs font-bold transition-all ${
                      paymentMethod === 'COUNTER_UPI'
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-900 shadow-xs'
                        : 'border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <QrCode size={16} /> Counter UPI QR
                  </button>
                </div>
              </div>

              {/* Total Calculation & Fare Rate */}
              <div className="p-3.5 bg-gray-900 text-white rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-gray-400 uppercase tracking-widest block font-bold">
                    Total Amount to Collect
                  </span>
                  <div className="text-2xl font-black font-mono text-[#F8B018]">
                    ₹{totalFare.toFixed(2)}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-gray-400 block font-bold">Rate / Seat: ₹{customFare}</span>
                  <span className="text-xs font-bold text-gray-300">
                    {selectedSeats.length} Seat{selectedSeats.length !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>

              {/* Submit CTA */}
              <button
                type="submit"
                disabled={submitting || selectedSeats.length === 0}
                className="w-full py-3.5 bg-[#F8B018] hover:bg-[#e09b0b] disabled:bg-gray-200 disabled:text-gray-400 text-gray-950 font-black text-sm rounded-xl transition-all shadow-md flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" /> Issuing Ticket...
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
    </div>
  )
}
