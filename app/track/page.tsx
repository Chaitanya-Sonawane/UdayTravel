'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import {
  ArrowLeft,
  BusFront,
  CheckCircle2,
  Clock,
  Compass,
  Gauge,
  MapPin,
  Navigation,
  Radio,
  RefreshCw,
  Route,
} from 'lucide-react'
import { subscribeToTracking, RtdbTrackingState } from '@/lib/firebase/rtdb-client'

function TrackContent() {
  const searchParams = useSearchParams()
  const initialTripId = searchParams.get('tripId') || 'AHM_PUN_0600'
  const ticketNo = searchParams.get('ticketNo')

  const [tripId, setTripId] = useState(initialTripId)
  const [tracking, setTracking] = useState<RtdbTrackingState | null>(null)
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    if (!tripId) return
    setConnected(false)

    const unsubscribe = subscribeToTracking(tripId, (data) => {
      setConnected(true)
      if (data) {
        setTracking(data)
      } else {
        // Default simulated telemetry if trip not yet broadcasting GPS
        setTracking({
          tripId,
          latitude: 19.0948,
          longitude: 74.748,
          speed: 48,
          heading: 240,
          status: 'in_transit',
          currentStop: 'Nepti Naka Chowk, Ahilyanagar',
          nextStop: 'Supa Toll Plaza',
          timestamp: Date.now(),
          updatedAt: new Date().toISOString(),
        })
      }
    })

    return () => {
      unsubscribe()
    }
  }, [tripId])

  const statusColor =
    tracking?.status === 'in_transit'
      ? 'bg-emerald-500'
      : tracking?.status === 'delayed'
      ? 'bg-amber-500'
      : 'bg-blue-500'

  return (
    <main className="min-h-screen bg-[#F8F9FA] text-[#111] pb-16">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between shadow-sm">
        <Link
          href="/"
          className="p-2 -ml-2 text-gray-700 hover:text-black rounded-lg transition"
          aria-label="Back home"
        >
          <ArrowLeft size={20} />
        </Link>
        <div className="text-center">
          <h1 className="text-base font-bold tracking-tight">Live Bus GPS Tracking</h1>
          <p className="text-[11px] font-medium text-gray-500 flex items-center justify-center gap-1">
            <span className={`inline-block w-2 h-2 rounded-full ${statusColor} animate-pulse`} />
            Firebase Realtime Telemetry
          </p>
        </div>
        <div className="w-8 flex items-center justify-end">
          <span className="w-8 h-8 rounded-full bg-[#F8B018]/20 text-[#B87000] font-black text-xs flex items-center justify-center">
            UT
          </span>
        </div>
      </header>

      <div className="max-w-xl mx-auto px-4 pt-4 space-y-4">
        {/* Trip Selector & Ticket info */}
        <div className="bg-white rounded-2xl p-4 border border-gray-200/80 shadow-sm flex items-center justify-between gap-3">
          <div className="flex-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">
              Select Trip to Track
            </label>
            <select
              value={tripId}
              onChange={(e) => setTripId(e.target.value)}
              className="w-full text-sm font-semibold bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#F8B018]"
            >
              <option value="AHM_PUN_0530">Ahilyanagar → Pune · 05:30 AM</option>
              <option value="AHM_PUN_0600">Ahilyanagar → Pune · 06:00 AM</option>
              <option value="AHM_PUN_0930">Ahilyanagar → Pune · 09:30 AM</option>
              <option value="AHM_PUN_1400">Ahilyanagar → Pune · 02:00 PM</option>
              <option value="PUN_AHM_0630">Pune → Ahilyanagar · 06:30 AM</option>
              <option value="PUN_AHM_1000">Pune → Ahilyanagar · 10:00 AM</option>
              <option value="PUN_AHM_1330">Pune → Ahilyanagar · 01:30 PM</option>
              <option value="PUN_AHM_1700">Pune → Ahilyanagar · 05:00 PM</option>
            </select>
          </div>
          {ticketNo && (
            <div className="text-right pl-3 border-l border-gray-200">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-0.5">
                Ticket No
              </span>
              <span className="text-xs font-mono font-bold text-gray-800">{ticketNo}</span>
            </div>
          )}
        </div>

        {/* Live Visual Map Representation */}
        <div className="bg-[#1e293b] rounded-2xl p-6 text-white shadow-md relative overflow-hidden">
          <div
            className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]"
            aria-hidden="true"
          />

          <div className="relative z-10 flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
              </span>
              <span className="text-xs uppercase tracking-widest font-bold text-emerald-400">
                LIVE BUS LOCATION
              </span>
            </div>
            <span className="text-[11px] font-mono text-gray-400">
              Bus MH 16 DP 4951
            </span>
          </div>

          {/* Graphical Route bar */}
          <div className="relative z-10 my-6">
            <div className="h-2 bg-slate-700 rounded-full overflow-hidden relative">
              <div
                className="h-full bg-gradient-to-r from-[#F8B018] to-emerald-400 rounded-full transition-all duration-700"
                style={{ width: '45%' }}
              />
            </div>

            <div className="flex justify-between items-center text-xs mt-3 font-semibold">
              <div className="flex items-center gap-1.5 text-gray-300">
                <CheckCircle2 size={14} className="text-[#F8B018]" />
                <span>Ahilyanagar</span>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white/10 rounded-full text-[11px] font-bold text-emerald-300 border border-white/10">
                <BusFront size={13} className="animate-bounce" />
                <span>En Route</span>
              </div>
              <div className="flex items-center gap-1.5 text-gray-400">
                <MapPin size={14} />
                <span>Pune</span>
              </div>
            </div>
          </div>

          {/* Real-time Telemetry Grid */}
          <div className="relative z-10 grid grid-cols-3 gap-2 pt-2 border-t border-slate-700/80 text-center">
            <div className="p-2 rounded-xl bg-slate-800/60">
              <div className="flex items-center justify-center gap-1 text-gray-400 text-[10px] uppercase font-bold mb-1">
                <Gauge size={12} /> Speed
              </div>
              <p className="text-base font-extrabold text-white">
                {tracking?.speed ?? 0} <span className="text-[10px] font-normal text-gray-400">km/h</span>
              </p>
            </div>
            <div className="p-2 rounded-xl bg-slate-800/60">
              <div className="flex items-center justify-center gap-1 text-gray-400 text-[10px] uppercase font-bold mb-1">
                <Compass size={12} /> Heading
              </div>
              <p className="text-base font-extrabold text-white">
                {tracking?.heading ?? 0}°
              </p>
            </div>
            <div className="p-2 rounded-xl bg-slate-800/60">
              <div className="flex items-center justify-center gap-1 text-gray-400 text-[10px] uppercase font-bold mb-1">
                <Radio size={12} /> Status
              </div>
              <p className="text-xs font-bold text-emerald-400 capitalize pt-0.5">
                {tracking?.status?.replace('_', ' ') || 'In Transit'}
              </p>
            </div>
          </div>
        </div>

        {/* Current & Next Stop Details */}
        <div className="bg-white rounded-2xl p-5 border border-gray-200/80 shadow-sm space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
            <Route size={14} /> Route Timeline
          </h2>

          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                <MapPin size={14} />
              </div>
              <div>
                <span className="text-[10px] uppercase tracking-wider font-bold text-gray-400 block">
                  Current / Last Passed Stop
                </span>
                <p className="text-sm font-bold text-gray-900">
                  {tracking?.currentStop || 'Nepti Naka Chowk, Ahilyanagar'}
                </p>
              </div>
            </div>

            <div className="ml-3 pl-3 border-l-2 border-dashed border-gray-200 h-4" />

            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-[#F8B018]/20 text-[#B87000] flex items-center justify-center shrink-0 mt-0.5">
                <Navigation size={14} />
              </div>
              <div>
                <span className="text-[10px] uppercase tracking-wider font-bold text-gray-400 block">
                  Next Approaching Stop
                </span>
                <p className="text-sm font-bold text-gray-900">
                  {tracking?.nextStop || 'Supa Toll Plaza'}
                </p>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-400">
            <span className="flex items-center gap-1">
              <Clock size={12} /> Last updated:{' '}
              {tracking?.updatedAt ? new Date(tracking.updatedAt).toLocaleTimeString() : 'Just now'}
            </span>
            <span className="font-mono text-[10px] text-gray-500">
              GPS: {tracking?.latitude?.toFixed(4)}, {tracking?.longitude?.toFixed(4)}
            </span>
          </div>
        </div>

        {/* Action button */}
        {ticketNo && (
          <Link
            href={`/ticket/${ticketNo}`}
            className="w-full py-3.5 bg-white border border-gray-200 hover:border-gray-300 rounded-xl font-bold text-sm text-center flex items-center justify-center gap-2 shadow-sm transition"
          >
            <span>View Ticket #{ticketNo}</span>
            <ArrowLeft size={16} className="rotate-180" />
          </Link>
        )}
      </div>
    </main>
  )
}

export default function TrackPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#F8F9FA] flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-[#F8B018] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs uppercase tracking-widest text-gray-500">Connecting GPS Telemetry...</p>
          </div>
        </main>
      }
    >
      <TrackContent />
    </Suspense>
  )
}
