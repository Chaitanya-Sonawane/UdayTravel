'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Route,
  UserPlus,
  Phone,
  MessageSquare,
  Search,
  Printer,
  Download,
  RefreshCw,
  MapPin,
  Clock,
  CheckCircle2,
  AlertCircle,
  Bus,
  Calendar,
  CheckSquare,
  Square,
  ChevronRight,
  Filter,
  Users,
  ShieldCheck,
  ExternalLink,
  X,
  UserCheck,
  Clock4,
  ArrowRight,
  Sparkles,
  Banknote,
} from 'lucide-react'
import { RouteId, ROUTES } from '@/lib/config/routes'
import { todayIST } from '@/lib/time/ist'
import {
  AHILYANAGAR_PICKUP_RAW,
  PUNE_DROP_RAW,
  PUNE_PICKUP_RAW,
} from '@/lib/routes/seed-data'
import { RoutePassengerRecord, StopCountBreakdown } from '@/app/api/admin/route-passengers/route'

function formatISTTime(isoString: string): string {
  try {
    const d = new Date(isoString)
    return new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).format(d)
  } catch {
    return ''
  }
}

function formatTimeAgo(isoString: string): string {
  try {
    const ms = Date.now() - new Date(isoString).getTime()
    if (ms < 0) return 'Just now'
    const mins = Math.floor(ms / 60000)
    if (mins < 60) return `${mins}m ago`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}h ago`
    return `${Math.floor(hours / 24)}d ago`
  } catch {
    return ''
  }
}

export function RouteWisePassengerSheet() {
  const [selectedRoute, setSelectedRoute] = useState<RouteId>('AHM_PUN')
  const [selectedDate, setSelectedDate] = useState<string>(todayIST())
  const [selectedTripId, setSelectedTripId] = useState<string>('ALL')
  const [availableTrips, setAvailableTrips] = useState<any[]>([])

  // Data state
  const [loading, setLoading] = useState(false)
  const [passengers, setPassengers] = useState<RoutePassengerRecord[]>([])
  const [stopBreakdown, setStopBreakdown] = useState<StopCountBreakdown[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'BOARDED'>('ALL')
  const [filterStop, setFilterStop] = useState<string>('ALL')
  const [actionNotice, setActionNotice] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

  // Add passenger modal state (Modal replaces cluttered inline form)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [savingPassenger, setSavingPassenger] = useState(false)
  const [newName, setNewName] = useState('')
  const [newMobile, setNewMobile] = useState('')
  const [newPickup, setNewPickup] = useState('')
  const [newDrop, setNewDrop] = useState('')
  const [newSeat, setNewSeat] = useState('')
  const [newGender, setNewGender] = useState<'male' | 'female'>('male')
  const [newAge, setNewAge] = useState('30')
  const [newTripId, setNewTripId] = useState('')

  const isAhmPun = selectedRoute === 'AHM_PUN'

  // Canonical stops for selected route
  const pickupStops = useMemo(
    () => (isAhmPun ? AHILYANAGAR_PICKUP_RAW : PUNE_PICKUP_RAW),
    [isAhmPun]
  )
  const dropStops = useMemo(
    () => (isAhmPun ? PUNE_DROP_RAW : AHILYANAGAR_PICKUP_RAW.map((p) => p.name)),
    [isAhmPun]
  )

  // Reset form stop selections on route change
  useEffect(() => {
    if (pickupStops.length > 0) setNewPickup(pickupStops[0]!.name)
    if (dropStops.length > 0) setNewDrop(dropStops[0]!)
  }, [pickupStops, dropStops])

  // 1. Fetch available trips for selected route & date
  const fetchTrips = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/schedule?route=${selectedRoute}&date=${selectedDate}`)
      const data = await res.json()
      const list = data.scheduledTrips || data.trips || []
      setAvailableTrips(list)
      if (list.length > 0 && !newTripId) {
        setNewTripId(list[0].tripId)
      }
    } catch {
      // Safe catch for departures fetch
    }
  }, [selectedRoute, selectedDate, newTripId])

  useEffect(() => {
    fetchTrips()
  }, [fetchTrips])

  // 2. Fetch route passengers in route-wise sorted order
  const fetchRoutePassengers = useCallback(async (isBackground = false) => {
    if (!isBackground) {
      setLoading(true)
      setActionNotice(null)
    }
    try {
      const tripParam = selectedTripId !== 'ALL' ? `&tripId=${selectedTripId}` : ''
      const res = await fetch(
        `/api/admin/route-passengers?route=${selectedRoute}&date=${selectedDate}${tripParam}`
      )
      const data = await res.json()
      if (data.success) {
        setPassengers(data.passengers || [])
        setStopBreakdown(data.stopBreakdown || [])
      } else {
        throw new Error(data.error || 'Failed to load route passengers')
      }
    } catch (err: any) {
      if (!isBackground) {
        setActionNotice({ type: 'error', text: err.message || 'Error fetching route passengers' })
      }
    } finally {
      if (!isBackground) {
        setLoading(false)
      }
    }
  }, [selectedRoute, selectedDate, selectedTripId])

  useEffect(() => {
    fetchRoutePassengers()
    const pollInterval = setInterval(() => {
      fetchRoutePassengers(true)
    }, 4000)
    return () => clearInterval(pollInterval)
  }, [fetchRoutePassengers])

  // 3. Save new passenger directly for this route
  const handleSavePassenger = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newName.trim() || !newMobile.trim()) {
      alert('Please enter passenger Name and Mobile number.')
      return
    }

    setSavingPassenger(true)
    setActionNotice(null)

    try {
      const res = await fetch('/api/admin/route-passengers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          routeId: selectedRoute,
          date: selectedDate,
          tripId: newTripId || (availableTrips[0]?.tripId ?? undefined),
          name: newName.trim(),
          mobile: newMobile.trim(),
          pickupStop: newPickup,
          dropStop: newDrop,
          seatNo: newSeat.trim() || undefined,
          gender: newGender,
          age: Number(newAge) || 30,
          fare: 200,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error?.message || data.error || 'Failed to save passenger')
      }

      setActionNotice({
        type: 'success',
        text: `✓ Added ${newName}! Ticket ${data.ticketNo} assigned at ${newPickup}.`,
      })

      // Reset form fields and close modal
      setNewName('')
      setNewMobile('')
      setNewSeat('')
      setIsModalOpen(false)

      // Refresh list
      await fetchRoutePassengers()
    } catch (err: any) {
      setActionNotice({ type: 'error', text: err.message || 'Error saving passenger' })
    } finally {
      setSavingPassenger(false)
    }
  }

  // 4. Toggle Boarding status
  const handleToggleBoarding = async (tripId: string, seatNo: string, currentStatus: boolean) => {
    try {
      const res = await fetch('/api/admin/manifest', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tripId,
          travelDate: selectedDate,
          seatNo,
          boarded: !currentStatus,
        }),
      })
      if (res.ok) {
        setPassengers((prev) =>
          prev.map((p) =>
            p.tripId === tripId && p.seatNo === seatNo ? { ...p, boarded: !currentStatus } : p
          )
        )
      }
    } catch {
      // Ignored
    }
  }

  // Active stops that actually have passenger bookings (eliminates zero-passenger button clutter)
  const activeBookedStops = useMemo(() => {
    return stopBreakdown.filter((s) => s.count > 0)
  }, [stopBreakdown])

  // Key metrics for executive glance
  const totalCount = passengers.length
  const totalFareCollected = useMemo(
    () => passengers.reduce((sum, p) => sum + (p.fare || 0), 0),
    [passengers]
  )
  const boardedCount = useMemo(() => passengers.filter((p) => p.boarded).length, [passengers])
  const pendingCount = totalCount - boardedCount
  const boardingPct = totalCount > 0 ? Math.round((boardedCount / totalCount) * 100) : 0

  // Filter passengers by search, status, and stop
  const filteredPassengers = useMemo(() => {
    return passengers.filter((p) => {
      // Status filter
      if (statusFilter === 'BOARDED' && !p.boarded) return false
      if (statusFilter === 'PENDING' && p.boarded) return false

      // Stop filter
      if (filterStop !== 'ALL' && p.pickupStop !== filterStop) {
        return false
      }

      // Search query
      if (!searchQuery.trim()) return true
      const q = searchQuery.toLowerCase().trim()
      return (
        p.name.toLowerCase().includes(q) ||
        p.mobile.includes(q) ||
        p.pickupStop.toLowerCase().includes(q) ||
        p.dropStop.toLowerCase().includes(q) ||
        p.seatNo.toLowerCase().includes(q) ||
        p.ticketNo.toLowerCase().includes(q)
      )
    })
  }, [passengers, statusFilter, filterStop, searchQuery])

  // Export to CSV
  const handleExportCSV = () => {
    if (passengers.length === 0) {
      alert('No passengers to export.')
      return
    }

    const headers = [
      'Sr No',
      'Name',
      'Phone Number',
      'Pickup Stop',
      'Pickup Sequence',
      'Pickup Time',
      'Drop Stop',
      'Seat No',
      'Ticket No',
      'Departure',
      'Bus Number',
      'Fare (INR)',
      'Boarded',
    ]

    const rows = passengers.map((p) => [
      p.srNo,
      `"${p.name.replace(/"/g, '""')}"`,
      `"${p.mobile}"`,
      `"${p.pickupStop}"`,
      p.pickupSequence,
      `"${p.pickupTime}"`,
      `"${p.dropStop}"`,
      `"${p.seatNo}"`,
      `"${p.ticketNo}"`,
      `"${p.departureTime}"`,
      `"${p.busNumber}"`,
      p.fare,
      p.boarded ? 'YES' : 'NO',
    ])

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n')

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute(
      'download',
      `Uday_Travels_Route_${selectedRoute}_${selectedDate}.csv`
    )
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Print Route Sheet
  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="space-y-5">
      {/* 1. Sleek Route & Date Control Bar */}
      <section className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4 print:hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Route Segmented Switcher */}
          <div className="flex items-center gap-2">
            <div className="inline-flex p-1 bg-gray-100 rounded-xl border border-gray-200">
              <button
                type="button"
                onClick={() => {
                  setSelectedRoute('AHM_PUN')
                  setFilterStop('ALL')
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
                  selectedRoute === 'AHM_PUN'
                    ? 'bg-[#F8B018] text-gray-950 shadow-xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <span>Ahilyanagar &rarr; Pune</span>
                <span className="text-[10px] bg-black/10 px-1.5 py-0.2 rounded-md font-mono">
                  20 stops
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedRoute('PUN_AHM')
                  setFilterStop('ALL')
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
                  selectedRoute === 'PUN_AHM'
                    ? 'bg-[#F8B018] text-gray-950 shadow-xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <span>Pune &rarr; Ahilyanagar</span>
                <span className="text-[10px] bg-black/10 px-1.5 py-0.2 rounded-md font-mono">
                  11 stops
                </span>
              </button>
            </div>
          </div>

          {/* Quick Date & Trip Selectors */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Quick Date Pills */}
            <div className="flex items-center gap-1 bg-gray-50 border border-gray-200 rounded-xl p-1 text-xs">
              <button
                type="button"
                onClick={() => setSelectedDate(todayIST())}
                className={`px-2.5 py-1 rounded-lg font-bold transition-colors ${
                  selectedDate === todayIST()
                    ? 'bg-gray-900 text-white shadow-xs'
                    : 'text-gray-600 hover:bg-gray-200'
                }`}
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => {
                  const d = new Date()
                  d.setDate(d.getDate() + 1)
                  setSelectedDate(d.toISOString().slice(0, 10))
                }}
                className={`px-2.5 py-1 rounded-lg font-bold transition-colors ${
                  selectedDate !== todayIST()
                    ? 'bg-gray-900 text-white shadow-xs'
                    : 'text-gray-600 hover:bg-gray-200'
                }`}
              >
                Tomorrow
              </button>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent border-0 px-1 py-0.5 text-xs font-mono font-bold text-gray-800 focus:outline-none"
              />
            </div>

            {/* Departure Filter */}
            <select
              value={selectedTripId}
              onChange={(e) => setSelectedTripId(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-800 bg-gray-50 hover:bg-white focus:outline-none focus:ring-2 focus:ring-[#F8B018]"
            >
              <option value="ALL">All Departures (Full Day)</option>
              {availableTrips.map((t) => (
                <option key={t.tripId} value={t.tripId}>
                  {t.departureTime} · {t.busNumber}
                </option>
              ))}
            </select>

            {/* Primary Action: Add Passenger Modal Trigger */}
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#F8B018] hover:bg-[#e5a013] text-gray-950 text-xs font-black rounded-xl shadow-xs transition-transform active:scale-95"
            >
              <UserPlus size={14} />
              <span>+ Add Passenger</span>
            </button>

            {/* Utility Actions */}
            <div className="flex items-center gap-1 border-l border-gray-200 pl-2">
              <button
                type="button"
                onClick={() => fetchRoutePassengers()}
                disabled={loading}
                title="Refresh passengers list"
                className="p-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
              >
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              </button>
              <button
                type="button"
                onClick={handlePrint}
                title="Print official passenger boarding sheet"
                className="p-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
              >
                <Printer size={14} />
              </button>
              <button
                type="button"
                onClick={handleExportCSV}
                title="Export CSV sheet"
                className="p-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
              >
                <Download size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* Action Notice Notification Banner */}
        {actionNotice && (
          <div
            className={`p-3 rounded-xl text-xs font-semibold flex items-center justify-between gap-2 animate-in fade-in ${
              actionNotice.type === 'success'
                ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                : 'bg-red-50 text-red-900 border border-red-200'
            }`}
          >
            <div className="flex items-center gap-2">
              {actionNotice.type === 'success' ? (
                <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle size={15} className="text-red-600 shrink-0" />
              )}
              <span>{actionNotice.text}</span>
            </div>
            <button
              type="button"
              onClick={() => setActionNotice(null)}
              className="text-gray-400 hover:text-gray-700"
            >
              <X size={14} />
            </button>
          </div>
        )}
      </section>

      {/* 2. Executive High-Level KPI Strip (Crisp & Minimal) */}
      <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 print:hidden">
        {/* Total Booked */}
        <div className="bg-white border border-gray-200 rounded-2xl p-3.5 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-900 flex items-center justify-center font-black shrink-0">
            <Users size={18} />
          </div>
          <div>
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
              Route Passengers
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-black text-gray-900">{totalCount}</span>
              <span className="text-[11px] text-gray-500">Booked</span>
            </div>
          </div>
        </div>

        {/* Total Paid Revenue */}
        <div className="bg-white border border-gray-200 rounded-2xl p-3.5 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center font-black shrink-0">
            <Banknote size={18} />
          </div>
          <div>
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
              Total Paid
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-black text-gray-900">₹{totalFareCollected}</span>
              <span className="text-[11px] text-emerald-700 font-bold">Collected</span>
            </div>
          </div>
        </div>

        {/* Boarded Count & Progress */}
        <div className="bg-white border border-gray-200 rounded-2xl p-3.5 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-black shrink-0">
            <UserCheck size={18} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                Boarded
              </span>
              <span className="text-[10px] font-mono font-bold text-emerald-700">
                {boardingPct}%
              </span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-black text-emerald-700">{boardedCount}</span>
              <span className="text-[11px] text-gray-500">of {totalCount}</span>
            </div>
          </div>
        </div>

        {/* Pending Check-in */}
        <div className="bg-white border border-gray-200 rounded-2xl p-3.5 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-black shrink-0">
            <Clock4 size={18} />
          </div>
          <div>
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
              Pending Boarding
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-black text-amber-700">{pendingCount}</span>
              <span className="text-[11px] text-gray-500">at stops</span>
            </div>
          </div>
        </div>

        {/* Active Route Stops */}
        <div className="bg-white border border-gray-200 rounded-2xl p-3.5 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-black shrink-0">
            <MapPin size={18} />
          </div>
          <div>
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
              Active Pickups
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-black text-gray-900">
                {activeBookedStops.length}
              </span>
              <span className="text-[11px] text-gray-500">
                of {pickupStops.length} stops
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Decluttered Active Stop Chips & Search Toolbar */}
      <section className="bg-white border border-gray-200 rounded-2xl p-3.5 sm:p-4 shadow-xs space-y-3 print:hidden">
        {/* Top Filter Row: Status Tabs + Search */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Status Tabs */}
          <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                statusFilter === 'ALL'
                  ? 'bg-white text-gray-950 shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              All ({totalCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('PENDING')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                statusFilter === 'PENDING'
                  ? 'bg-amber-100 text-amber-950 shadow-xs font-black'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Pending ({pendingCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('BOARDED')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                statusFilter === 'BOARDED'
                  ? 'bg-emerald-100 text-emerald-950 shadow-xs font-black'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Boarded ({boardedCount})
            </button>
          </div>

          {/* Quick Search */}
          <div className="relative flex-1 max-w-xs">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search name, phone, seat, stop..."
              className="w-full pl-8 pr-7 py-1.5 text-xs rounded-xl border border-gray-200 bg-gray-50 focus:bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#F8B018]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X size={12} />
              </button>
            )}
          </div>
        </div>

        {/* Active Stops Quick-Pills (Decluttered: displays stops that actually have passengers) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-1 pb-1 scrollbar-thin">
          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider shrink-0 mr-1 flex items-center gap-1">
            <MapPin size={11} />
            Pickups:
          </span>

          <button
            type="button"
            onClick={() => setFilterStop('ALL')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold shrink-0 transition-all ${
              filterStop === 'ALL'
                ? 'bg-gray-900 text-white shadow-xs'
                : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
            }`}
          >
            All Active Stops
          </button>

          {activeBookedStops.length === 0 ? (
            <span className="text-xs text-gray-400 italic">No passengers booked along route yet</span>
          ) : (
            activeBookedStops.map((sb) => {
              const isSelected = filterStop === sb.stopName
              return (
                <button
                  key={sb.stopName}
                  type="button"
                  onClick={() => setFilterStop(isSelected ? 'ALL' : sb.stopName)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold shrink-0 transition-all flex items-center gap-1.5 border ${
                    isSelected
                      ? 'bg-[#FEF3C7] border-[#F8B018] text-amber-950 shadow-xs'
                      : 'bg-amber-50/70 border-amber-200 text-amber-900 hover:bg-amber-100'
                  }`}
                >
                  <span className="text-[10px] font-mono text-gray-500 font-normal">
                    #{sb.sequence}
                  </span>
                  <span>{sb.stopName}</span>
                  <span className="w-4 h-4 rounded-full bg-emerald-600 text-white text-[10px] flex items-center justify-center font-bold">
                    {sb.count}
                  </span>
                </button>
              )
            })
          )}

          {/* Fallback stop selector dropdown if user needs to inspect a zero-passenger stop */}
          <div className="ml-auto shrink-0">
            <select
              value={filterStop}
              onChange={(e) => setFilterStop(e.target.value)}
              className="text-[11px] py-1 px-2 rounded-lg border border-gray-200 bg-gray-50 text-gray-700 focus:outline-none"
            >
              <option value="ALL">Browse all {pickupStops.length} stops...</option>
              {pickupStops.map((s, idx) => (
                <option key={s.name} value={s.name}>
                  Stop #{idx + 1} · {s.name} ({s.time})
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* 4. Professional Route-Wise Sorted Passenger Table */}
      <section className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-xs">
        {/* Printable Official Header (Visible only when printed) */}
        <div className="hidden print:block p-6 border-b border-gray-300 text-center">
          <h1 className="text-xl font-black uppercase tracking-wider text-gray-900">
            Uday Travels — Route Passenger Boarding Manifest
          </h1>
          <p className="text-xs text-gray-600 mt-1">
            Route: {ROUTES[selectedRoute].name} | Travel Date: {selectedDate}
          </p>
        </div>

        {/* Table Toolbar Status Info */}
        <div className="px-4 py-2.5 bg-gray-50/80 border-b border-gray-200 flex items-center justify-between text-xs text-gray-600">
          <div className="flex items-center gap-2">
            <span className="font-bold text-gray-900">
              {filteredPassengers.length} {filteredPassengers.length === 1 ? 'Passenger' : 'Passengers'}
            </span>
          </div>
          {filterStop !== 'ALL' && (
            <span className="bg-amber-100 text-amber-900 px-2 py-0.5 rounded text-[11px] font-bold">
              Filtered: {filterStop}
            </span>
          )}
        </div>

        {/* Table Data */}
        {loading ? (
          <div className="py-16 text-center text-xs text-gray-400 flex flex-col items-center gap-2 font-medium">
            <RefreshCw size={22} className="animate-spin text-[#F8B018]" />
            <span>Loading route passenger sheet...</span>
          </div>
        ) : filteredPassengers.length === 0 ? (
          <div className="py-16 text-center text-xs text-gray-500 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-gray-100 text-gray-400 flex items-center justify-center mx-auto">
              <Users size={24} />
            </div>
            <div>
              <strong className="block text-gray-800 text-sm">No passengers match current filter</strong>
              <p className="text-gray-400 max-w-sm mx-auto mt-0.5">
                No bookings found for {ROUTES[selectedRoute].name} on {selectedDate}.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#F8B018] hover:bg-[#e5a013] text-gray-950 font-bold rounded-xl text-xs transition-colors"
            >
              <UserPlus size={13} />
              <span>+ Add Passenger Now</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-2.5 px-3 text-center w-12">Sr.</th>
                  <th className="py-2.5 px-3">Passenger</th>
                  <th className="py-2.5 px-3">Contact</th>
                  <th className="py-2.5 px-3">
                    <span className="text-amber-900 font-black">Pickup (Route Order)</span>
                  </th>
                  <th className="py-2.5 px-3">Drop Stop</th>
                  <th className="py-2.5 px-3 text-center">Seat</th>
                  <th className="py-2.5 px-3">PNR</th>
                  <th className="py-2.5 px-3">Paid &amp; Booked Time</th>
                  <th className="py-2.5 px-3">Departure</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-sans">
                {filteredPassengers.map((p) => {
                  return (
                    <tr
                      key={`${p.ticketNo}_${p.seatNo}`}
                      className={`transition-colors ${
                        p.boarded
                          ? 'bg-emerald-50/30 hover:bg-emerald-50/60'
                          : 'hover:bg-amber-50/20'
                      }`}
                    >
                      {/* Sr No */}
                      <td className="py-3 px-3 text-center">
                        <span className="w-6 h-6 rounded-lg bg-gray-100 border border-gray-200 text-gray-900 font-mono font-black text-xs inline-flex items-center justify-center">
                          {p.srNo}
                        </span>
                      </td>

                      {/* Passenger Name */}
                      <td className="py-3 px-3">
                        <div className="font-bold text-gray-900 text-xs">{p.name}</div>
                      </td>

                      {/* Phone Number with Instant Action Buttons */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5 font-mono text-xs text-gray-800">
                          <span>{p.mobile}</span>
                          {/* Direct Phone Dialer */}
                          <a
                            href={`tel:${p.mobile.replace(/\s+/g, '')}`}
                            className="w-5 h-5 rounded-md bg-emerald-50 hover:bg-emerald-100 text-emerald-700 flex items-center justify-center transition-colors print:hidden"
                            title="Call passenger"
                          >
                            <Phone size={10} />
                          </a>
                          {/* Direct WhatsApp Messaging */}
                          <a
                            href={`https://wa.me/${p.mobile.replace(/\D/g, '')}?text=Hello%20${encodeURIComponent(
                              p.name
                            )},%20this%20is%20Uday%20Travels.%20Your%20seat%20is%20${encodeURIComponent(
                              p.seatNo
                            )}%20for%20the%20journey%20on%20${encodeURIComponent(
                              selectedDate
                            )}.%20Pickup%20Stop:%20${encodeURIComponent(
                              p.pickupStop
                            )}%20(${encodeURIComponent(p.pickupTime)}).`}
                            target="_blank"
                            rel="noreferrer"
                            className="w-5 h-5 rounded-md bg-green-50 hover:bg-green-100 text-green-700 flex items-center justify-center transition-colors print:hidden"
                            title="Send WhatsApp update"
                          >
                            <MessageSquare size={10} />
                          </a>
                        </div>
                      </td>

                      {/* Pickup Stop (Chronological Order) */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5">
                          <span className="px-1.5 py-0.5 rounded bg-[#FEF3C7] text-[#92400E] font-mono font-extrabold text-[10px] shrink-0">
                            Stop #{p.pickupSequence}
                          </span>
                          <span className="font-bold text-gray-900 text-xs">{p.pickupStop}</span>
                        </div>
                      </td>

                      {/* Drop Stop */}
                      <td className="py-3 px-3">
                        <span className="font-medium text-gray-800 text-xs">{p.dropStop}</span>
                      </td>

                      {/* Seat */}
                      <td className="py-3 px-3 text-center">
                        <span className="px-2 py-1 rounded-md bg-amber-50 border border-amber-200 text-amber-950 font-mono font-black text-xs">
                          {p.seatNo}
                        </span>
                      </td>

                      {/* Ticket PNR */}
                      <td className="py-3 px-3">
                        <a
                          href={`/ticket/${p.ticketNo}`}
                          target="_blank"
                          rel="noreferrer"
                          className="font-mono text-xs font-bold text-amber-800 hover:text-amber-950 hover:underline inline-flex items-center gap-1"
                        >
                          <span>{p.ticketNo}</span>
                          <ExternalLink size={9} className="print:hidden text-gray-400" />
                        </a>
                      </td>

                      {/* How Much Paid & Time for Booking */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5">
                          <span className="px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-900 font-mono font-black text-xs">
                            ₹{p.fare}
                          </span>
                          <span className="text-[10px] text-gray-500 font-medium">
                            {p.paymentMethod?.includes('CASH') ? 'Cash' : 'UPI/Online'}
                          </span>
                        </div>
                        {p.bookedAt && (
                          <div className="text-[10px] font-mono text-gray-500 mt-0.5 flex items-center gap-1">
                            <span>{formatISTTime(p.bookedAt)}</span>
                            <span>&bull;</span>
                            <span className="text-gray-400">{formatTimeAgo(p.bookedAt)}</span>
                          </div>
                        )}
                      </td>

                      {/* Departure */}
                      <td className="py-3 px-3 font-mono text-xs text-gray-600">
                        {p.departureTime}
                      </td>

                      {/* Boarding Status Toggle */}
                      <td className="py-3 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleBoarding(p.tripId, p.seatNo, p.boarded)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                            p.boarded
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'bg-gray-100 hover:bg-amber-100 text-gray-700 border border-gray-200'
                          }`}
                        >
                          {p.boarded ? (
                            <>
                              <CheckSquare size={12} />
                              <span>Boarded</span>
                            </>
                          ) : (
                            <>
                              <Square size={12} className="text-gray-400" />
                              <span>Check-in</span>
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* 5. Sleek Passenger Creation Modal (Declutters Main Page) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl border border-gray-200 shadow-2xl max-w-xl w-full p-6 space-y-4">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#FEF3C7] text-[#92400E] flex items-center justify-center font-black">
                  <UserPlus size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-gray-900 uppercase tracking-tight">
                    Add Passenger to {ROUTES[selectedRoute].name}
                  </h3>
                  <span className="text-[11px] text-gray-500">
                    Date: {selectedDate} &bull; Route Sorted
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-500 flex items-center justify-center transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSavePassenger} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Full Name */}
                <div>
                  <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-1">
                    Passenger Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ramesh Patil"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#F8B018]"
                  />
                </div>

                {/* Phone Number */}
                <div>
                  <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-1">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="e.g. 9822011001"
                    value={newMobile}
                    onChange={(e) => setNewMobile(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 font-mono text-xs font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#F8B018]"
                  />
                </div>

                {/* Pickup Stop (Chronological Route Sequence) */}
                <div>
                  <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-1">
                    Pickup Stop (Route Sequence) *
                  </label>
                  <select
                    value={newPickup}
                    onChange={(e) => setNewPickup(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs font-bold text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#F8B018]"
                  >
                    {pickupStops.map((stop, idx) => (
                      <option key={stop.name} value={stop.name}>
                        Stop #{idx + 1} &bull; {stop.name} ({stop.time})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Drop Stop */}
                <div>
                  <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-1">
                    Drop Stop *
                  </label>
                  <select
                    value={newDrop}
                    onChange={(e) => setNewDrop(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs font-bold text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#F8B018]"
                  >
                    {dropStops.map((name, idx) => (
                      <option key={name} value={name}>
                        Drop #{idx + 1} &bull; {name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Departure Trip */}
                <div>
                  <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-1">
                    Departure Bus
                  </label>
                  <select
                    value={newTripId}
                    onChange={(e) => setNewTripId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs font-bold text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#F8B018]"
                  >
                    {availableTrips.map((t) => (
                      <option key={t.tripId} value={t.tripId}>
                        {t.departureTime} &bull; {t.busNumber}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Seat No (Optional) */}
                <div>
                  <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-1">
                    Seat No (Leave blank for auto-assign)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. A1 (or leave blank)"
                    value={newSeat}
                    onChange={(e) => setNewSeat(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 font-mono text-xs font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#F8B018]"
                  />
                </div>

                {/* Gender */}
                <div>
                  <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-1">
                    Gender
                  </label>
                  <select
                    value={newGender}
                    onChange={(e) => setNewGender(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs font-bold text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#F8B018]"
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                </div>

                {/* Age */}
                <div>
                  <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-1">
                    Age
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="120"
                    value={newAge}
                    onChange={(e) => setNewAge(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#F8B018]"
                  />
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl transition-colors"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={savingPassenger}
                  className="px-5 py-2 bg-[#F8B018] hover:bg-[#e5a013] text-gray-950 text-xs font-black rounded-xl shadow-xs transition-colors flex items-center gap-2"
                >
                  {savingPassenger ? (
                    <>
                      <RefreshCw size={13} className="animate-spin" />
                      <span>Saving to Route...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={14} />
                      <span>Save &amp; Assign to Route</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
