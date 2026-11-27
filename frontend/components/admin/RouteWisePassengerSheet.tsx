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
  Check,
  Circle,
  ChevronRight,
  Filter,
  Users,
  UserCheck,
  Clock4,
  ArrowRight,
  Sparkles,
  X,
  ExternalLink,
  SlidersHorizontal,
} from 'lucide-react'
import { RouteId, ROUTES } from '@/lib/config/routes'
import { todayIST } from '@/lib/time/ist'
import {
  AHILYANAGAR_PICKUP_RAW,
  PUNE_DROP_RAW,
  PUNE_PICKUP_RAW,
} from '@/lib/routes/seed-data'
import { RoutePassengerRecord, StopCountBreakdown } from '@/app/api/admin/route-passengers/route'
import { ThemedDatePickerModal } from '@/components/ui/ThemedDatePickerModal'

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

function formatDisplayDate(dateStr: string): string {
  try {
    const d = new Date(dateStr + 'T00:00:00')
    return new Intl.DateTimeFormat('en-IN', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    }).format(d)
  } catch {
    return dateStr
  }
}

export function RouteWisePassengerSheet() {
  // Route selection: separate booking list for each route
  const [selectedRoute, setSelectedRoute] = useState<RouteId>('AHM_PUN')
  const [selectedDate, setSelectedDate] = useState<string>(todayIST())
  const [selectedTripId, setSelectedTripId] = useState<string>('ALL')
  const [availableTrips, setAvailableTrips] = useState<any[]>([])

  // Passenger data state
  const [loading, setLoading] = useState(false)
  const [passengers, setPassengers] = useState<RoutePassengerRecord[]>([])
  const [stopBreakdown, setStopBreakdown] = useState<StopCountBreakdown[]>([])
  const [otherRouteCount, setOtherRouteCount] = useState<number>(0)
  const [otherRouteBoarded, setOtherRouteBoarded] = useState<number>(0)

  // Filters & search
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'BOARDED'>('ALL')
  const [filterStop, setFilterStop] = useState<string>('ALL')
  const [groupByStop, setGroupByStop] = useState(false)
  const [calendarOpen, setCalendarOpen] = useState(false)

  // Notifications & UI state
  const [actionNotice, setActionNotice] = useState<{ text: string; type: 'success' | 'error' } | null>(null)
  const [togglingSeat, setTogglingSeat] = useState<string | null>(null)

  // Add passenger modal state
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
  const today = todayIST()

  // Canonical stops for current route
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

  // 1. Fetch available departures for selected route & date
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
      // Safe catch
    }
  }, [selectedRoute, selectedDate, newTripId])

  useEffect(() => {
    fetchTrips()
  }, [fetchTrips])

  // 2. Fetch route passengers in route-wise sorted order
  const fetchRoutePassengers = useCallback(
    async (isBackground = false) => {
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
        }

        // Fetch counts for other route in background to keep tab badges synchronized
        const otherRoute: RouteId = selectedRoute === 'AHM_PUN' ? 'PUN_AHM' : 'AHM_PUN'
        fetch(`/api/admin/route-passengers?route=${otherRoute}&date=${selectedDate}`)
          .then((r) => r.json())
          .then((otherData) => {
            if (otherData?.passengers) {
              setOtherRouteCount(otherData.passengers.length)
              setOtherRouteBoarded(
                otherData.passengers.filter((p: RoutePassengerRecord) => p.boarded).length
              )
            }
          })
          .catch(() => {})
      } catch (err: any) {
        if (!isBackground) {
          setActionNotice({ type: 'error', text: err.message || 'Error loading booking list' })
        }
      } finally {
        if (!isBackground) {
          setLoading(false)
        }
      }
    },
    [selectedRoute, selectedDate, selectedTripId]
  )

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

      await fetchRoutePassengers()
    } catch (err: any) {
      setActionNotice({ type: 'error', text: err.message || 'Error saving passenger' })
    } finally {
      setSavingPassenger(false)
    }
  }

  // 4. Toggle Boarding status (The Hero "Tick" Action)
  const handleToggleBoarding = async (
    tripId: string,
    seatNo: string,
    ticketNo: string,
    currentStatus: boolean,
    passengerName: string,
    pickupStopName: string
  ) => {
    const nextStatus = !currentStatus
    setTogglingSeat(seatNo)

    // Optimistic UI update
    setPassengers((prev) =>
      prev.map((p) =>
        p.tripId === tripId && p.seatNo === seatNo
          ? { ...p, boarded: nextStatus, boardedAt: nextStatus ? new Date().toISOString() : undefined }
          : p
      )
    )

    try {
      const res = await fetch('/api/admin/manifest', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tripId,
          travelDate: selectedDate,
          seatNo,
          ticketNo,
          boarded: nextStatus,
        }),
      })

      if (!res.ok) {
        // Rollback if failed
        setPassengers((prev) =>
          prev.map((p) =>
            p.tripId === tripId && p.seatNo === seatNo ? { ...p, boarded: currentStatus } : p
          )
        )
        setActionNotice({ type: 'error', text: 'Could not update boarding status. Please retry.' })
      } else {
        setActionNotice({
          type: 'success',
          text: nextStatus
            ? `✓ ${passengerName} marked as BOARDED properly from ${pickupStopName}!`
            : `Reverted ${passengerName} to Pending.`,
        })
      }
    } catch {
      // Rollback on network error
      setPassengers((prev) =>
        prev.map((p) =>
          p.tripId === tripId && p.seatNo === seatNo ? { ...p, boarded: currentStatus } : p
        )
      )
      setActionNotice({ type: 'error', text: 'Network error updating boarding status.' })
    } finally {
      setTogglingSeat(null)
    }
  }

  // Key metrics for this route
  const totalCount = passengers.length
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

  // Grouped passengers by pickup stop
  const groupedByStopList = useMemo(() => {
    const groups: { stopName: string; sequence: number; time: string; list: RoutePassengerRecord[] }[] = []
    const map = new Map<string, RoutePassengerRecord[]>()

    filteredPassengers.forEach((p) => {
      if (!map.has(p.pickupStop)) {
        map.set(p.pickupStop, [])
      }
      map.get(p.pickupStop)!.push(p)
    })

    map.forEach((list, stopName) => {
      const first = list[0]
      groups.push({
        stopName,
        sequence: first?.pickupSequence || 999,
        time: first?.pickupTime || '',
        list,
      })
    })

    groups.sort((a, b) => a.sequence - b.sequence)
    return groups
  }, [filteredPassengers])

  // Active stops that have bookings
  const activeBookedStops = useMemo(() => {
    return stopBreakdown.filter((s) => s.count > 0)
  }, [stopBreakdown])

  // CSV Export
  const handleExportCSV = () => {
    if (passengers.length === 0) {
      alert('No passengers to export.')
      return
    }

    const headers = ['Sr No', 'Name', 'Pickup Point', 'Number', 'Seat', 'Boarded Status', 'Boarded At']
    const rows = passengers.map((p) => [
      p.srNo,
      `"${p.name.replace(/"/g, '""')}"`,
      `"${p.pickupStop} (${p.pickupTime})"`,
      `"${p.mobile}"`,
      `"${p.seatNo}"`,
      p.boarded ? 'BOARDED' : 'PENDING',
      p.boardedAt ? `"${formatISTTime(p.boardedAt)}"` : '""',
    ])

    const csvContent =
      'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `Uday_Travels_${selectedRoute}_${selectedDate}_Boarding_List.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="space-y-5">
      {/* ------------------------------------------------------------- */}
      {/* 1. SEPARATE BOOKING LIST ROUTE SELECTOR TABS */}
      {/* ------------------------------------------------------------- */}
      <section className="bg-white border border-gray-200 rounded-3xl p-4 sm:p-6 shadow-xs space-y-4 print:hidden">
        {/* Top Header & Date Row */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-gray-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[11px] font-black uppercase tracking-wider text-emerald-800">
                Route Passenger Boarding System
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-gray-950 tracking-tight mt-0.5">
              Passenger Boarding Checklist
            </h2>
          </div>

          {/* Quick Date Pills & Trip Filter */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 bg-gray-50 border border-gray-200 rounded-xl p-1 text-xs">
              <button
                type="button"
                onClick={() => setSelectedDate(today)}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                  selectedDate === today
                    ? 'bg-[#F8B018] text-[#0B0F19] shadow-xs'
                    : 'text-gray-600 hover:bg-gray-200'
                }`}
              >
                Today ({formatDisplayDate(today)})
              </button>
              <button
                type="button"
                onClick={() => {
                  const d = new Date()
                  d.setDate(d.getDate() + 1)
                  setSelectedDate(d.toISOString().slice(0, 10))
                }}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                  selectedDate !== today
                    ? 'bg-[#F8B018] text-[#0B0F19] shadow-xs'
                    : 'text-gray-600 hover:bg-gray-200'
                }`}
              >
                Tomorrow
              </button>
              <button
                type="button"
                onClick={() => setCalendarOpen(true)}
                className="p-1.5 bg-white hover:bg-gray-100 text-gray-700 rounded-lg border border-gray-200"
                title="Choose custom date"
              >
                <Calendar size={15} />
              </button>
            </div>

            {/* Departure Filter */}
            <select
              value={selectedTripId}
              onChange={(e) => setSelectedTripId(e.target.value)}
              className="px-3 py-2 rounded-xl border border-gray-200 text-xs font-bold text-gray-800 bg-gray-50 hover:bg-white focus:outline-none focus:ring-2 focus:ring-[#F8B018]"
            >
              <option value="ALL">All Departures (Full Day)</option>
              {availableTrips.map((t) => (
                <option key={t.tripId} value={t.tripId}>
                  {t.departureTime} · {t.busNumber}
                </option>
              ))}
            </select>

            {/* Add Passenger Button */}
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#F8B018] hover:bg-[#e5a013] text-gray-950 text-xs font-black rounded-xl shadow-xs transition-transform active:scale-95 cursor-pointer"
            >
              <UserPlus size={14} />
              <span>+ Add Passenger</span>
            </button>

            {/* Actions */}
            <div className="flex items-center gap-1 border-l border-gray-200 pl-2">
              <button
                type="button"
                onClick={() => fetchRoutePassengers()}
                disabled={loading}
                title="Refresh passengers"
                className="p-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition-colors cursor-pointer"
              >
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                title="Print checklist"
                className="p-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition-colors cursor-pointer"
              >
                <Printer size={14} />
              </button>
              <button
                type="button"
                onClick={handleExportCSV}
                title="Download CSV"
                className="p-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition-colors cursor-pointer"
              >
                <Download size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* Dedicated Route Tabs with High-Impact Badges */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
          {/* Route 1: Ahilyanagar to Pune */}
          <button
            type="button"
            onClick={() => {
              setSelectedRoute('AHM_PUN')
              setFilterStop('ALL')
            }}
            className={`p-4 rounded-2xl border text-left transition-all cursor-pointer relative overflow-hidden ${
              selectedRoute === 'AHM_PUN'
                ? 'bg-amber-50/70 border-amber-400 ring-2 ring-amber-300 shadow-sm'
                : 'bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50/80'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center font-black ${
                    selectedRoute === 'AHM_PUN' ? 'bg-[#F8B018] text-[#0B0F19]' : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  <Bus size={18} />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-mono font-bold tracking-wider text-amber-900 block">
                    Route 1 · 20 Stops
                  </span>
                  <h3 className="text-base font-black text-gray-950">
                    Ahilyanagar → Pune
                  </h3>
                </div>
              </div>

              {/* Status Badge */}
              <div className="text-right">
                <span
                  className={`text-xs font-mono font-black px-2.5 py-1 rounded-lg border ${
                    selectedRoute === 'AHM_PUN'
                      ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                      : 'bg-gray-100 text-gray-700 border-gray-200'
                  }`}
                >
                  {selectedRoute === 'AHM_PUN' ? totalCount : otherRouteCount} Booked
                </span>
                <span className="block text-[11px] font-bold text-gray-500 mt-0.5">
                  ✓ {selectedRoute === 'AHM_PUN' ? boardedCount : otherRouteBoarded} Boarded
                </span>
              </div>
            </div>

            {selectedRoute === 'AHM_PUN' && (
              <div className="mt-3 pt-2 border-t border-amber-200/60 flex items-center justify-between text-[11px] font-bold text-amber-950">
                <span>Active Booking List</span>
                <span className="text-emerald-700">● Live Real-Time Checklist</span>
              </div>
            )}
          </button>

          {/* Route 2: Pune to Ahilyanagar */}
          <button
            type="button"
            onClick={() => {
              setSelectedRoute('PUN_AHM')
              setFilterStop('ALL')
            }}
            className={`p-4 rounded-2xl border text-left transition-all cursor-pointer relative overflow-hidden ${
              selectedRoute === 'PUN_AHM'
                ? 'bg-amber-50/70 border-amber-400 ring-2 ring-amber-300 shadow-sm'
                : 'bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50/80'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center font-black ${
                    selectedRoute === 'PUN_AHM' ? 'bg-[#F8B018] text-[#0B0F19]' : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  <Bus size={18} />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-mono font-bold tracking-wider text-amber-900 block">
                    Route 2 · 11 Stops
                  </span>
                  <h3 className="text-base font-black text-gray-950">
                    Pune → Ahilyanagar
                  </h3>
                </div>
              </div>

              {/* Status Badge */}
              <div className="text-right">
                <span
                  className={`text-xs font-mono font-black px-2.5 py-1 rounded-lg border ${
                    selectedRoute === 'PUN_AHM'
                      ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                      : 'bg-gray-100 text-gray-700 border-gray-200'
                  }`}
                >
                  {selectedRoute === 'PUN_AHM' ? totalCount : otherRouteCount} Booked
                </span>
                <span className="block text-[11px] font-bold text-gray-500 mt-0.5">
                  ✓ {selectedRoute === 'PUN_AHM' ? boardedCount : otherRouteBoarded} Boarded
                </span>
              </div>
            </div>

            {selectedRoute === 'PUN_AHM' && (
              <div className="mt-3 pt-2 border-t border-amber-200/60 flex items-center justify-between text-[11px] font-bold text-amber-950">
                <span>Active Booking List</span>
                <span className="text-emerald-700">● Live Real-Time Checklist</span>
              </div>
            )}
          </button>
        </div>

        {/* Action Notice Toast */}
        {actionNotice && (
          <div
            className={`p-3 rounded-xl text-xs font-bold flex items-center justify-between gap-2 animate-in fade-in ${
              actionNotice.type === 'success'
                ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                : 'bg-red-50 text-red-900 border border-red-200'
            }`}
          >
            <div className="flex items-center gap-2">
              {actionNotice.type === 'success' ? (
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle size={16} className="text-red-600 shrink-0" />
              )}
              <span>{actionNotice.text}</span>
            </div>
            <button
              type="button"
              onClick={() => setActionNotice(null)}
              className="text-gray-400 hover:text-gray-700 p-0.5"
            >
              <X size={14} />
            </button>
          </div>
        )}
      </section>

      {/* ------------------------------------------------------------- */}
      {/* 2. LIVE BOARDING SUMMARY & PROGRESS BAR */}
      {/* ------------------------------------------------------------- */}
      <section className="bg-white border border-gray-200 rounded-2xl p-4 shadow-xs print:hidden space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-black shrink-0">
              <UserCheck size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-black text-gray-950">
                  {boardedCount} of {totalCount} Passengers Boarded
                </span>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  {boardingPct}% Complete
                </span>
              </div>
              <p className="text-xs text-gray-500 font-medium">
                {pendingCount === 0 && totalCount > 0
                  ? 'All passengers have safely boarded! Ready for departure.'
                  : `${pendingCount} passengers remaining to board along route.`}
              </p>
            </div>
          </div>

          {/* Quick Filters */}
          <div className="flex items-center gap-1.5 self-start sm:self-auto">
            <div className="flex items-center bg-gray-100 p-1 rounded-xl text-xs font-bold">
              <button
                type="button"
                onClick={() => setStatusFilter('ALL')}
                className={`px-3 py-1 rounded-lg transition-all ${
                  statusFilter === 'ALL'
                    ? 'bg-white text-gray-950 shadow-xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                All ({totalCount})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('BOARDED')}
                className={`px-3 py-1 rounded-lg transition-all ${
                  statusFilter === 'BOARDED'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Boarded ({boardedCount})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('PENDING')}
                className={`px-3 py-1 rounded-lg transition-all ${
                  statusFilter === 'PENDING'
                    ? 'bg-amber-500 text-white shadow-xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Pending ({pendingCount})
              </button>
            </div>

            {/* Toggle Grouping */}
            <button
              type="button"
              onClick={() => setGroupByStop((prev) => !prev)}
              className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                groupByStop
                  ? 'bg-gray-900 text-white border-gray-900 shadow-xs'
                  : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
              }`}
              title="Toggle grouping by pickup stop"
            >
              <SlidersHorizontal size={13} />
              <span className="hidden sm:inline">{groupByStop ? 'Grouped by Stop' : 'Flat List'}</span>
            </button>
          </div>
        </div>

        {/* Progress Fill Bar */}
        <div className="w-full h-2 rounded-full bg-gray-100 overflow-hidden">
          <div
            className="h-full bg-emerald-500 transition-all duration-300 rounded-full"
            style={{ width: `${boardingPct}%` }}
          />
        </div>

        {/* Search Bar & Stop Filter */}
        <div className="pt-2 flex flex-col sm:flex-row sm:items-center gap-2">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by passenger name, mobile number, or pickup point..."
              className="w-full pl-9 pr-8 py-2 text-xs rounded-xl border border-gray-200 bg-gray-50 focus:bg-white text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-[#F8B018]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Active Stop Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-thin">
            <button
              type="button"
              onClick={() => setFilterStop('ALL')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold shrink-0 transition-all ${
                filterStop === 'ALL'
                  ? 'bg-gray-900 text-white shadow-xs'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              }`}
            >
              All Stops
            </button>

            {activeBookedStops.map((sb) => {
              const isSelected = filterStop === sb.stopName
              return (
                <button
                  key={sb.stopName}
                  type="button"
                  onClick={() => setFilterStop(isSelected ? 'ALL' : sb.stopName)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold shrink-0 transition-all flex items-center gap-1.5 border cursor-pointer ${
                    isSelected
                      ? 'bg-[#FEF3C7] border-[#F8B018] text-amber-950 shadow-xs'
                      : 'bg-amber-50/70 border-amber-200 text-amber-900 hover:bg-amber-100'
                  }`}
                >
                  <span className="text-[10px] font-mono text-gray-500 font-normal">#{sb.sequence}</span>
                  <span>{sb.stopName}</span>
                  <span className="w-4 h-4 rounded-full bg-emerald-600 text-white text-[10px] flex items-center justify-center font-bold">
                    {sb.count}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* 3. MODERN PASSENGER BOARDING CHECKLIST (INSTEAD OF EXCEL TABLE) */}
      {/* Returns ONLY: Sr No, Name, Pickup point, Number, and Tick      */}
      {/* ------------------------------------------------------------- */}
      <section className="space-y-3">
        {/* Printable Header */}
        <div className="hidden print:block p-4 border-b border-gray-300 text-center mb-4">
          <h1 className="text-xl font-black uppercase tracking-wider text-gray-900">
            Uday Travels — {ROUTES[selectedRoute].name} Boarding Checklist
          </h1>
          <p className="text-xs text-gray-600 mt-1">
            Travel Date: {selectedDate} | Total Passengers: {filteredPassengers.length}
          </p>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="bg-white border border-gray-200 rounded-3xl p-16 text-center text-xs text-gray-400 flex flex-col items-center gap-2 font-medium">
            <RefreshCw size={24} className="animate-spin text-[#F8B018]" />
            <span>Loading separate booking list for {ROUTES[selectedRoute].name}...</span>
          </div>
        ) : filteredPassengers.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-3xl p-16 text-center text-xs text-gray-500 space-y-3 shadow-xs">
            <div className="w-12 h-12 rounded-2xl bg-gray-100 text-gray-400 flex items-center justify-center mx-auto">
              <Users size={24} />
            </div>
            <div>
              <strong className="block text-gray-900 text-base font-black">
                No Bookings for {ROUTES[selectedRoute].name}
              </strong>
              <p className="text-gray-500 max-w-sm mx-auto mt-1">
                No passengers booked on this route for {selectedDate}. Use the button below to add a walk-in passenger.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#F8B018] hover:bg-[#e5a013] text-gray-950 font-bold rounded-xl text-xs transition-colors cursor-pointer"
            >
              <UserPlus size={14} />
              <span>+ Add Walk-in Passenger</span>
            </button>
          </div>
        ) : groupByStop ? (
          // GROUPED BY PICKUP STOP VIEW
          <div className="space-y-5">
            {groupedByStopList.map((group) => (
              <div key={group.stopName} className="space-y-2">
                <div className="flex items-center gap-2 px-1">
                  <div className="w-6 h-6 rounded-lg bg-amber-100 text-amber-900 text-[11px] font-mono font-black flex items-center justify-center">
                    #{group.sequence}
                  </div>
                  <h4 className="text-sm font-black text-gray-900 flex items-center gap-2">
                    <span>{group.stopName}</span>
                    <span className="text-xs font-mono font-medium text-gray-500">
                      ({group.time})
                    </span>
                  </h4>
                  <span className="text-xs font-bold text-gray-500 ml-auto">
                    {group.list.length} {group.list.length === 1 ? 'Passenger' : 'Passengers'}
                  </span>
                </div>

                <div className="space-y-2.5">
                  {group.list.map((p) => renderPassengerCard(p))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          // FLAT CHRONOLOGICAL CHECKLIST VIEW (DEFAULT)
          <div className="space-y-2.5">
            {filteredPassengers.map((p) => renderPassengerCard(p))}
          </div>
        )}
      </section>

      {/* ------------------------------------------------------------- */}
      {/* 4. SLEEK PASSENGER CREATION MODAL */}
      {/* ------------------------------------------------------------- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl border border-gray-200 shadow-2xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#FEF3C7] text-[#92400E] flex items-center justify-center font-black">
                  <UserPlus size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-gray-900 uppercase tracking-tight">
                    Add Passenger &bull; {ROUTES[selectedRoute].name}
                  </h3>
                  <span className="text-[11px] text-gray-500">
                    Date: {selectedDate} &bull; Route Boarding List
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-500 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSavePassenger} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
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

                <div>
                  <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-1">
                    Phone Number (10 Digits) *
                  </label>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    placeholder="e.g. 9822011001"
                    value={newMobile}
                    onChange={(e) => setNewMobile(e.target.value.replace(/\D/g, ''))}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 font-mono text-xs font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#F8B018]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-1">
                    Pickup Point (Route Order) *
                  </label>
                  <select
                    value={newPickup}
                    onChange={(e) => setNewPickup(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs font-bold text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#F8B018]"
                  >
                    {pickupStops.map((stop, idx) => (
                      <option key={stop.name} value={stop.name}>
                        Stop #{idx + 1} · {stop.name} ({stop.time})
                      </option>
                    ))}
                  </select>
                </div>

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
                        Drop #{idx + 1} · {name}
                      </option>
                    ))}
                  </select>
                </div>

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
                        {t.departureTime} · {t.busNumber}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-1">
                    Seat No (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. A1 (or auto-assign)"
                    value={newSeat}
                    onChange={(e) => setNewSeat(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 font-mono text-xs font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#F8B018]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingPassenger}
                  className="px-5 py-2 bg-[#F8B018] hover:bg-[#e5a013] text-gray-950 text-xs font-black rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {savingPassenger ? (
                    <>
                      <RefreshCw size={13} className="animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={14} />
                      <span>Save &amp; Add to Route</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Date Picker Modal */}
      <ThemedDatePickerModal
        isOpen={calendarOpen}
        onClose={() => setCalendarOpen(false)}
        selectedDate={selectedDate}
        onSelectDate={(date) => {
          setSelectedDate(date)
          setCalendarOpen(false)
        }}
        minDate={today}
      />
    </div>
  )

  // -------------------------------------------------------------
  // HELPER: RENDER MODERN PASSENGER CARD
  // Focused specifically on: Sr No, Name, Pickup point, Number, and Tick!
  // -------------------------------------------------------------
  function renderPassengerCard(p: RoutePassengerRecord) {
    const isToggling = togglingSeat === p.seatNo

    return (
      <div
        key={`${p.ticketNo}_${p.seatNo}`}
        className={`rounded-2xl border p-3.5 sm:p-4.5 transition-all shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3 ${
          p.boarded
            ? 'bg-emerald-50/30 border-emerald-300 hover:border-emerald-400 hover:bg-emerald-50/50'
            : 'bg-white border-gray-200 hover:border-amber-300 hover:shadow-sm'
        }`}
      >
        {/* Left Side: Sr No, Name, Seat Tag, Pickup Point & Phone Number */}
        <div className="flex items-start sm:items-center gap-3.5 flex-1 min-w-0">
          {/* 1. SR NO */}
          <div className="shrink-0 flex flex-col items-center justify-center">
            <span
              className={`w-10 h-10 rounded-xl font-mono font-black text-sm flex items-center justify-center shadow-2xs border ${
                p.boarded
                  ? 'bg-emerald-600 text-white border-emerald-700'
                  : 'bg-gray-100 text-gray-900 border-gray-200'
              }`}
            >
              #{p.srNo}
            </span>
            <span className="text-[9px] uppercase font-bold text-gray-400 mt-0.5">
              Sr No
            </span>
          </div>

          {/* Details Column */}
          <div className="flex-1 min-w-0 space-y-1">
            {/* 2. NAME & SEAT */}
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="text-sm sm:text-base font-black text-gray-950 truncate">
                {p.name}
              </h4>
              <span className="px-2 py-0.5 rounded-md bg-[#F8B018]/20 border border-[#F8B018]/50 text-amber-950 font-mono font-black text-[11px]">
                Seat {p.seatNo}
              </span>
              <span className="text-[10px] uppercase font-bold text-gray-400">
                ({p.gender === 'female' ? 'Female' : 'Male'}, {p.age}y)
              </span>
            </div>

            {/* 3. PICKUP POINT & 4. NUMBER */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-600">
              {/* Pickup Point */}
              <div className="flex items-center gap-1.5 font-bold text-gray-900">
                <MapPin size={13} className="text-[#F8B018] shrink-0" />
                <span className="text-amber-950 font-black">{p.pickupStop}</span>
                <span className="text-[11px] font-mono text-gray-500 font-medium">
                  ({p.pickupTime})
                </span>
                <span className="text-[10px] font-mono text-gray-400 font-normal">
                  · Stop #{p.pickupSequence}
                </span>
              </div>

              {/* Passenger Contact Number with Instant Call & WhatsApp */}
              <div className="flex items-center gap-1.5 font-mono text-xs text-gray-800">
                <Phone size={12} className="text-gray-400 shrink-0" />
                <span className="font-bold">{p.mobile}</span>

                {/* Direct Phone Dialer */}
                <a
                  href={`tel:${p.mobile.replace(/\s+/g, '')}`}
                  className="w-5 h-5 rounded-md bg-emerald-50 hover:bg-emerald-100 text-emerald-700 flex items-center justify-center transition-colors print:hidden"
                  title="Call passenger"
                >
                  <Phone size={10} />
                </a>

                {/* Direct WhatsApp Message */}
                <a
                  href={`https://wa.me/${p.mobile.replace(/\D/g, '')}?text=Hello%20${encodeURIComponent(
                    p.name
                  )},%20this%20is%20Uday%20Travels.%20Your%20seat%20is%20${encodeURIComponent(
                    p.seatNo
                  )}%20for%20the%20journey%20on%20${encodeURIComponent(
                    selectedDate
                  )}.%20Pickup%20Stop:%20${encodeURIComponent(p.pickupStop)}%20(${encodeURIComponent(
                    p.pickupTime
                  )}).`}
                  target="_blank"
                  rel="noreferrer"
                  className="w-5 h-5 rounded-md bg-green-50 hover:bg-green-100 text-green-700 flex items-center justify-center transition-colors print:hidden"
                  title="WhatsApp passenger"
                >
                  <MessageSquare size={10} />
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: 5. THE TICK BUTTON (Shows passenger is boarded properly from that place) */}
        <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-100 shrink-0">
          {/* Status Label */}
          <div className="text-right sm:block">
            {p.boarded ? (
              <div className="text-left sm:text-right">
                <span className="text-[11px] font-extrabold text-emerald-700 block">
                  ✓ Boarded properly
                </span>
                <span className="text-[10px] text-gray-500 font-mono block">
                  at {p.pickupStop} {p.boardedAt ? `(${formatISTTime(p.boardedAt)})` : ''}
                </span>
              </div>
            ) : (
              <div className="text-left sm:text-right">
                <span className="text-[11px] font-bold text-amber-800 block">
                  Waiting to board
                </span>
                <span className="text-[10px] text-gray-400 font-mono block">
                  Reporting at {p.pickupStop}
                </span>
              </div>
            )}
          </div>

          {/* Large Interactive Tick Toggle Button */}
          <button
            type="button"
            disabled={isToggling}
            onClick={() =>
              handleToggleBoarding(
                p.tripId,
                p.seatNo,
                p.ticketNo,
                p.boarded,
                p.name,
                p.pickupStop
              )
            }
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer select-none active:scale-95 shadow-xs ${
              p.boarded
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200'
                : 'bg-white hover:bg-amber-50 text-gray-700 border-2 border-gray-300 hover:border-amber-400'
            }`}
            title={
              p.boarded
                ? `Click to mark ${p.name} as not boarded`
                : `Click to tick and confirm ${p.name} boarded properly`
            }
          >
            {isToggling ? (
              <RefreshCw size={16} className="animate-spin text-gray-400" />
            ) : p.boarded ? (
              <>
                <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center">
                  <Check size={14} className="stroke-[3]" />
                </div>
                <span>Boarded</span>
              </>
            ) : (
              <>
                <Circle size={15} className="text-gray-400" />
                <span>Mark Boarded</span>
              </>
            )}
          </button>
        </div>
      </div>
    )
  }
}
