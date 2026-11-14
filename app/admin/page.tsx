'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Users,
  Calendar,
  Bus,
  Search,
  Edit2,
  Check,
  X,
  LogOut,
  RefreshCw,
  AlertCircle,
  Save,
  CheckCircle2,
  Sliders,
  ChevronRight,
  Shield,
  Loader2,
  Plus,
  Grid3X3,
  CircleGauge,
  Sparkles,
  ArrowLeftRight,
  Clock,
  DollarSign,
  Armchair,
  Layers,
  Trash2,
} from 'lucide-react'
import { RouteId, ROUTES } from '@/lib/config/routes'
import { todayIST, weekdayLabel } from '@/lib/time/ist'
import { UserProfile, Gender } from '@/lib/schema/account'
import { SeatState, SEAT_ROWS, SEAT_COLS, generateDefaultSeatsMap } from '@/lib/schema/availability'

interface AdminTripItem {
  tripId: string
  busName: string
  busType?: string
  departureTime: string
  arrivalTime: string
  departure: string
  arrival: string
  booked: number
  seatsLeft: number
  totalCapacity: number
  status: string
  fare: number
  seats?: Record<string, SeatState>
  isCustom?: boolean
}

interface AdminAvailabilityData {
  route: RouteId
  date: string
  weekday: string
  trips: AdminTripItem[]
  updatedAt: string | null
}

function getNextDate(dateStr: string, daysAhead = 1): string {
  const d = new Date(`${dateStr}T12:00:00+05:30`)
  d.setDate(d.getDate() + daysAhead)
  return d.toISOString().slice(0, 10)
}

export default function AdminDashboardPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'schedules' | 'users' | 'payments' | 'refunds'>('schedules')

  // Payments & Refunds State
  const [paymentsList, setPaymentsList] = useState<any[]>([])
  const [loadingPayments, setLoadingPayments] = useState(false)
  const [refundsList, setRefundsList] = useState<any[]>([])
  const [loadingRefunds, setLoadingRefunds] = useState(false)
  const [reconciling, setReconciling] = useState(false)
  const [reconcileResult, setReconcileResult] = useState<any | null>(null)

  // Date constants in IST
  const today = useMemo(() => todayIST(), [])
  const tomorrow = useMemo(() => getNextDate(today, 1), [today])
  const maxDate = useMemo(() => getNextDate(today, 30), [today])

  // Availability / Schedule State
  const [selectedRoute, setSelectedRoute] = useState<RouteId>('AHM_PUN')
  const [selectedDate, setSelectedDate] = useState<string>(today)
  const [availabilityData, setAvailabilityData] = useState<AdminAvailabilityData | null>(null)
  const [availLoading, setAvailLoading] = useState(false)
  const [availActionNotice, setAvailActionNotice] = useState<string | null>(null)
  const [availError, setAvailError] = useState<string | null>(null)

  // Interactive Seat Chart Modal State
  const [activeTripForChart, setActiveTripForChart] = useState<AdminTripItem | null>(null)
  const [chartSeats, setChartSeats] = useState<Record<string, SeatState>>({})
  const [selectedSeatTool, setSelectedSeatTool] = useState<SeatState>('male')
  const [isSavingChart, setIsSavingChart] = useState(false)

  // Create Bus Schedule Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [newScheduleForm, setNewScheduleForm] = useState({
    busName: 'Uday Royal AC',
    departureTime: '18:30',
    arrivalTime: '21:15',
    fare: 200,
    totalSeats: 50,
  })
  const [isCreatingSchedule, setIsCreatingSchedule] = useState(false)

  // Users State
  const [users, setUsers] = useState<UserProfile[]>([])
  const [usersLoading, setUsersLoading] = useState(false)
  const [userSearchQuery, setUserSearchQuery] = useState('')
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null)
  const [editFormData, setEditFormData] = useState<{
    name: string
    mobile: string
    age: number
    gender: Gender
  }>({ name: '', mobile: '', age: 30, gender: 'man' })
  const [isSavingUser, setIsSavingUser] = useState(false)
  const [userActionNotice, setUserActionNotice] = useState<string | null>(null)

  // 1. Direct access: admin authentication removed
  // 2. Fetch Availability & Bus Schedules
  const fetchAvailability = useCallback(async () => {
    if (!selectedRoute || !selectedDate) return
    setAvailLoading(true)
    setAvailError(null)
    setAvailActionNotice(null)

    try {
      const res = await fetch(`/api/admin/availability?route=${selectedRoute}&date=${selectedDate}`)
      if (!res.ok) {
        throw new Error(`Failed with status ${res.status}`)
      }
      const data: AdminAvailabilityData = await res.json()
      setAvailabilityData(data)
    } catch (err: unknown) {
      console.error('Failed to fetch availability:', err)
      setAvailError(err instanceof Error ? err.message : 'Unknown network error')
    } finally {
      setAvailLoading(false)
    }
  }, [selectedRoute, selectedDate])

  // 3. Fetch Users Directory
  const fetchUsers = useCallback(async () => {
    setUsersLoading(true)
    setUserActionNotice(null)
    try {
      const res = await fetch('/api/admin/users')
      const data = await res.json()
      setUsers(data.users || [])
    } catch (err) {
      console.error('Failed to load users:', err)
    } finally {
      setUsersLoading(false)
    }
  }, [])

  const fetchPayments = useCallback(async () => {
    setLoadingPayments(true)
    try {
      const res = await fetch('/api/admin/payments')
      if (res.ok) {
        const data = await res.json()
        setPaymentsList(data.payments || [])
      }
    } catch (err) {
      console.warn('Failed to load payments:', err)
    } finally {
      setLoadingPayments(false)
    }
  }, [])

  const fetchRefunds = useCallback(async () => {
    setLoadingRefunds(true)
    try {
      const res = await fetch('/api/admin/refunds')
      if (res.ok) {
        const data = await res.json()
        setRefundsList(data.refunds || [])
      }
    } catch (err) {
      console.warn('Failed to load refunds:', err)
    } finally {
      setLoadingRefunds(false)
    }
  }, [])

  const handleRetryRefund = async (ticketNo: string) => {
    try {
      const res = await fetch(`/api/admin/refunds/${ticketNo}/retry`, { method: 'POST' })
      if (res.ok) {
        fetchRefunds()
      }
    } catch (err) {
      console.warn('Retry refund failed:', err)
    }
  }

  const handleRunReconcile = async () => {
    setReconciling(true)
    try {
      const res = await fetch('/api/admin/reconcile', { method: 'POST' })
      if (res.ok) {
        const data = await res.json()
        setReconcileResult(data.result)
        fetchRefunds()
      }
    } catch (err) {
      console.warn('Reconcile failed:', err)
    } finally {
      setReconciling(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'schedules') {
      fetchAvailability()

      // Realtime stream listener for Admin view
      let eventSource: EventSource | null = null
      try {
        eventSource = new EventSource(
          `/api/availability/stream?route=${selectedRoute}&date=${selectedDate}`
        )
        eventSource.onmessage = () => {
          fetchAvailability()
        }
      } catch (err) {
        console.warn('[Admin Realtime] Stream notice:', err)
      }

      return () => {
        if (eventSource) eventSource.close()
      }
    } else if (activeTab === 'users') {
      fetchUsers()
    } else if (activeTab === 'payments') {
      fetchPayments()
    } else if (activeTab === 'refunds') {
      fetchRefunds()
    }
  }, [activeTab, selectedRoute, selectedDate, fetchAvailability, fetchUsers, fetchPayments, fetchRefunds])

  // Open Seat Chart Modal for a Trip
  const openSeatChartModal = (trip: AdminTripItem) => {
    setActiveTripForChart(trip)
    const initialSeats: Record<string, SeatState> =
      trip.seats && Object.keys(trip.seats).length > 0
        ? { ...trip.seats }
        : generateDefaultSeatsMap(trip.booked)
    setChartSeats(initialSeats)
  }

  // Toggle seat state or apply selected tool
  const handleSeatClick = (seatId: string) => {
    setChartSeats((prev) => {
      const current = prev[seatId] || 'available'
      // If clicking with specific active tool: if already that tool, toggle to available; else set to tool
      const next = current === selectedSeatTool ? 'available' : selectedSeatTool
      return { ...prev, [seatId]: next }
    })
  }

  // Preset bulk actions for Seat Chart
  const handleBulkPreset = (action: 'all-available' | 'ladies-row' | 'sample-15' | 'sold-out') => {
    if (!activeTripForChart) return
    const updated: Record<string, SeatState> = {}

    if (action === 'all-available') {
      for (const row of SEAT_ROWS) {
        for (const col of SEAT_COLS) {
          updated[`${row}${col}`] = 'available'
        }
      }
    } else if (action === 'ladies-row') {
      // Keep existing, but make Rows A & B female
      for (const row of SEAT_ROWS) {
        for (const col of SEAT_COLS) {
          const id = `${row}${col}`
          if (row === 'A' || row === 'B') {
            updated[id] = 'female'
          } else {
            updated[id] = chartSeats[id] || 'available'
          }
        }
      }
    } else if (action === 'sample-15') {
      let count = 0
      for (const row of SEAT_ROWS) {
        for (const col of SEAT_COLS) {
          const id = `${row}${col}`
          if (count < 15) {
            updated[id] = count % 3 === 0 ? 'female' : 'male'
            count++
          } else {
            updated[id] = 'available'
          }
        }
      }
    } else if (action === 'sold-out') {
      let i = 0
      for (const row of SEAT_ROWS) {
        for (const col of SEAT_COLS) {
          const id = `${row}${col}`
          updated[id] = i % 4 === 0 ? 'female' : 'male'
          i++
        }
      }
    }

    setChartSeats(updated)
  }

  // Save Seat Chart to Firebase
  const handleSaveSeatChart = async () => {
    if (!activeTripForChart) return
    setIsSavingChart(true)
    setAvailError(null)

    const booked = Object.values(chartSeats).filter((s) => s !== 'available').length

    try {
      const res = await fetch('/api/admin/availability', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          route: selectedRoute,
          date: selectedDate,
          tripId: activeTripForChart.tripId,
          busName: activeTripForChart.busName,
          booked,
          seats: chartSeats,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error?.message || 'Failed to save seat chart')
      }

      setAvailActionNotice(
        `✓ Seat chart for "${activeTripForChart.busName}" saved to Firebase! (${50 - booked} seats available)`
      )
      setActiveTripForChart(null)
      await fetchAvailability()
    } catch (err: unknown) {
      setAvailError(err instanceof Error ? err.message : 'Failed to save seat chart')
    } finally {
      setIsSavingChart(false)
    }
  }

  // Create New Bus Schedule
  const handleCreateSchedule = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsCreatingSchedule(true)
    setAvailError(null)

    try {
      const res = await fetch('/api/admin/availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          route: selectedRoute,
          date: selectedDate,
          busName: newScheduleForm.busName,
          departureTime: newScheduleForm.departureTime,
          arrivalTime: newScheduleForm.arrivalTime,
          fare: Number(newScheduleForm.fare),
          totalSeats: Number(newScheduleForm.totalSeats),
          seats: generateDefaultSeatsMap(0),
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error?.message || 'Failed to create schedule')
      }

      setAvailActionNotice(`✓ New bus "${newScheduleForm.busName}" created and live on user panel!`)
      setIsCreateModalOpen(false)
      await fetchAvailability()
    } catch (err: unknown) {
      setAvailError(err instanceof Error ? err.message : 'Failed to create schedule')
    } finally {
      setIsCreatingSchedule(false)
    }
  }

  // Delete Bus Schedule
  const handleDeleteSchedule = async (tripId: string, busName: string) => {
    if (!window.confirm(`Delete bus schedule "${busName}"? This will immediately remove it from both Admin and User panels.`)) {
      return
    }

    setAvailLoading(true)
    setAvailError(null)

    try {
      const res = await fetch(
        `/api/admin/availability?route=${selectedRoute}&date=${selectedDate}&tripId=${tripId}`,
        {
          method: 'DELETE',
        }
      )
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error?.message || 'Failed to delete bus schedule')
      }

      setAvailActionNotice(`✓ Bus schedule "${busName}" deleted from Firebase.`)
      await fetchAvailability()
    } catch (err: unknown) {
      setAvailError(err instanceof Error ? err.message : 'Failed to delete bus schedule')
    } finally {
      setAvailLoading(false)
    }
  }

  // Users Directory search filter
  const filteredUsers = useMemo(() => {
    if (!userSearchQuery.trim()) return users
    const q = userSearchQuery.toLowerCase()
    return users.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.mobile.includes(q) ||
        u.uid.toLowerCase().includes(q)
    )
  }, [users, userSearchQuery])

  const handleEditUser = (user: UserProfile) => {
    setEditingUser(user)
    setEditFormData({
      name: user.name,
      mobile: user.mobile,
      age: user.age,
      gender: user.gender,
    })
  }

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingUser) return

    setIsSavingUser(true)
    setUserActionNotice(null)
    try {
      const res = await fetch(`/api/admin/users/${editingUser.uid}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editFormData),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error?.message || 'Update failed')
      }

      setUserActionNotice(`User "${editFormData.name}" updated in Firestore.`)
      setEditingUser(null)
      fetchUsers()
    } catch (err: unknown) {
      console.error(err)
      setUserActionNotice(
        `Failed to update: ${err instanceof Error ? err.message : 'Unknown error'}`
      )
    } finally {
      setIsSavingUser(false)
    }
  }

  const handleLogout = () => {
    router.push('/')
  }

  // Live counters for active seat chart modal
  const chartStats = useMemo(() => {
    const values = Object.values(chartSeats)
    const available = values.filter((s) => s === 'available').length
    const male = values.filter((s) => s === 'male').length
    const female = values.filter((s) => s === 'female').length
    const blocked = values.filter((s) => s === 'blocked').length
    return { available, male, female, blocked, total: 50 }
  }, [chartSeats])

  return (
    <main className="min-h-screen bg-[#0B0F19] text-white selection:bg-[#FF9D00] selection:text-black">
      {/* Top Header */}
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#0B0F19]/95 backdrop-blur-md px-5 py-4 md:px-10">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <a href="/" className="flex items-center gap-2 group">
              <span className="h-9 w-9 bg-[#FF9D00] text-[#0B0F19] font-black flex items-center justify-center font-[family-name:var(--font-archivo)] text-lg rounded-sm">
                UT
              </span>
              <div>
                <span className="font-bold tracking-wider text-sm block">UDAY TRAVELS</span>
                <span className="text-[10px] text-[#FF9D00] uppercase tracking-widest font-mono">
                  Admin Console
                </span>
              </div>
            </a>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-white/5 border border-white/10 text-xs text-white/60">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Firebase Live Connected
            </div>
            <a
              href="/availability"
              target="_blank"
              rel="noreferrer"
              className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-white/10 hover:bg-white/20 text-white transition-colors"
            >
              View User Booking Site ↗
            </a>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-1.5 text-xs text-red-300 hover:text-white bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 transition-colors"
            >
              <LogOut size={14} />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-5 py-8 md:px-10 space-y-8">
        {/* Navigation Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('schedules')}
              className={`flex items-center gap-2 px-5 py-2.5 text-sm font-bold tracking-wider uppercase transition-all rounded-sm ${
                activeTab === 'schedules'
                  ? 'bg-[#FF9D00] text-[#0B0F19] shadow-lg shadow-[#FF9D00]/20'
                  : 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Bus size={17} />
              <span>Bus Schedules & Seat Chart</span>
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`flex items-center gap-2 px-5 py-2.5 text-sm font-bold tracking-wider uppercase transition-all rounded-sm ${
                activeTab === 'users'
                  ? 'bg-[#FF9D00] text-[#0B0F19] shadow-lg shadow-[#FF9D00]/20'
                  : 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Users size={17} />
              <span>Users Directory</span>
            </button>
            <button
              onClick={() => setActiveTab('payments')}
              className={`flex items-center gap-2 px-5 py-2.5 text-sm font-bold tracking-wider uppercase transition-all rounded-sm ${
                activeTab === 'payments'
                  ? 'bg-[#FF9D00] text-[#0B0F19] shadow-lg shadow-[#FF9D00]/20'
                  : 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white'
              }`}
            >
              <DollarSign size={17} />
              <span>Payments</span>
            </button>
            <button
              onClick={() => setActiveTab('refunds')}
              className={`flex items-center gap-2 px-5 py-2.5 text-sm font-bold tracking-wider uppercase transition-all rounded-sm ${
                activeTab === 'refunds'
                  ? 'bg-[#FF9D00] text-[#0B0F19] shadow-lg shadow-[#FF9D00]/20'
                  : 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white'
              }`}
            >
              <ArrowLeftRight size={17} />
              <span>Refunds & Reconcile</span>
            </button>
          </div>

          {activeTab === 'schedules' && (
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs uppercase tracking-wider transition-transform hover:-translate-y-0.5"
            >
              <Plus size={16} />
              <span>Create Bus Schedule</span>
            </button>
          )}
        </div>

        {/* Global Notices */}
        {availActionNotice && (
          <div className="flex items-center gap-3 p-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm animate-in fade-in duration-200">
            <CheckCircle2 size={18} className="shrink-0 text-emerald-400" />
            <p>{availActionNotice}</p>
          </div>
        )}
        {availError && (
          <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/30 text-red-300 text-sm">
            <AlertCircle size={18} className="shrink-0 text-red-400" />
            <p>{availError}</p>
          </div>
        )}

        {/* TAB 1: BUS SCHEDULES & SEAT CHARTS */}
        {activeTab === 'schedules' && (
          <section className="space-y-6">
            {/* Control Bar: Route & Date Selection */}
            <div className="bg-[#11151F] border border-white/10 p-6 space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-end">
                {/* Route Selector */}
                <div className="lg:col-span-5 space-y-2">
                  <span className="text-xs uppercase tracking-wider text-white/50 font-semibold block">
                    1. Select Route
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedRoute('AHM_PUN')}
                      className={`p-3 text-left border transition-all ${
                        selectedRoute === 'AHM_PUN'
                          ? 'border-[#FF9D00] bg-[#FF9D00]/10 text-white font-bold'
                          : 'border-white/10 bg-white/5 text-white/70 hover:bg-white/10'
                      }`}
                    >
                      <span className="text-xs text-[#FF9D00] block">Origin → Destination</span>
                      <strong className="text-sm block">Ahilyanagar → Pune</strong>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedRoute('PUN_AHM')}
                      className={`p-3 text-left border transition-all ${
                        selectedRoute === 'PUN_AHM'
                          ? 'border-[#FF9D00] bg-[#FF9D00]/10 text-white font-bold'
                          : 'border-white/10 bg-white/5 text-white/70 hover:bg-white/10'
                      }`}
                    >
                      <span className="text-xs text-[#FF9D00] block">Origin → Destination</span>
                      <strong className="text-sm block">Pune → Ahilyanagar</strong>
                    </button>
                  </div>
                </div>

                {/* Date Selector */}
                <div className="lg:col-span-5 space-y-2">
                  <span className="text-xs uppercase tracking-wider text-white/50 font-semibold block">
                    2. Select Schedule Date
                  </span>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedDate(today)}
                      className={`px-3 py-2 text-xs font-semibold border ${
                        selectedDate === today
                          ? 'border-[#FF9D00] bg-[#FF9D00] text-black font-bold'
                          : 'border-white/10 bg-white/5 text-white/80 hover:bg-white/10'
                      }`}
                    >
                      Today ({today.slice(5)})
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedDate(tomorrow)}
                      className={`px-3 py-2 text-xs font-semibold border ${
                        selectedDate === tomorrow
                          ? 'border-[#FF9D00] bg-[#FF9D00] text-black font-bold'
                          : 'border-white/10 bg-white/5 text-white/80 hover:bg-white/10'
                      }`}
                    >
                      Tomorrow ({tomorrow.slice(5)})
                    </button>
                    <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-3 py-1.5">
                      <Calendar size={15} className="text-[#FF9D00]" />
                      <input
                        type="date"
                        min={today}
                        max={maxDate}
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="bg-transparent text-white text-xs outline-none cursor-pointer"
                      />
                    </div>
                  </div>
                </div>

                {/* Refresh Trigger */}
                <div className="lg:col-span-2 flex justify-end">
                  <button
                    onClick={fetchAvailability}
                    disabled={availLoading}
                    className="w-full lg:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white text-xs font-bold uppercase tracking-wider transition-colors"
                  >
                    <RefreshCw size={14} className={availLoading ? 'animate-spin' : ''} />
                    <span>Sync Firebase</span>
                  </button>
                </div>
              </div>

              {/* Status Ribbon */}
              <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-white/5 text-xs text-white/60">
                <div className="flex items-center gap-4">
                  <span>
                    Selected Route: <b className="text-white">{ROUTES[selectedRoute].name}</b>
                  </span>
                  <span>
                    Date: <b className="text-white">{weekdayLabel(selectedDate)}</b>
                  </span>
                </div>
                <span>
                  Firestore Record: <code className="text-[#FF9D00]">availability/{selectedRoute}_{selectedDate}</code>
                </span>
              </div>
            </div>

            {/* Bus Schedules Grid */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold uppercase tracking-wider text-white flex items-center gap-2">
                  <Bus size={18} className="text-[#FF9D00]" />
                  <span>Scheduled Buses ({availabilityData?.trips.length || 0})</span>
                </h2>
                <span className="text-xs text-white/50">
                  Changes save directly to Firebase and reflect live on the user panel
                </span>
              </div>

              {availLoading && (
                <div className="p-12 text-center bg-[#11151F] border border-white/10 text-white/50 flex flex-col items-center gap-3">
                  <Loader2 className="animate-spin text-[#FF9D00]" size={28} />
                  <p className="text-sm">Loading bus schedules from Firebase...</p>
                </div>
              )}

              {!availLoading && (!availabilityData || availabilityData.trips.length === 0) && (
                <div className="p-12 text-center bg-[#11151F] border border-dashed border-white/20 text-white/60 space-y-4">
                  <Bus size={36} className="text-[#FF9D00] mx-auto opacity-70" />
                  <div>
                    <h3 className="text-base font-bold text-white">No Bus Schedules for this Date</h3>
                    <p className="text-xs text-white/50 max-w-md mx-auto mt-1">
                      All default scheduled buses have been cleared. As admin, create the new bus schedule with its custom departure time, fare, and seat selection chart.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(true)}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#FF9D00] hover:bg-[#FFB433] text-black font-bold text-xs uppercase tracking-wider transition-transform hover:-translate-y-0.5 shadow-lg shadow-[#FF9D00]/20"
                  >
                    <Plus size={16} />
                    <span>Create Bus Schedule Now</span>
                  </button>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {!availLoading &&
                  availabilityData?.trips.map((trip) => {
                    const capacityPercent = Math.round(
                      (trip.booked / trip.totalCapacity) * 100
                    )
                    return (
                      <div
                        key={trip.tripId}
                        className="bg-[#11151F] border border-white/10 p-5 space-y-4 hover:border-[#FF9D00]/50 transition-colors relative group"
                      >
                        {/* Bus Card Header */}
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-bold text-base text-white">{trip.busName}</h3>
                              {trip.isCustom && (
                                <span className="text-[10px] bg-purple-500/20 text-purple-300 border border-purple-500/40 px-1.5 py-0.5 uppercase tracking-wider">
                                  Custom
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-white/60 flex items-center gap-2 mt-0.5">
                              <Clock size={12} className="text-[#FF9D00]" />
                              <span>
                                {trip.departureTime} → {trip.arrivalTime}
                              </span>
                              <span>·</span>
                              <DollarSign size={12} className="text-emerald-400" />
                              <span>₹{trip.fare}</span>
                            </p>
                          </div>

                          <span
                            className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 ${
                              trip.status === 'available'
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                : trip.status === 'almost-full'
                                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                  : trip.status === 'sold-out'
                                    ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                                    : 'bg-white/10 text-white/50 border border-white/20'
                            }`}
                          >
                            {trip.status}
                          </span>
                        </div>

                        {/* Capacity Progress Bar */}
                        <div className="space-y-1.5">
                          <div className="flex justify-between text-xs text-white/70">
                            <span>
                              Booked:{' '}
                              <b className="text-white">{trip.booked}</b> / {trip.totalCapacity} seats
                            </span>
                            <span className="text-[#FF9D00] font-bold">
                              {trip.seatsLeft} seats left
                            </span>
                          </div>
                          <div className="h-2 w-full bg-white/10 overflow-hidden rounded-full">
                            <div
                              className={`h-full transition-all duration-300 ${
                                capacityPercent > 80
                                  ? 'bg-red-500'
                                  : capacityPercent > 50
                                    ? 'bg-amber-400'
                                    : 'bg-emerald-400'
                              }`}
                              style={{ width: `${Math.min(100, capacityPercent)}%` }}
                            />
                          </div>
                        </div>

                        {/* Card Actions */}
                        <div className="pt-2 flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => openSeatChartModal(trip)}
                            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#FF9D00] hover:bg-[#FFB433] text-[#0B0F19] font-bold text-xs uppercase tracking-wider transition-transform hover:-translate-y-0.5 shadow-md shadow-[#FF9D00]/10"
                          >
                            <Grid3X3 size={15} />
                            <span>Edit Seat Selection Chart</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteSchedule(trip.tripId, trip.busName)}
                            className="p-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-300 hover:text-white border border-red-500/30 transition-colors rounded-sm"
                            title={`Delete ${trip.busName} schedule`}
                            aria-label={`Delete ${trip.busName} schedule`}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    )
                  })}
              </div>
            </div>
          </section>
        )}

        {/* TAB 2: USERS DIRECTORY */}
        {activeTab === 'users' && (
          <section className="space-y-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="relative w-full sm:w-80">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40"
                />
                <input
                  type="text"
                  placeholder="Search user name, mobile, UID..."
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                  className="w-full bg-[#11151F] border border-white/10 pl-9 pr-4 py-2 text-sm text-white placeholder:text-white/40 outline-none focus:border-[#FF9D00]"
                />
              </div>

              <button
                onClick={fetchUsers}
                disabled={usersLoading}
                className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold uppercase tracking-wider"
              >
                <RefreshCw size={14} className={usersLoading ? 'animate-spin' : ''} />
                <span>Refresh Directory</span>
              </button>
            </div>

            {userActionNotice && (
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm flex items-center gap-2">
                <CheckCircle2 size={16} />
                <p>{userActionNotice}</p>
              </div>
            )}

            {usersLoading ? (
              <div className="p-12 text-center text-white/50 bg-[#11151F] border border-white/10">
                <Loader2 className="animate-spin text-[#FF9D00] mx-auto mb-2" size={24} />
                <p>Loading users from Firestore...</p>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="p-12 text-center text-white/50 bg-[#11151F] border border-white/10">
                No travelers found matching your criteria.
              </div>
            ) : (
              <div className="overflow-x-auto border border-white/10 bg-[#11151F]">
                <table className="w-full text-left text-sm">
                  <thead className="bg-white/5 text-xs uppercase tracking-wider text-white/60 border-b border-white/10">
                    <tr>
                      <th className="py-3 px-4">Name</th>
                      <th className="py-3 px-4">Mobile</th>
                      <th className="py-3 px-4">Age / Gender</th>
                      <th className="py-3 px-4">UID</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredUsers.map((u) => (
                      <tr key={u.uid} className="hover:bg-white/[0.02]">
                        <td className="py-3 px-4 font-semibold text-white">{u.name}</td>
                        <td className="py-3 px-4 font-mono text-white/80">{u.mobile}</td>
                        <td className="py-3 px-4 capitalize text-white/70">
                          {u.age} yrs · {u.gender}
                        </td>
                        <td className="py-3 px-4 font-mono text-xs text-white/40">{u.uid}</td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => handleEditUser(u)}
                            className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/10 hover:bg-[#FF9D00] hover:text-black text-xs font-semibold uppercase transition-colors"
                          >
                            <Edit2 size={12} />
                            <span>Edit</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {/* TAB 3: PAYMENTS */}
        {activeTab === 'payments' && (
          <section className="space-y-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-white uppercase tracking-wider">
                  Payment Transactions
                </h2>
                <p className="text-xs text-white/50">
                  Authoritative record of captured payments via Razorpay & Wallet
                </p>
              </div>

              <button
                onClick={fetchPayments}
                disabled={loadingPayments}
                className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold uppercase tracking-wider"
              >
                <RefreshCw size={14} className={loadingPayments ? 'animate-spin' : ''} />
                <span>Refresh Payments</span>
              </button>
            </div>

            {loadingPayments ? (
              <div className="py-20 text-center text-white/40 font-mono text-sm">
                <Loader2 size={24} className="animate-spin mx-auto mb-2 text-[#FF9D00]" />
                Loading payments...
              </div>
            ) : paymentsList.length === 0 ? (
              <div className="py-20 text-center bg-[#11151F] border border-white/10 text-white/40">
                No payments recorded yet.
              </div>
            ) : (
              <div className="overflow-x-auto border border-white/10 bg-[#11151F]">
                <table className="w-full text-left text-sm">
                  <thead className="bg-white/5 text-white/60 text-xs uppercase tracking-wider border-b border-white/10">
                    <tr>
                      <th className="py-3 px-4">Payment ID</th>
                      <th className="py-3 px-4">Group / Order</th>
                      <th className="py-3 px-4">Amount</th>
                      <th className="py-3 px-4">Method</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {paymentsList.map((p) => (
                      <tr key={p.razorpayPaymentId} className="hover:bg-white/[0.02]">
                        <td className="py-3 px-4 font-mono font-semibold text-[#FF9D00]">
                          {p.razorpayPaymentId}
                        </td>
                        <td className="py-3 px-4 font-mono text-xs text-white/60">
                          {p.grp}
                        </td>
                        <td className="py-3 px-4 font-semibold text-white">
                          ₹{p.amountPaise / 100}
                        </td>
                        <td className="py-3 px-4 uppercase text-xs text-white/80">
                          {p.method || 'Online'}
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 text-[11px] font-bold uppercase rounded-sm bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                            {p.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-xs text-white/50">
                          {p.createdAt ? new Date(p.createdAt).toLocaleString('en-IN') : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {/* TAB 4: REFUNDS & RECONCILIATION */}
        {activeTab === 'refunds' && (
          <section className="space-y-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-white uppercase tracking-wider">
                  Refunds & Reconciliation Engine
                </h2>
                <p className="text-xs text-white/50">
                  Manage cancelled ticket refunds and automated reconciliation
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={handleRunReconcile}
                  disabled={reconciling}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold uppercase tracking-wider transition-colors"
                >
                  <RefreshCw size={14} className={reconciling ? 'animate-spin' : ''} />
                  <span>{reconciling ? 'Reconciling...' : 'Run Reconciliation'}</span>
                </button>

                <button
                  onClick={fetchRefunds}
                  disabled={loadingRefunds}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold uppercase tracking-wider"
                >
                  <RefreshCw size={14} className={loadingRefunds ? 'animate-spin' : ''} />
                  <span>Refresh</span>
                </button>
              </div>
            </div>

            {reconcileResult && (
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-mono space-y-1">
                <div className="font-bold uppercase">Reconciliation Summary:</div>
                <div>Orders Checked: {reconcileResult.ordersChecked} · Orders Recovered: {reconcileResult.ordersRecovered} · Orders Expired: {reconcileResult.ordersExpired}</div>
                <div>Refunds Checked: {reconcileResult.refundsChecked} · Refunds Recovered: {reconcileResult.refundsRecovered}</div>
                {reconcileResult.errors?.length > 0 && (
                  <div className="text-red-400 mt-2">
                    Errors: {reconcileResult.errors.join(', ')}
                  </div>
                )}
              </div>
            )}

            {loadingRefunds ? (
              <div className="py-20 text-center text-white/40 font-mono text-sm">
                <Loader2 size={24} className="animate-spin mx-auto mb-2 text-[#FF9D00]" />
                Loading refunds...
              </div>
            ) : refundsList.length === 0 ? (
              <div className="py-20 text-center bg-[#11151F] border border-white/10 text-white/40">
                No refunds recorded.
              </div>
            ) : (
              <div className="overflow-x-auto border border-white/10 bg-[#11151F]">
                <table className="w-full text-left text-sm">
                  <thead className="bg-white/5 text-white/60 text-xs uppercase tracking-wider border-b border-white/10">
                    <tr>
                      <th className="py-3 px-4">Ticket No</th>
                      <th className="py-3 px-4">Source Refund</th>
                      <th className="py-3 px-4">Wallet Refund</th>
                      <th className="py-3 px-4">Fee Retained</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Razorpay Refund ID</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {refundsList.map((r) => (
                      <tr key={r.ticketNo} className="hover:bg-white/[0.02]">
                        <td className="py-3 px-4 font-mono font-semibold text-white">
                          {r.ticketNo}
                        </td>
                        <td className="py-3 px-4 font-mono font-semibold text-emerald-400">
                          ₹{r.sourceRefundPaise / 100}
                        </td>
                        <td className="py-3 px-4 font-mono text-white/80">
                          ₹{r.walletRefundPaise / 100}
                        </td>
                        <td className="py-3 px-4 font-mono text-red-400">
                          ₹{r.feePaise / 100}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 text-[11px] font-bold uppercase rounded-sm border ${
                              r.status === 'PROCESSED'
                                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                                : r.status === 'FAILED'
                                  ? 'bg-red-500/20 text-red-400 border-red-500/30'
                                  : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                            }`}
                          >
                            {r.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono text-xs text-white/50">
                          {r.razorpayRefundId || '—'}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {r.status !== 'PROCESSED' && (
                            <button
                              onClick={() => handleRetryRefund(r.ticketNo)}
                              className="px-3 py-1 bg-white/10 hover:bg-[#FF9D00] hover:text-black text-xs font-semibold uppercase transition-colors"
                            >
                              Retry
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}
      </div>

      {/* MODAL 1: INTERACTIVE SEAT SELECTION CHART */}
      {activeTripForChart && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#11151F] border border-white/10 max-w-4xl w-full p-6 md:p-8 space-y-6 shadow-2xl my-8">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-white/10 pb-4">
              <div>
                <span className="text-xs uppercase tracking-widest text-[#FF9D00] font-mono">
                  Bus Seat Chart Management
                </span>
                <h2 className="text-xl font-black uppercase text-white mt-1">
                  {activeTripForChart.busName} · {activeTripForChart.departureTime}
                </h2>
                <p className="text-xs text-white/60 mt-0.5">
                  Route: {ROUTES[selectedRoute].name} · Date: {weekdayLabel(selectedDate)}
                </p>
              </div>
              <button
                onClick={() => setActiveTripForChart(null)}
                className="p-2 text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>

            {/* Live Chart Statistics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-white/5 border border-white/10 text-center">
                <span className="text-[10px] uppercase tracking-wider text-emerald-400 block font-semibold">
                  Available
                </span>
                <strong className="text-xl text-emerald-300 font-mono">
                  {chartStats.available}
                </strong>
              </div>
              <div className="p-3 bg-white/5 border border-white/10 text-center">
                <span className="text-[10px] uppercase tracking-wider text-blue-400 block font-semibold">
                  Booked (Male)
                </span>
                <strong className="text-xl text-blue-300 font-mono">{chartStats.male}</strong>
              </div>
              <div className="p-3 bg-white/5 border border-white/10 text-center">
                <span className="text-[10px] uppercase tracking-wider text-pink-400 block font-semibold">
                  Booked (Female)
                </span>
                <strong className="text-xl text-pink-300 font-mono">{chartStats.female}</strong>
              </div>
              <div className="p-3 bg-white/5 border border-white/10 text-center">
                <span className="text-[10px] uppercase tracking-wider text-amber-400 block font-semibold">
                  Blocked / Staff
                </span>
                <strong className="text-xl text-amber-300 font-mono">{chartStats.blocked}</strong>
              </div>
            </div>

            {/* Tool Selector Palette */}
            <div className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-white/50 block">
                Click Tool Palette: (Select a tool, then click seats to apply)
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedSeatTool('available')}
                  className={`p-2.5 text-xs font-bold uppercase tracking-wider border flex items-center justify-center gap-2 transition-all ${
                    selectedSeatTool === 'available'
                      ? 'border-emerald-400 bg-emerald-500/20 text-emerald-300 shadow-md'
                      : 'border-white/10 bg-white/5 text-white/70 hover:bg-white/10'
                  }`}
                >
                  <span className="w-3 h-3 rounded-full border border-emerald-400 bg-transparent" />
                  <span>Available (Clear)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedSeatTool('male')}
                  className={`p-2.5 text-xs font-bold uppercase tracking-wider border flex items-center justify-center gap-2 transition-all ${
                    selectedSeatTool === 'male'
                      ? 'border-blue-400 bg-blue-500/20 text-blue-300 shadow-md'
                      : 'border-white/10 bg-white/5 text-white/70 hover:bg-white/10'
                  }`}
                >
                  <span className="w-3 h-3 rounded-full bg-blue-500" />
                  <span>Booked (Male)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedSeatTool('female')}
                  className={`p-2.5 text-xs font-bold uppercase tracking-wider border flex items-center justify-center gap-2 transition-all ${
                    selectedSeatTool === 'female'
                      ? 'border-pink-400 bg-pink-500/20 text-pink-300 shadow-md'
                      : 'border-white/10 bg-white/5 text-white/70 hover:bg-white/10'
                  }`}
                >
                  <span className="w-3 h-3 rounded-full bg-pink-500" />
                  <span>Booked (Female)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedSeatTool('blocked')}
                  className={`p-2.5 text-xs font-bold uppercase tracking-wider border flex items-center justify-center gap-2 transition-all ${
                    selectedSeatTool === 'blocked'
                      ? 'border-amber-400 bg-amber-500/20 text-amber-300 shadow-md'
                      : 'border-white/10 bg-white/5 text-white/70 hover:bg-white/10'
                  }`}
                >
                  <span className="w-3 h-3 rounded-full bg-amber-500" />
                  <span>Blocked / Staff</span>
                </button>
              </div>
            </div>

            {/* Quick Bulk Presets */}
            <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
              <span className="text-white/50 font-semibold uppercase text-[10px]">
                Quick Presets:
              </span>
              <button
                type="button"
                onClick={() => handleBulkPreset('all-available')}
                className="px-2.5 py-1 bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 hover:text-white"
              >
                Reset All Available
              </button>
              <button
                type="button"
                onClick={() => handleBulkPreset('ladies-row')}
                className="px-2.5 py-1 bg-pink-500/10 hover:bg-pink-500/20 border border-pink-500/30 text-pink-300"
              >
                Set Rows A & B Women
              </button>
              <button
                type="button"
                onClick={() => handleBulkPreset('sample-15')}
                className="px-2.5 py-1 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-blue-300"
              >
                Simulate 15 Bookings
              </button>
              <button
                type="button"
                onClick={() => handleBulkPreset('sold-out')}
                className="px-2.5 py-1 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-300"
              >
                Mark Full Bus (Sold Out)
              </button>
            </div>

            {/* Visual Bus Seat Chart (3+2 Seating Layout matching User Panel) */}
            <div className="bg-[#0B0F19] border border-white/10 p-6 rounded-sm space-y-4 max-w-md mx-auto">
              <div className="flex items-center justify-between pb-3 border-b border-white/10 text-xs text-white/50">
                <div className="flex items-center gap-2 text-white">
                  <CircleGauge size={18} className="text-[#FF9D00]" />
                  <span className="font-bold uppercase tracking-wider">Driver Cabin</span>
                </div>
                <span>3+2 Seater Coach</span>
              </div>

              {/* Seat Matrix Header */}
              <div className="grid grid-cols-7 gap-2 text-center text-xs text-white/40 font-mono">
                <span />
                <span>1</span>
                <span>2</span>
                <span className="text-[10px] text-white/20">Aisle</span>
                <span>3</span>
                <span>4</span>
                <span>5</span>
              </div>

              {/* Rows A to J */}
              <div className="space-y-2">
                {SEAT_ROWS.map((row) => (
                  <div key={row} className="grid grid-cols-7 gap-2 items-center">
                    <span className="text-xs font-mono font-bold text-white/50 text-center">
                      {row}
                    </span>

                    {/* Seat 1 & 2 */}
                    {[1, 2].map((col) => {
                      const id = `${row}${col}`
                      const state = chartSeats[id] || 'available'
                      return (
                        <button
                          key={id}
                          type="button"
                          onClick={() => handleSeatClick(id)}
                          className={`h-9 rounded-sm flex items-center justify-center text-xs font-mono font-bold border transition-transform hover:scale-105 ${
                            state === 'female'
                              ? 'bg-pink-600/30 border-pink-500 text-pink-200'
                              : state === 'male'
                                ? 'bg-blue-600/30 border-blue-500 text-blue-200'
                                : state === 'blocked'
                                  ? 'bg-amber-600/30 border-amber-500 text-amber-200'
                                  : 'bg-white/5 border-white/20 text-white hover:border-[#FF9D00]'
                          }`}
                          title={`Seat ${id} (${state})`}
                        >
                          {col}
                        </button>
                      )
                    })}

                    {/* Center Aisle */}
                    <div className="h-full flex items-center justify-center text-white/10 text-[9px] font-mono">
                      |
                    </div>

                    {/* Seat 3, 4, 5 */}
                    {[3, 4, 5].map((col) => {
                      const id = `${row}${col}`
                      const state = chartSeats[id] || 'available'
                      return (
                        <button
                          key={id}
                          type="button"
                          onClick={() => handleSeatClick(id)}
                          className={`h-9 rounded-sm flex items-center justify-center text-xs font-mono font-bold border transition-transform hover:scale-105 ${
                            state === 'female'
                              ? 'bg-pink-600/30 border-pink-500 text-pink-200'
                              : state === 'male'
                                ? 'bg-blue-600/30 border-blue-500 text-blue-200'
                                : state === 'blocked'
                                  ? 'bg-amber-600/30 border-amber-500 text-amber-200'
                                  : 'bg-white/5 border-white/20 text-white hover:border-[#FF9D00]'
                          }`}
                          title={`Seat ${id} (${state})`}
                        >
                          {col}
                        </button>
                      )
                    })}
                  </div>
                ))}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
              <button
                type="button"
                onClick={() => setActiveTripForChart(null)}
                className="px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold uppercase tracking-wider"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSavingChart}
                onClick={handleSaveSeatChart}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#FF9D00] hover:bg-[#FFB433] text-black font-bold text-xs uppercase tracking-wider transition-transform hover:-translate-y-0.5 shadow-lg shadow-[#FF9D00]/20 disabled:opacity-50"
              >
                {isSavingChart ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Save size={16} />
                )}
                <span>Save Seat Chart to Firebase</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: CREATE BUS SCHEDULE */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#11151F] border border-white/10 max-w-lg w-full p-6 md:p-8 space-y-6 shadow-2xl">
            <div className="flex items-start justify-between border-b border-white/10 pb-4">
              <div>
                <span className="text-xs uppercase tracking-widest text-[#FF9D00] font-mono">
                  New Bus Schedule
                </span>
                <h2 className="text-xl font-black uppercase text-white mt-1">
                  Schedule a Bus
                </h2>
                <p className="text-xs text-white/60">
                  {ROUTES[selectedRoute].name} · {weekdayLabel(selectedDate)}
                </p>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-2 text-white/60 hover:text-white hover:bg-white/10"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateSchedule} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase tracking-wider text-white/70">
                  Bus Name / Model
                </label>
                <input
                  type="text"
                  required
                  value={newScheduleForm.busName}
                  onChange={(e) =>
                    setNewScheduleForm((prev) => ({ ...prev, busName: e.target.value }))
                  }
                  placeholder="e.g. Uday Royal AC 05"
                  className="w-full bg-[#0B0F19] border border-white/10 px-3 py-2 text-sm text-white outline-none focus:border-[#FF9D00]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold uppercase tracking-wider text-white/70">
                    Departure Time (HH:mm)
                  </label>
                  <input
                    type="time"
                    required
                    value={newScheduleForm.departureTime}
                    onChange={(e) =>
                      setNewScheduleForm((prev) => ({ ...prev, departureTime: e.target.value }))
                    }
                    className="w-full bg-[#0B0F19] border border-white/10 px-3 py-2 text-sm text-white outline-none focus:border-[#FF9D00]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold uppercase tracking-wider text-white/70">
                    Arrival Time (HH:mm)
                  </label>
                  <input
                    type="time"
                    required
                    value={newScheduleForm.arrivalTime}
                    onChange={(e) =>
                      setNewScheduleForm((prev) => ({ ...prev, arrivalTime: e.target.value }))
                    }
                    className="w-full bg-[#0B0F19] border border-white/10 px-3 py-2 text-sm text-white outline-none focus:border-[#FF9D00]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold uppercase tracking-wider text-white/70">
                    Fare (₹ per seat)
                  </label>
                  <input
                    type="number"
                    min="50"
                    max="5000"
                    required
                    value={newScheduleForm.fare}
                    onChange={(e) =>
                      setNewScheduleForm((prev) => ({ ...prev, fare: Number(e.target.value) }))
                    }
                    className="w-full bg-[#0B0F19] border border-white/10 px-3 py-2 text-sm text-white outline-none focus:border-[#FF9D00]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold uppercase tracking-wider text-white/70">
                    Total Seats
                  </label>
                  <input
                    type="number"
                    disabled
                    value={50}
                    className="w-full bg-[#0B0F19]/50 border border-white/5 px-3 py-2 text-sm text-white/50 outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold uppercase"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingSchedule}
                  className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs uppercase flex items-center gap-2"
                >
                  {isCreatingSchedule && <Loader2 size={14} className="animate-spin" />}
                  <span>Save & Publish Schedule</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: EDIT USER PROFILE */}
      {editingUser && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#11151F] border border-white/10 max-w-md w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <span className="text-xs uppercase text-[#FF9D00] font-mono">User Management</span>
                <h3 className="text-lg font-bold text-white">Edit Traveler Profile</h3>
              </div>
              <button
                onClick={() => setEditingUser(null)}
                className="p-1.5 text-white/60 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase text-white/70">Full Name</label>
                <input
                  type="text"
                  required
                  value={editFormData.name}
                  onChange={(e) =>
                    setEditFormData((prev) => ({ ...prev, name: e.target.value }))
                  }
                  className="w-full bg-[#0B0F19] border border-white/10 px-3 py-2 text-sm text-white outline-none focus:border-[#FF9D00]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase text-white/70">
                  Mobile Number
                </label>
                <input
                  type="tel"
                  required
                  pattern="[6-9][0-9]{9}"
                  value={editFormData.mobile}
                  onChange={(e) =>
                    setEditFormData((prev) => ({ ...prev, mobile: e.target.value }))
                  }
                  className="w-full bg-[#0B0F19] border border-white/10 px-3 py-2 text-sm text-white outline-none focus:border-[#FF9D00]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold uppercase text-white/70">Age</label>
                  <input
                    type="number"
                    min="1"
                    max="120"
                    required
                    value={editFormData.age}
                    onChange={(e) =>
                      setEditFormData((prev) => ({ ...prev, age: Number(e.target.value) }))
                    }
                    className="w-full bg-[#0B0F19] border border-white/10 px-3 py-2 text-sm text-white outline-none focus:border-[#FF9D00]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold uppercase text-white/70">Gender</label>
                  <select
                    value={editFormData.gender}
                    onChange={(e) =>
                      setEditFormData((prev) => ({
                        ...prev,
                        gender: e.target.value as Gender,
                      }))
                    }
                    className="w-full bg-[#0B0F19] border border-white/10 px-3 py-2 text-sm text-white outline-none focus:border-[#FF9D00]"
                  >
                    <option value="man">Man</option>
                    <option value="woman">Woman</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold uppercase"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingUser}
                  className="px-5 py-2 bg-[#FF9D00] hover:bg-[#FFB433] text-black font-bold text-xs uppercase flex items-center gap-2"
                >
                  {isSavingUser && <Loader2 size={14} className="animate-spin" />}
                  <span>Save Profile</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  )
}
