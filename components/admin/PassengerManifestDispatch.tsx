'use client'

import React, { useState, useEffect } from 'react'
import {
  ClipboardList,
  CheckCircle2,
  Clock,
  Search,
  Phone,
  MessageSquare,
  Printer,
  RefreshCw,
  Users,
  Bus,
  MapPin,
  Calendar,
  AlertCircle,
  ExternalLink,
  CheckSquare,
  Square,
  ShieldCheck,
  FileDown,
  FileText,
} from 'lucide-react'
import { RouteId, ROUTES } from '@/lib/config/routes'
import { todayIST } from '@/lib/time/ist'
import { ManifestPassenger } from '@/app/api/admin/manifest/route'
import { AHILYANAGAR_PICKUP_RAW, PUNE_PICKUP_RAW } from '@/lib/routes/seed-data'

interface ScheduledTripSummary {
  tripId: string
  routeId: string
  busId: string
  busNumber: string
  busName: string
  departureTime: string
  arrivalTime: string
  fare: number
}

export function PassengerManifestDispatch() {
  const [routeId, setRouteId] = useState<RouteId>('AHM_PUN')
  const [travelDate, setTravelDate] = useState<string>(todayIST())
  const [trips, setTrips] = useState<ScheduledTripSummary[]>([])
  const [selectedTripId, setSelectedTripId] = useState<string>('')
  const [loadingTrips, setLoadingTrips] = useState(false)

  // Manifest state
  const [loadingManifest, setLoadingManifest] = useState(false)
  const [manifestData, setManifestData] = useState<{
    busNumber: string
    busName: string
    totalSeats: number
    totalBooked: number
    boardedCount: number
    pendingBoarding: number
    boardingPercentage: number
    passengers: ManifestPassenger[]
  } | null>(null)

  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'BOARDED' | 'PENDING'>('ALL')
  const [sortBy, setSortBy] = useState<'seat' | 'route'>('route')
  const [togglingSeat, setTogglingSeat] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState('')

  // 1. Fetch available trips for selected route & date
  useEffect(() => {
    let active = true
    async function loadTrips() {
      setLoadingTrips(true)
      setErrorMsg('')
      try {
        const res = await fetch(`/api/admin/schedule?route=${routeId}&date=${travelDate}`)
        const data = await res.json()
        const list = (data.scheduledTrips || data.trips || []) as ScheduledTripSummary[]
        if (active && Array.isArray(list)) {
          setTrips(list)
          if (list.length > 0 && list[0]) {
            setSelectedTripId(list[0].tripId)
          } else {
            setSelectedTripId('')
            setManifestData(null)
          }
        }
      } catch (err: any) {
        if (active) setErrorMsg('Failed to load trips for selected date.')
      } finally {
        if (active) setLoadingTrips(false)
      }
    }
    loadTrips()
    return () => {
      active = false
    }
  }, [routeId, travelDate])

  // 2. Fetch manifest when tripId or date changes
  const fetchManifest = async (isBackground = false) => {
    if (!selectedTripId) return
    if (!isBackground) {
      setLoadingManifest(true)
      setErrorMsg('')
    }
    try {
      const res = await fetch(`/api/admin/manifest?tripId=${selectedTripId}&date=${travelDate}`)
      const data = await res.json()
      if (res.ok && data.success) {
        setManifestData({
          busNumber: data.busNumber,
          busName: data.busName,
          totalSeats: data.totalSeats,
          totalBooked: data.totalBooked,
          boardedCount: data.boardedCount,
          pendingBoarding: data.pendingBoarding,
          boardingPercentage: data.boardingPercentage,
          passengers: data.passengers,
        })
      } else if (!isBackground) {
        throw new Error(data.error?.message || 'Failed to load manifest')
      }
    } catch (err: any) {
      if (!isBackground) {
        setErrorMsg(err.message || 'Error loading manifest data.')
      }
    } finally {
      if (!isBackground) {
        setLoadingManifest(false)
      }
    }
  }

  useEffect(() => {
    fetchManifest()
    const interval = setInterval(() => {
      fetchManifest(true)
    }, 4000)
    return () => clearInterval(interval)
  }, [selectedTripId, travelDate])

  // 3. Toggle passenger boarding status
  const handleToggleBoarding = async (seatNo: string, currentStatus: boolean) => {
    if (!selectedTripId || togglingSeat) return
    setTogglingSeat(seatNo)
    const newStatus = !currentStatus

    try {
      const res = await fetch('/api/admin/manifest', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tripId: selectedTripId,
          travelDate,
          seatNo,
          boarded: newStatus,
        }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        // Optimistically update manifest data
        setManifestData((prev) => {
          if (!prev) return prev
          const updatedPassengers = prev.passengers.map((p) =>
            p.seatNo === seatNo ? { ...p, boarded: newStatus, boardedAt: newStatus ? new Date().toISOString() : undefined } : p
          )
          const newBoardedCount = updatedPassengers.filter((p) => p.boarded).length
          const newPending = prev.totalBooked - newBoardedCount
          return {
            ...prev,
            boardedCount: newBoardedCount,
            pendingBoarding: newPending,
            boardingPercentage: prev.totalBooked > 0 ? Math.round((newBoardedCount / prev.totalBooked) * 100) : 0,
            passengers: updatedPassengers,
          }
        })
      } else {
        alert(data.error?.message || 'Failed to update boarding status')
      }
    } catch (err: any) {
      alert('Network error updating boarding status.')
    } finally {
      setTogglingSeat(null)
    }
  }

  // Filter and sort passengers
  const isAhmPun = routeId === 'AHM_PUN'
  const pickupList = isAhmPun ? AHILYANAGAR_PICKUP_RAW : PUNE_PICKUP_RAW

  const getStopIdx = (stopName: string) => {
    const clean = (stopName || '').toLowerCase()
    const idx = pickupList.findIndex(
      (p) => clean.includes(p.name.toLowerCase()) || p.name.toLowerCase().includes(clean)
    )
    return idx >= 0 ? idx : 999
  }

  const filteredPassengers = (manifestData?.passengers || [])
    .filter((p) => {
      // Status filter
      if (filterStatus === 'BOARDED' && !p.boarded) return false
      if (filterStatus === 'PENDING' && p.boarded) return false

      // Search query
      if (!searchQuery.trim()) return true
      const q = searchQuery.toLowerCase().trim()
      return (
        p.seatNo.toLowerCase().includes(q) ||
        p.name.toLowerCase().includes(q) ||
        p.mobile.includes(q) ||
        p.ticketNo.toLowerCase().includes(q) ||
        p.pickupStop.toLowerCase().includes(q)
      )
    })
    .sort((a, b) => {
      if (sortBy === 'route') {
        const seqA = getStopIdx(a.pickupStop)
        const seqB = getStopIdx(b.pickupStop)
        if (seqA !== seqB) return seqA - seqB
        if (a.pickupTime !== b.pickupTime) {
          return (a.pickupTime || '').localeCompare(b.pickupTime || '')
        }
      }
      return a.seatNo.localeCompare(b.seatNo, undefined, { numeric: true })
    })

  const currentTrip = trips.find((t) => t.tripId === selectedTripId)

  return (
    <div className="space-y-6">
      {/* Top Filter & Trip Selector Card */}
      <section className="bg-white border border-gray-200 rounded-3xl p-5 md:p-6 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
          <h2 className="text-lg font-black text-gray-900 tracking-tight">
            Passenger Manifest &amp; Dispatch
          </h2>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => fetchManifest()}
              disabled={loadingManifest || !selectedTripId}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors disabled:opacity-50"
            >
              <RefreshCw size={13} className={loadingManifest ? 'animate-spin' : ''} />
              <span>Refresh</span>
            </button>
            <a
              href={selectedTripId ? `/api/admin/manifest/pdf?tripId=${selectedTripId}&date=${travelDate}` : '#'}
              target="_blank"
              rel="noreferrer"
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all shadow-xs ${
                selectedTripId
                  ? 'bg-[#F8B018] hover:bg-[#e09b0b] text-gray-950 cursor-pointer'
                  : 'bg-gray-200 text-gray-400 pointer-events-none'
              }`}
            >
              <FileDown size={14} />
              <span>Export PDF</span>
            </a>
          </div>
        </div>

        {/* Route, Date & Trip Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">
              Select Route
            </label>
            <select
              value={routeId}
              onChange={(e) => setRouteId(e.target.value as RouteId)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 bg-gray-50 text-xs font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#F8B018]"
            >
              {Object.values(ROUTES).map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} ({r.origin} &rarr; {r.destination})
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500">
                Travel Date
              </label>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setTravelDate(todayIST())}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors ${
                    travelDate === todayIST()
                      ? 'bg-gray-900 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const d = new Date()
                    d.setDate(d.getDate() + 1)
                    setTravelDate(d.toISOString().slice(0, 10))
                  }}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors ${
                    travelDate !== todayIST()
                      ? 'bg-gray-900 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Tomorrow
                </button>
              </div>
            </div>
            <input
              type="date"
              value={travelDate}
              onChange={(e) => setTravelDate(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 bg-gray-50 text-xs font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#F8B018]"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">
              Scheduled Departure
            </label>
            {loadingTrips ? (
              <div className="py-2.5 text-xs text-gray-400">Loading trips...</div>
            ) : trips.length > 0 ? (
              <select
                value={selectedTripId}
                onChange={(e) => setSelectedTripId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 bg-gray-50 text-xs font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#F8B018]"
              >
                {trips.map((t) => (
                  <option key={t.tripId} value={t.tripId}>
                    {t.departureTime} · {t.busNumber} (Uday Bus)
                  </option>
                ))}
              </select>
            ) : (
              <div className="py-2 px-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 font-medium">
                No trips scheduled for this date
              </div>
            )}
          </div>
        </div>
      </section>

      {errorMsg && (
        <div className="p-4 rounded-2xl border border-red-200 bg-red-50 text-red-900 text-xs flex items-center gap-2">
          <AlertCircle size={16} className="text-red-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Manifest Statistics Dashboard */}
      {manifestData && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">
              Bus &amp; Total Capacity
            </span>
            <strong className="text-xl sm:text-2xl font-black text-gray-950 block font-mono tracking-wider">
              {manifestData.busNumber}
            </strong>
            <span className="text-xs font-bold text-gray-700 block mt-0.5">
              Uday Bus · {manifestData.totalSeats} Total Passenger Seats
            </span>
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">
              Total Confirmed Bookings
            </span>
            <strong className="text-lg font-black text-gray-900 block font-mono">
              {manifestData.totalBooked} / {manifestData.totalSeats}
            </strong>
            <span className="text-xs text-amber-700 font-bold">
              {manifestData.totalSeats - manifestData.totalBooked} Empty Seats Available
            </span>
          </div>

          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 shadow-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block mb-1">
              Checked-In &amp; Boarded
            </span>
            <strong className="text-lg font-black text-emerald-900 block font-mono">
              {manifestData.boardedCount} Passengers
            </strong>
            <span className="text-xs text-emerald-700 font-bold">
              {manifestData.boardingPercentage}% Boarded
            </span>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 shadow-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 block mb-1">
              Pending Boarding
            </span>
            <strong className="text-lg font-black text-amber-950 block font-mono">
              {manifestData.pendingBoarding} Passengers
            </strong>
            <span className="text-xs text-amber-700 font-medium">
              Awaiting reporting at stop
            </span>
          </div>
        </div>
      )}

      {/* Manifest Table & Passenger Checklist Card */}
      {manifestData && (
        <section className="bg-white border border-gray-200 rounded-3xl overflow-hidden shadow-xs">
          {/* Table Toolbar */}
          <div className="p-4 sm:p-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gray-50/50">
            <div className="relative flex-1 max-w-sm">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search seat, name, mobile, PNR..."
                className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl border border-gray-300 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#F8B018]"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 self-end sm:self-auto">
              {/* Sort Order Selector */}
              <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-xl p-0.5 text-xs">
                <button
                  type="button"
                  onClick={() => setSortBy('route')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                    sortBy === 'route'
                      ? 'bg-amber-100 text-amber-950 shadow-xs'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                  title="Sort by Chronological Route Pickup Order"
                >
                  Route Order
                </button>
                <button
                  type="button"
                  onClick={() => setSortBy('seat')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                    sortBy === 'seat'
                      ? 'bg-amber-100 text-amber-950 shadow-xs'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                  title="Sort by Bus Seat Number"
                >
                  Seat Order
                </button>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setFilterStatus('ALL')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                    filterStatus === 'ALL'
                      ? 'bg-gray-900 text-white'
                      : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                  }`}
                >
                  All ({manifestData.passengers.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterStatus('PENDING')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                    filterStatus === 'PENDING'
                      ? 'bg-amber-500 text-gray-950'
                      : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                  }`}
                >
                  Pending ({manifestData.pendingBoarding})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterStatus('BOARDED')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                    filterStatus === 'BOARDED'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                  }`}
                >
                  Boarded ({manifestData.boardedCount})
                </button>
              </div>
            </div>
          </div>

          {/* Passenger Table */}
          {filteredPassengers.length === 0 ? (
            <div className="py-16 text-center text-xs text-gray-500">
              <Users size={32} className="mx-auto text-gray-300 mb-2" />
              <strong className="block text-gray-700">No passengers found</strong>
              <span>
                {manifestData.passengers.length === 0
                  ? 'There are currently no confirmed bookings on this trip.'
                  : 'No passenger matches the search or filter criteria.'}
              </span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-gray-100/70 border-b border-gray-200 text-gray-600 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-4">Boarding</th>
                    <th className="py-3 px-4">Seat</th>
                    <th className="py-3 px-4">Passenger Name</th>
                    <th className="py-3 px-4">Age / Gender</th>
                    <th className="py-3 px-4">Contact &amp; Call</th>
                    <th className="py-3 px-4">Pickup Point &amp; Time</th>
                    <th className="py-3 px-4">Drop Stop</th>
                    <th className="py-3 px-4">Ticket PNR</th>
                    <th className="py-3 px-4 text-right">Payment</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredPassengers.map((p) => {
                    const isToggling = togglingSeat === p.seatNo
                    return (
                      <tr
                        key={p.seatNo}
                        className={`transition-colors ${
                          p.boarded ? 'bg-emerald-50/40 hover:bg-emerald-50/70' : 'hover:bg-amber-50/30'
                        }`}
                      >
                        {/* Boarding Status Checkbox */}
                        <td className="py-3 px-4">
                          <button
                            type="button"
                            onClick={() => handleToggleBoarding(p.seatNo, p.boarded)}
                            disabled={isToggling}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl font-bold text-xs transition-all ${
                              p.boarded
                                ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                                : 'bg-gray-100 hover:bg-amber-100 text-gray-700 hover:text-amber-950 border border-gray-200'
                            }`}
                          >
                            {p.boarded ? (
                              <>
                                <CheckSquare size={14} />
                                <span>Boarded</span>
                              </>
                            ) : (
                              <>
                                <Square size={14} className="text-gray-400" />
                                <span>Check-in</span>
                              </>
                            )}
                          </button>
                        </td>

                        {/* Seat Number */}
                        <td className="py-3 px-4 font-mono font-black text-sm text-gray-900">
                          <span className="w-8 h-8 rounded-lg bg-amber-100 text-amber-950 flex items-center justify-center font-bold">
                            {p.seatNo}
                          </span>
                        </td>

                        {/* Passenger Name */}
                        <td className="py-3 px-4">
                          <strong className="block text-gray-900 font-extrabold">{p.name}</strong>
                          {p.boarded && p.boardedAt && (
                            <span className="text-[10px] text-emerald-700 font-mono block">
                              Boarded at {new Date(p.boardedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}
                        </td>

                        {/* Age & Gender */}
                        <td className="py-3 px-4 text-gray-600 font-medium">
                          {p.age} yrs · <span className="uppercase">{p.gender === 'female' ? 'Female' : 'Male'}</span>
                        </td>

                        {/* Contact Mobile & Quick Actions */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2 font-mono font-semibold text-gray-800">
                            <span>{p.mobile}</span>
                            <a
                              href={`tel:${p.mobile}`}
                              className="w-7 h-7 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-800 flex items-center justify-center transition-colors"
                              title="Call passenger"
                            >
                              <Phone size={13} />
                            </a>
                            <a
                              href={`https://wa.me/91${p.mobile.replace(/\D/g, '')}?text=Hello%20${encodeURIComponent(
                                p.name
                              )},%20this%20is%20Uday%20Travels%20regarding%20your%20journey%20on%20bus%20${encodeURIComponent(
                                manifestData.busNumber
                              )}%20Seat%20${p.seatNo}.`}
                              target="_blank"
                              rel="noreferrer"
                              className="w-7 h-7 rounded-lg bg-green-100 hover:bg-green-200 text-green-800 flex items-center justify-center transition-colors"
                              title="WhatsApp passenger"
                            >
                              <MessageSquare size={13} />
                            </a>
                          </div>
                        </td>

                        {/* Pickup Point & Time */}
                        <td className="py-3 px-4">
                          <strong className="text-gray-900 block truncate max-w-[160px]">
                            {p.pickupStop}
                          </strong>
                          <span className="text-[11px] text-amber-800 font-mono font-semibold block">
                            Reporting: {p.pickupTime}
                          </span>
                        </td>

                        {/* Drop Stop */}
                        <td className="py-3 px-4 text-gray-700 font-medium max-w-[150px] truncate">
                          {p.dropStop}
                        </td>

                        {/* Ticket PNR */}
                        <td className="py-3 px-4">
                          <a
                            href={`/ticket/${p.ticketNo}`}
                            target="_blank"
                            rel="noreferrer"
                            className="font-mono text-xs font-bold text-amber-800 hover:text-amber-950 hover:underline inline-flex items-center gap-1"
                          >
                            <span>{p.ticketNo}</span>
                            <ExternalLink size={11} />
                          </a>
                        </td>

                        {/* Payment Method */}
                        <td className="py-3 px-4 text-right">
                          <span className="font-mono font-bold text-gray-900 block">
                            ₹{(p.farePaise / 100).toFixed(2)}
                          </span>
                          <span className="text-[10px] text-gray-500 font-medium block">
                            {p.paymentMethod}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Table Footer */}
          <div className="p-4 bg-gray-50 border-t border-gray-100 text-xs text-gray-500 flex items-center justify-between">
            <span>
              Showing {filteredPassengers.length} of {manifestData.passengers.length} confirmed passengers
            </span>
            <span className="font-semibold text-gray-700">
              Uday Travels Dispatch Operations · Auto-synced
            </span>
          </div>
        </section>
      )}
    </div>
  )
}
