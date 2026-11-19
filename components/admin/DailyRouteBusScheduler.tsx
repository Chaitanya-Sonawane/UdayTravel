'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Bus,
  Calendar,
  Clock,
  DollarSign,
  Grid3X3,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  RefreshCw,
  Armchair,
  Layers,
  ChevronRight,
  Shield,
  Loader2,
  Sparkles,
  ArrowRight,
  UserCheck,
} from 'lucide-react'
import { RouteId, ROUTES } from '@/lib/config/routes'
import { todayIST, weekdayLabel } from '@/lib/time/ist'
import {
  BUS_TEMPLATES,
  BusTemplateId,
  BusLayoutTemplate,
  getBusTemplate,
} from '@/lib/domain/seats/bus-templates'
import { DEFAULT_BUSES, BusDocument } from '@/lib/data/buses.constants'

type SeatState = 'available' | 'blocked' | 'female' | 'male'

function getNextDate(dateStr: string, daysAhead = 1): string {
  const d = new Date(`${dateStr}T12:00:00+05:30`)
  d.setDate(d.getDate() + daysAhead)
  return d.toISOString().slice(0, 10)
}

function calculateArrival(departureTime: string, durationMinutes = 195): string {
  const [hStr, mStr] = departureTime.split(':')
  const h = parseInt(hStr || '0', 10)
  const m = parseInt(mStr || '0', 10)
  if (isNaN(h) || isNaN(m)) return '09:15'
  const total = h * 60 + m + durationMinutes
  const finalH = Math.floor(total / 60) % 24
  const finalM = total % 60
  return `${String(finalH).padStart(2, '0')}:${String(finalM).padStart(2, '0')}`
}

export function DailyRouteBusScheduler() {
  const today = useMemo(() => todayIST(), [])
  const tomorrow = useMemo(() => getNextDate(today, 1), [today])
  const maxDate = useMemo(() => getNextDate(today, 30), [today])

  // Step 1: Route & Date State
  const [selectedRoute, setSelectedRoute] = useState<RouteId>('AHM_PUN')
  const [selectedDate, setSelectedDate] = useState<string>(today)

  // Step 2: Bus Selection State
  const [selectedBusId, setSelectedBusId] = useState<string>('bus_mh16dp4951')
  const fleetBuses: BusDocument[] = DEFAULT_BUSES

  const currentBus = useMemo(
    () => fleetBuses.find((b) => b.id === selectedBusId) || fleetBuses[0]!,
    [fleetBuses, selectedBusId]
  )

  const templateId = (currentBus.templateId || 'BUS_55') as BusTemplateId
  const activeTemplate: BusLayoutTemplate = useMemo(
    () => getBusTemplate(templateId),
    [templateId]
  )

  // Step 3: Seat Pattern Customization State
  const [seatConfig, setSeatConfig] = useState<Record<string, SeatState>>({})
  const [activeTool, setActiveTool] = useState<SeatState>('available')

  // Step 4: Trip Timetable & Fare State
  const [departureTime, setDepartureTime] = useState('06:00')
  const [arrivalTime, setArrivalTime] = useState('09:15')
  const [fare, setFare] = useState<number>(200)

  // Published trips on selected route/date
  const [scheduledTrips, setScheduledTrips] = useState<any[]>([])
  const [loadingSchedule, setLoadingSchedule] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [actionNotice, setActionNotice] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

  // Reset or initialize seat map when template changes
  useEffect(() => {
    const initialMap: Record<string, SeatState> = {}
    activeTemplate.allSeatIds.forEach((sId) => {
      initialMap[sId] = 'available'
    })
    setSeatConfig(initialMap)
  }, [activeTemplate])

  // Fetch scheduled trips for current route & date
  const fetchDailyTrips = useCallback(async () => {
    setLoadingSchedule(true)
    setActionNotice(null)
    try {
      const res = await fetch(`/api/admin/schedule?route=${selectedRoute}&date=${selectedDate}`)
      if (res.ok) {
        const data = await res.json()
        setScheduledTrips(data.trips || [])
      }
    } catch (err) {
      console.warn('Failed to load trips:', err)
    } finally {
      setLoadingSchedule(false)
    }
  }, [selectedRoute, selectedDate])

  useEffect(() => {
    fetchDailyTrips()
  }, [fetchDailyTrips])

  // Auto-update arrival time when departure time changes
  const handleDepartureChange = (newDep: string) => {
    setDepartureTime(newDep)
    setArrivalTime(calculateArrival(newDep))
  }

  // Seat toggle handler
  const handleSeatClick = (seatId: string) => {
    setSeatConfig((prev) => ({
      ...prev,
      [seatId]: prev[seatId] === activeTool ? 'available' : activeTool,
    }))
  }

  // Quick bulk presets
  const applyPreset = (preset: 'all-available' | 'ladies-front' | 'conductor-seat' | 'sample-bookings') => {
    const newMap: Record<string, SeatState> = {}
    activeTemplate.allSeatIds.forEach((id) => {
      newMap[id] = 'available'
    })

    if (preset === 'ladies-front') {
      // Set rows A & B (or 1-8 for 33 seater) to female
      activeTemplate.allSeatIds.forEach((id) => {
        if (id.startsWith('A') || id.startsWith('B') || ['1', '2', '3', '4', '5', '6', '7', '8'].includes(id)) {
          newMap[id] = 'female'
        }
      })
    } else if (preset === 'conductor-seat') {
      // Block front seat 1 or rear seat
      const conductorSeat = activeTemplate.frontSeats[0] || activeTemplate.allSeatIds[0]!
      newMap[conductorSeat] = 'blocked'
    } else if (preset === 'sample-bookings') {
      // Simulate 10 bookings
      activeTemplate.allSeatIds.slice(0, 10).forEach((id, idx) => {
        newMap[id] = idx % 2 === 0 ? 'male' : 'female'
      })
    }

    setSeatConfig(newMap)
  }

  // Counters
  const seatStats = useMemo(() => {
    const values = Object.values(seatConfig)
    const available = values.filter((s) => s === 'available').length
    const blocked = values.filter((s) => s === 'blocked').length
    const female = values.filter((s) => s === 'female').length
    const male = values.filter((s) => s === 'male').length
    return {
      total: activeTemplate.capacity,
      available,
      blocked,
      female,
      male,
    }
  }, [seatConfig, activeTemplate])

  // Submit & Publish Route for Day
  const handleCreateRouteSchedule = async (e: React.FormEvent) => {
    e.preventDefault()
    setPublishing(true)
    setActionNotice(null)

    try {
      const res = await fetch('/api/admin/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          routeId: selectedRoute,
          date: selectedDate,
          busId: currentBus.id,
          busNumber: currentBus.busNumber,
          busName: currentBus.busName,
          templateId: currentBus.templateId,
          departureTime,
          arrivalTime,
          fare: Number(fare),
          seatConfig,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error?.message || 'Failed to create schedule')
      }

      setActionNotice({
        type: 'success',
        text: `✓ Route scheduled! ${currentBus.busName} (${currentBus.busNumber}) published for ${selectedDate} at ${departureTime}.`,
      })

      await fetchDailyTrips()
    } catch (err: any) {
      setActionNotice({
        type: 'error',
        text: err.message || 'Error publishing route schedule',
      })
    } finally {
      setPublishing(false)
    }
  }

  // Delete trip
  const handleDeleteTrip = async (tripId: string, name: string) => {
    if (!window.confirm(`Delete bus schedule "${name}"? This removes it from user booking.`)) {
      return
    }
    try {
      const res = await fetch(
        `/api/admin/schedule?route=${selectedRoute}&date=${selectedDate}&tripId=${tripId}`,
        { method: 'DELETE' }
      )
      if (res.ok) {
        setActionNotice({
          type: 'success',
          text: `✓ Schedule ${name} deleted successfully.`,
        })
        await fetchDailyTrips()
      }
    } catch {
      setActionNotice({ type: 'error', text: 'Network error deleting schedule' })
    }
  }

  return (
    <div className="space-y-8">
      {/* Toast Feedback Notice */}
      {actionNotice && (
        <div
          className={`p-4 rounded-2xl flex items-center gap-3 border shadow-xs animate-in fade-in duration-200 ${
            actionNotice.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          {actionNotice.type === 'success' ? (
            <CheckCircle2 size={18} className="shrink-0 text-emerald-600" />
          ) : (
            <AlertCircle size={18} className="shrink-0 text-red-600" />
          )}
          <span className="text-sm font-bold">{actionNotice.text}</span>
        </div>
      )}

      {/* Main Creation Card */}
      <form onSubmit={handleCreateRouteSchedule} className="bg-white rounded-3xl border border-gray-200 p-6 md:p-8 space-y-8 shadow-xs">
        {/* Title Header */}
        <div className="border-b border-gray-100 pb-5">
          <div className="flex items-center gap-2">
            <span className="h-8 w-8 rounded-xl bg-[#F8B018] text-white flex items-center justify-center font-black text-sm">
              1
            </span>
            <h2 className="text-xl font-extrabold text-gray-900 tracking-tight">
              Create Route for the Day with Bus & Seat Pattern Selection
            </h2>
          </div>
          <p className="text-xs text-gray-500 mt-1 pl-10">
            Define daily route departures, assign official fleet coaches (55/44/33 seater), customize seating patterns, and publish live to passengers.
          </p>
        </div>

        {/* STEP 1A: SELECT ROUTE DIRECTION & OPERATIONAL DATE */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-gray-500">
            <span className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center text-gray-700">A</span>
            <span>Select Route Direction & Date</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Route Direction Cards */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-700 block">Route Direction</label>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setSelectedRoute('AHM_PUN')}
                  className={`p-3.5 rounded-2xl border text-left transition-all ${
                    selectedRoute === 'AHM_PUN'
                      ? 'border-[#F8B018] bg-[#FFFDF5] shadow-xs ring-2 ring-[#F8B018]/20'
                      : 'border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-700'
                  }`}
                >
                  <span className="text-[10px] text-[#92400E] font-extrabold uppercase tracking-wider block">
                    Origin → Destination
                  </span>
                  <strong className="text-sm font-extrabold text-gray-900 block mt-0.5">
                    Ahilyanagar → Pune
                  </strong>
                  <span className="text-[11px] text-gray-500 block mt-0.5">Via Supa & Shirur</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedRoute('PUN_AHM')}
                  className={`p-3.5 rounded-2xl border text-left transition-all ${
                    selectedRoute === 'PUN_AHM'
                      ? 'border-[#F8B018] bg-[#FFFDF5] shadow-xs ring-2 ring-[#F8B018]/20'
                      : 'border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-700'
                  }`}
                >
                  <span className="text-[10px] text-[#92400E] font-extrabold uppercase tracking-wider block">
                    Origin → Destination
                  </span>
                  <strong className="text-sm font-extrabold text-gray-900 block mt-0.5">
                    Pune → Ahilyanagar
                  </strong>
                  <span className="text-[11px] text-gray-500 block mt-0.5">Via Wakadewadi & Wagholi</span>
                </button>
              </div>
            </div>

            {/* Travel Date */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-700 block">Operational Schedule Date</label>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedDate(today)}
                  className={`px-4 py-2.5 text-xs font-bold rounded-xl border transition-all ${
                    selectedDate === today
                      ? 'border-[#F8B018] bg-[#F8B018] text-white shadow-xs'
                      : 'border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  Today ({today.slice(5)})
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedDate(tomorrow)}
                  className={`px-4 py-2.5 text-xs font-bold rounded-xl border transition-all ${
                    selectedDate === tomorrow
                      ? 'border-[#F8B018] bg-[#F8B018] text-white shadow-xs'
                      : 'border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  Tomorrow ({tomorrow.slice(5)})
                </button>

                <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
                  <Calendar size={15} className="text-[#F8B018]" />
                  <input
                    type="date"
                    min={today}
                    max={maxDate}
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="bg-transparent text-gray-900 text-xs font-bold outline-none cursor-pointer"
                  />
                </div>
              </div>
              <p className="text-[11px] text-gray-500 font-medium">
                Active date: <strong className="text-gray-800">{weekdayLabel(selectedDate)}, {selectedDate}</strong>
              </p>
            </div>
          </div>
        </div>

        {/* STEP 1B: BUS & FLEET SELECTION */}
        <div className="space-y-4 pt-4 border-t border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-gray-500">
              <span className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center text-gray-700">B</span>
              <span>Select Fleet Bus & Seating Template</span>
            </div>
            <span className="text-xs text-[#92400E] font-bold">
              3 Official Fleet Buses
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {fleetBuses.map((b) => {
              const isSelected = b.id === selectedBusId
              const tpl = getBusTemplate(b.templateId)
              return (
                <div
                  key={b.id}
                  onClick={() => setSelectedBusId(b.id)}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all relative ${
                    isSelected
                      ? 'border-[#F8B018] bg-[#FFFDF5] ring-2 ring-[#F8B018]/25 shadow-xs'
                      : 'border-gray-200 bg-gray-50/70 hover:bg-gray-100/80 text-gray-700'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <span className="text-[11px] font-mono font-extrabold px-2 py-0.5 rounded-lg bg-gray-200/70 text-gray-800">
                      {b.busNumber}
                    </span>
                    <span
                      className={`text-[10px] uppercase font-black px-2 py-0.5 rounded-full ${
                        b.templateId === 'BUS_55'
                          ? 'bg-amber-100 text-amber-900 border border-amber-200'
                          : b.templateId === 'BUS_44'
                          ? 'bg-blue-100 text-blue-900 border border-blue-200'
                          : 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                      }`}
                    >
                      {tpl.capacity} Seats · {tpl.layoutType}
                    </span>
                  </div>

                  <h3 className="font-extrabold text-sm text-gray-900 mt-2.5 leading-snug">
                    {b.busName}
                  </h3>

                  <div className="mt-2.5 pt-2 border-t border-gray-200/60 text-xs text-gray-600 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">Driver:</span>
                      <strong className="text-gray-800">{b.driverName}</strong>
                    </div>
                    <div className="flex items-center justify-between font-mono text-[11px]">
                      <span className="text-gray-400 font-sans">Contact:</span>
                      <span>{b.driverMobile}</span>
                    </div>
                  </div>

                  {isSelected && (
                    <div className="absolute -top-2 -right-2 w-6 h-6 bg-[#F8B018] text-white rounded-full flex items-center justify-center shadow-xs">
                      <CheckCircle2 size={15} />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* STEP 1C: SEAT PATTERN SELECTION & INTERACTIVE VISUAL MAP */}
        <div className="space-y-4 pt-4 border-t border-gray-100">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-gray-500">
              <span className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center text-gray-700">C</span>
              <span>Seat Pattern Customization · {activeTemplate.name} ({activeTemplate.capacity} Seats)</span>
            </div>

            {/* Quick Bulk Presets */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="text-[10px] text-gray-400 uppercase font-bold">Presets:</span>
              <button
                type="button"
                onClick={() => applyPreset('all-available')}
                className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-bold"
              >
                All Available
              </button>
              <button
                type="button"
                onClick={() => applyPreset('ladies-front')}
                className="px-2.5 py-1 bg-pink-50 hover:bg-pink-100 border border-pink-200 text-pink-800 rounded-lg font-bold"
              >
                Ladies Front Rows
              </button>
              <button
                type="button"
                onClick={() => applyPreset('conductor-seat')}
                className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 rounded-lg font-bold"
              >
                Reserve Conductor
              </button>
              <button
                type="button"
                onClick={() => applyPreset('sample-bookings')}
                className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-900 rounded-lg font-bold"
              >
                Simulate 10 Booked
              </button>
            </div>
          </div>

          {/* Tool Palette & Legend */}
          <div className="bg-gray-50 rounded-2xl border border-gray-200 p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <span className="text-xs font-bold uppercase text-gray-600">
                1. Select Seat Tool → 2. Click any seat on map to apply
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTool('available')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-xl border flex items-center gap-1.5 transition-all ${
                    activeTool === 'available'
                      ? 'bg-white border-emerald-500 text-emerald-800 ring-2 ring-emerald-200 shadow-xs'
                      : 'bg-white/70 border-gray-200 text-gray-700 hover:bg-white'
                  }`}
                >
                  <span className="w-2.5 h-2.5 rounded-full border border-gray-400 bg-white" />
                  <span>Available (Open)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTool('blocked')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-xl border flex items-center gap-1.5 transition-all ${
                    activeTool === 'blocked'
                      ? 'bg-amber-50 border-amber-500 text-amber-900 ring-2 ring-amber-200 shadow-xs'
                      : 'bg-white/70 border-gray-200 text-gray-700 hover:bg-white'
                  }`}
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  <span>Blocked / Conductor</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTool('female')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-xl border flex items-center gap-1.5 transition-all ${
                    activeTool === 'female'
                      ? 'bg-pink-50 border-pink-500 text-pink-900 ring-2 ring-pink-200 shadow-xs'
                      : 'bg-white/70 border-gray-200 text-gray-700 hover:bg-white'
                  }`}
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-pink-500" />
                  <span>Ladies Reserved</span>
                </button>
              </div>
            </div>

            {/* Real-time Seat Count Counters */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-gray-200/60 text-center">
              <div className="p-2 bg-white rounded-xl border border-gray-200">
                <span className="text-[10px] text-gray-500 uppercase font-bold block">Capacity</span>
                <strong className="text-base text-gray-900 font-mono">{seatStats.total} Seats</strong>
              </div>
              <div className="p-2 bg-white rounded-xl border border-emerald-200">
                <span className="text-[10px] text-emerald-700 uppercase font-bold block">Available</span>
                <strong className="text-base text-emerald-800 font-mono">{seatStats.available}</strong>
              </div>
              <div className="p-2 bg-white rounded-xl border border-amber-200">
                <span className="text-[10px] text-amber-700 uppercase font-bold block">Blocked / Staff</span>
                <strong className="text-base text-amber-900 font-mono">{seatStats.blocked}</strong>
              </div>
              <div className="p-2 bg-white rounded-xl border border-pink-200">
                <span className="text-[10px] text-pink-700 uppercase font-bold block">Ladies Reserved</span>
                <strong className="text-base text-pink-900 font-mono">{seatStats.female}</strong>
              </div>
            </div>
          </div>

          {/* Interactive Bus Seat Layout Matrix */}
          <div className="bg-gray-50 border border-gray-200 rounded-3xl p-6 max-w-lg mx-auto shadow-inner space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-200 text-xs">
              <div className="flex items-center gap-2 font-extrabold text-gray-800 uppercase tracking-wider">
                <Bus size={18} className="text-[#F8B018]" />
                <span>Front / Driver Cabin</span>
              </div>
              <span className="text-gray-400 font-mono text-[11px]">Door 🚪</span>
            </div>

            {/* Front Cabin Seats if applicable */}
            {activeTemplate.frontSeats.length > 0 && (
              <div className="flex items-center justify-end gap-2 pb-3 border-b border-gray-200/80">
                <span className="text-[11px] text-gray-400 font-medium mr-2">Front Cabin:</span>
                {activeTemplate.frontSeats.map((sId) => {
                  const state = seatConfig[sId] || 'available'
                  return (
                    <button
                      key={sId}
                      type="button"
                      onClick={() => handleSeatClick(sId)}
                      className={`w-9 h-9 rounded-xl font-mono text-xs font-extrabold border flex items-center justify-center transition-transform hover:scale-105 ${
                        state === 'blocked'
                          ? 'bg-amber-100 border-amber-400 text-amber-900'
                          : state === 'female'
                          ? 'bg-pink-100 border-pink-400 text-pink-900'
                          : state === 'male'
                          ? 'bg-blue-100 border-blue-400 text-blue-900'
                          : 'bg-white border-gray-300 text-gray-800 hover:border-[#F8B018]'
                      }`}
                      title={`Seat ${sId} (${state})`}
                    >
                      {sId}
                    </button>
                  )
                })}
              </div>
            )}

            {/* Rows A to I */}
            <div className="space-y-2">
              {activeTemplate.rows.map((row) => (
                <div key={row.rowLabel} className="flex items-center justify-between gap-2">
                  <span className="w-5 text-center text-xs font-mono font-bold text-gray-400">
                    {row.rowLabel}
                  </span>

                  {/* Left Side */}
                  <div className="flex items-center gap-2">
                    {row.leftSeats.map((sId) => {
                      const state = seatConfig[sId] || 'available'
                      return (
                        <button
                          key={sId}
                          type="button"
                          onClick={() => handleSeatClick(sId)}
                          className={`w-9 h-9 rounded-xl font-mono text-xs font-extrabold border flex items-center justify-center transition-transform hover:scale-105 ${
                            state === 'blocked'
                              ? 'bg-amber-100 border-amber-400 text-amber-900'
                              : state === 'female'
                              ? 'bg-pink-100 border-pink-400 text-pink-900'
                              : state === 'male'
                              ? 'bg-blue-100 border-blue-400 text-blue-900'
                              : 'bg-white border-gray-300 text-gray-800 hover:border-[#F8B018]'
                          }`}
                          title={`Seat ${sId} (${state})`}
                        >
                          {sId}
                        </button>
                      )
                    })}
                  </div>

                  {/* Center Aisle */}
                  <div className="h-6 flex items-center justify-center text-gray-300 text-[9px] font-mono select-none px-1">
                    |
                  </div>

                  {/* Right Side */}
                  <div className="flex items-center gap-2">
                    {row.rightSeats.map((sId) => {
                      const state = seatConfig[sId] || 'available'
                      return (
                        <button
                          key={sId}
                          type="button"
                          onClick={() => handleSeatClick(sId)}
                          className={`w-9 h-9 rounded-xl font-mono text-xs font-extrabold border flex items-center justify-center transition-transform hover:scale-105 ${
                            state === 'blocked'
                              ? 'bg-amber-100 border-amber-400 text-amber-900'
                              : state === 'female'
                              ? 'bg-pink-100 border-pink-400 text-pink-900'
                              : state === 'male'
                              ? 'bg-blue-100 border-blue-400 text-blue-900'
                              : 'bg-white border-gray-300 text-gray-800 hover:border-[#F8B018]'
                          }`}
                          title={`Seat ${sId} (${state})`}
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
            {activeTemplate.rearBench.length > 0 && (
              <div className="pt-3 border-t border-gray-200">
                <span className="text-[10px] text-gray-400 uppercase font-bold block text-center mb-1.5">
                  Rear Bench ({activeTemplate.rearBench.length} Seats)
                </span>
                <div className="flex items-center justify-center gap-1.5">
                  {activeTemplate.rearBench.map((sId) => {
                    const state = seatConfig[sId] || 'available'
                    return (
                      <button
                        key={sId}
                        type="button"
                        onClick={() => handleSeatClick(sId)}
                        className={`w-9 h-9 rounded-xl font-mono text-xs font-extrabold border flex items-center justify-center transition-transform hover:scale-105 ${
                          state === 'blocked'
                            ? 'bg-amber-100 border-amber-400 text-amber-900'
                            : state === 'female'
                            ? 'bg-pink-100 border-pink-400 text-pink-900'
                            : state === 'male'
                            ? 'bg-blue-100 border-blue-400 text-blue-900'
                            : 'bg-white border-gray-300 text-gray-800 hover:border-[#F8B018]'
                        }`}
                        title={`Seat ${sId} (${state})`}
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

        {/* STEP 1D: TRIP TIMETABLE & FARE PRICING */}
        <div className="space-y-4 pt-4 border-t border-gray-100">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-gray-500">
            <span className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center text-gray-700">D</span>
            <span>Departure Timetable & Ticket Pricing</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Departure Time */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700">Departure Time</label>
              <div className="flex items-center gap-2 bg-gray-50 border border-gray-300 rounded-xl px-3 py-2.5">
                <Clock size={16} className="text-[#F8B018]" />
                <input
                  type="time"
                  required
                  value={departureTime}
                  onChange={(e) => handleDepartureChange(e.target.value)}
                  className="bg-transparent text-sm font-bold text-gray-900 outline-none w-full"
                />
              </div>
              <div className="flex flex-wrap gap-1 mt-1">
                {['06:00', '07:30', '09:30', '14:00', '17:00'].map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => handleDepartureChange(t)}
                    className="text-[10px] px-1.5 py-0.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded font-mono font-semibold"
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Arrival Time */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700">Estimated Arrival Time</label>
              <div className="flex items-center gap-2 bg-gray-50 border border-gray-300 rounded-xl px-3 py-2.5">
                <Clock size={16} className="text-gray-400" />
                <input
                  type="time"
                  required
                  value={arrivalTime}
                  onChange={(e) => setArrivalTime(e.target.value)}
                  className="bg-transparent text-sm font-bold text-gray-900 outline-none w-full"
                />
              </div>
              <span className="text-[11px] text-gray-400">Duration: ~3 hours 15 mins</span>
            </div>

            {/* Fare */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700">Ticket Fare (₹ per seat)</label>
              <div className="flex items-center gap-2 bg-gray-50 border border-gray-300 rounded-xl px-3 py-2.5">
                <DollarSign size={16} className="text-emerald-600" />
                <input
                  type="number"
                  min="50"
                  max="5000"
                  required
                  value={fare}
                  onChange={(e) => setFare(Number(e.target.value))}
                  className="bg-transparent text-sm font-bold text-gray-900 outline-none w-full"
                />
              </div>
              <span className="text-[11px] text-gray-400">Standard Uday Travels Fare</span>
            </div>
          </div>
        </div>

        {/* SUBMIT BUTTON */}
        <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
          <div className="text-xs text-gray-500">
            Publishing saves directly to Firestore and reflects immediately on the user portal.
          </div>

          <button
            type="submit"
            disabled={publishing}
            className="inline-flex items-center gap-2.5 px-6 py-3.5 bg-[#F8B018] hover:bg-[#E09A0A] text-white font-extrabold text-sm uppercase tracking-wider rounded-2xl shadow-md shadow-[#F8B018]/25 transition-transform active:scale-95 disabled:opacity-50"
          >
            {publishing ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Plus size={18} />
            )}
            <span>Publish Route Schedule for {selectedDate}</span>
          </button>
        </div>
      </form>

      {/* SCHEDULED TRIPS LIST ON SELECTED ROUTE & DATE */}
      <div className="bg-white rounded-3xl border border-gray-200 p-6 md:p-8 space-y-5 shadow-xs">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-extrabold text-gray-900">
              Active Scheduled Departures ({scheduledTrips.length})
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Route: <strong className="text-gray-800">{ROUTES[selectedRoute].name}</strong> · Date:{' '}
              <strong className="text-gray-800">{weekdayLabel(selectedDate)}, {selectedDate}</strong>
            </p>
          </div>

          <button
            type="button"
            onClick={fetchDailyTrips}
            disabled={loadingSchedule}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl transition-colors"
          >
            <RefreshCw size={13} className={loadingSchedule ? 'animate-spin' : ''} />
            <span>Sync</span>
          </button>
        </div>

        {loadingSchedule ? (
          <div className="p-10 text-center text-gray-400 flex flex-col items-center gap-2 font-medium text-xs">
            <Loader2 size={24} className="animate-spin text-[#F8B018]" />
            <span>Loading scheduled trips...</span>
          </div>
        ) : scheduledTrips.length === 0 ? (
          <div className="p-8 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-300 text-gray-500 space-y-2">
            <Bus size={32} className="mx-auto text-gray-300" />
            <p className="text-sm font-bold text-gray-700">No scheduled departures yet for this date.</p>
            <p className="text-xs text-gray-400">
              Use the form above to assign a bus (55, 44, or 33-seater), customize seats, and publish.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {scheduledTrips.map((t) => (
              <div
                key={t.tripId}
                className="p-5 bg-gray-50/70 border border-gray-200 rounded-2xl space-y-3 hover:border-[#F8B018] transition-colors relative"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-extrabold text-sm text-gray-900">{t.busName}</h4>
                      {t.templateId && (
                        <span className="text-[10px] bg-amber-100 text-amber-900 border border-amber-200 font-extrabold px-1.5 py-0.2 rounded-md">
                          {t.templateId}
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] font-mono text-gray-500 font-bold block mt-0.5">
                      {t.busNumber || 'Fleet Vehicle'}
                    </span>
                  </div>

                  <span className="text-xs font-extrabold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-lg">
                    ₹{t.fare}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs text-gray-600 font-medium pt-1">
                  <div className="flex items-center gap-1.5">
                    <Clock size={13} className="text-[#F8B018]" />
                    <span>
                      {t.departureTime} → {t.arrivalTime}
                    </span>
                  </div>
                  <div>
                    <span>Total Seats: </span>
                    <strong className="text-gray-900 font-mono">{t.totalSeats || t.totalCapacity || 55}</strong>
                  </div>
                </div>

                <div className="pt-2 border-t border-gray-200/60 flex items-center justify-between">
                  <a
                    href={`/availability?route=${selectedRoute}&date=${selectedDate}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-bold text-[#92400E] hover:underline flex items-center gap-1"
                  >
                    <span>Preview on User Site</span>
                    <ArrowRight size={12} />
                  </a>

                  <button
                    type="button"
                    onClick={() => handleDeleteTrip(t.tripId, t.busName)}
                    className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete this schedule"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
