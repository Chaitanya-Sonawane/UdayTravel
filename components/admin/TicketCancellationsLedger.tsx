'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Ban,
  Search,
  Printer,
  Download,
  RefreshCw,
  Phone,
  MessageSquare,
  ExternalLink,
  Calendar,
  CheckCircle2,
  Clock,
  ArrowRight,
  TrendingDown,
  Receipt,
  Banknote,
  Smartphone,
  Wallet,
  X,
  Users,
  ShieldAlert,
  ShieldCheck,
  Globe,
  RotateCcw,
  AlertTriangle,
  Check,
  Zap,
  CreditCard,
  ChevronDown,
  Ticket,
  Copy,
} from 'lucide-react'
import { RouteId, ROUTES } from '@/lib/config/routes'
import { todayIST } from '@/lib/time/ist'
import { CancellationAuditRecord } from '@/app/api/admin/cancellations/route'

// Tilted ticket empty state illustration matching the user's mockup
function EmptyCancellationsIllustration() {
  return (
    <div className="flex flex-col items-center justify-center py-10">
      <div className="relative mb-2">
        {/* Tilted Ticket SVG */}
        <svg
          width="100"
          height="80"
          viewBox="0 0 100 80"
          fill="none"
          className="transform -rotate-12 drop-shadow-xs"
        >
          {/* Ticket Body with scalloped edges */}
          <rect x="5" y="10" width="90" height="60" rx="9" fill="#FDB022" />
          {/* Decorative vertical perforated dashes */}
          <line
            x1="68"
            y1="13"
            x2="68"
            y2="67"
            stroke="white"
            strokeWidth="2.5"
            strokeDasharray="4 4"
            strokeLinecap="round"
          />
          {/* Left Notch */}
          <circle cx="5" cy="40" r="7.5" fill="white" />
          {/* Right Notch */}
          <circle cx="95" cy="40" r="7.5" fill="white" />
          {/* Ticket interior mock lines */}
          <rect x="18" y="24" width="36" height="5" rx="2.5" fill="white" fillOpacity="0.85" />
          <rect x="18" y="35" width="26" height="4" rx="2" fill="white" fillOpacity="0.65" />
          <rect x="18" y="45" width="32" height="4" rx="2" fill="white" fillOpacity="0.65" />
        </svg>

        {/* Circular Cancel Badge in center */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-[#EAB308] border-2 border-white flex items-center justify-center shadow-xs">
          <X size={16} className="text-white stroke-[3.2]" />
        </div>
      </div>

      {/* Soft pale shadow ellipse underneath */}
      <div className="w-28 h-3.5 bg-yellow-100/90 rounded-full blur-2xs mb-4" />

      <h3 className="text-lg font-bold text-gray-900 tracking-tight">
        No Cancellations Found
      </h3>
      <p className="text-sm text-gray-500 font-normal mt-1">
        You haven&apos;t cancelled any tickets yet.
      </p>
    </div>
  )
}

function EmptyRefundsIllustration() {
  return (
    <div className="flex flex-col items-center justify-center py-10">
      <div className="relative mb-2">
        <svg
          width="100"
          height="80"
          viewBox="0 0 100 80"
          fill="none"
          className="transform -rotate-12 drop-shadow-xs"
        >
          <rect x="5" y="10" width="90" height="60" rx="9" fill="#10B981" />
          <line
            x1="68"
            y1="13"
            x2="68"
            y2="67"
            stroke="white"
            strokeWidth="2.5"
            strokeDasharray="4 4"
            strokeLinecap="round"
          />
          <circle cx="5" cy="40" r="7.5" fill="white" />
          <circle cx="95" cy="40" r="7.5" fill="white" />
          <rect x="18" y="24" width="36" height="5" rx="2.5" fill="white" fillOpacity="0.85" />
          <rect x="18" y="35" width="26" height="4" rx="2" fill="white" fillOpacity="0.65" />
          <rect x="18" y="45" width="32" height="4" rx="2" fill="white" fillOpacity="0.65" />
        </svg>

        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-emerald-600 border-2 border-white flex items-center justify-center shadow-xs">
          <RotateCcw size={15} className="text-white stroke-[2.8]" />
        </div>
      </div>

      <div className="w-28 h-3.5 bg-emerald-100/90 rounded-full blur-2xs mb-4" />

      <h3 className="text-lg font-bold text-gray-900 tracking-tight">
        No Refunds Found
      </h3>
      <p className="text-sm text-gray-500 font-normal mt-1">
        There are no processed refunds yet.
      </p>
    </div>
  )
}

function formatDisplayDateTime(isoString: string): string {
  try {
    const d = new Date(isoString)
    const formatted = new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).format(d)
    return formatted.replace(/\b(am|pm)\b/gi, (m) => m.toLowerCase())
  } catch {
    return isoString
  }
}

export function TicketCancellationsLedger() {
  const [selectedDate, setSelectedDate] = useState<string>('ALL') // 'ALL' | todayIST() | 'THIS_MONTH'
  const [selectedRoute, setSelectedRoute] = useState<string>('ALL')
  const [originFilter, setOriginFilter] = useState<'ALL' | 'WEBAPP' | 'MANUAL'>('ALL')
  const [activeSubTab, setActiveSubTab] = useState<'cancellations' | 'refunds'>('cancellations')
  const [searchQuery, setSearchQuery] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // Data state
  const [loading, setLoading] = useState(false)
  const [cancellations, setCancellations] = useState<CancellationAuditRecord[]>([])
  const [totalCancelledCount, setTotalCancelledCount] = useState(0)
  const [webAppCount, setWebAppCount] = useState(0)
  const [manualCount, setManualCount] = useState(0)
  const [totalRefunded, setTotalRefunded] = useState(0)
  const [totalFeeCollected, setTotalFeeCollected] = useState(0)
  const [actionNotice, setActionNotice] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

  // Manual cancel modal state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [manualTicketNo, setManualTicketNo] = useState('')
  const [manualReason, setManualReason] = useState('Customer counter request')
  const [manualWaiveFee, setManualWaiveFee] = useState(false)
  const [cancelling, setCancelling] = useState(false)

  // Fetch cancellations
  const fetchCancellations = useCallback(async () => {
    setLoading(true)
    try {
      const dateParam =
        selectedDate === 'ALL' || selectedDate === 'THIS_MONTH'
          ? ''
          : selectedDate
          ? `&date=${selectedDate}`
          : ''
      const routeParam = selectedRoute !== 'ALL' ? `&route=${selectedRoute}` : ''
      const originParam = originFilter !== 'ALL' ? `&origin=${originFilter}` : ''
      const searchParam = searchQuery.trim() ? `&q=${encodeURIComponent(searchQuery.trim())}` : ''

      const res = await fetch(
        `/api/admin/cancellations?t=${Date.now()}${dateParam}${routeParam}${originParam}${searchParam}`
      )
      const data = await res.json()
      if (data.success) {
        setCancellations(data.cancellations || [])
        setTotalCancelledCount(data.totalCancelledCount || 0)
        setWebAppCount(data.webAppCount || 0)
        setManualCount(data.manualCount || 0)
        setTotalRefunded(data.totalRefunded || 0)
        setTotalFeeCollected(data.totalFeeCollected || 0)
      } else {
        throw new Error(data.error?.message || data.error || 'Failed to load cancellations')
      }
    } catch (err: any) {
      setActionNotice({ type: 'error', text: err.message || 'Error fetching cancellations' })
    } finally {
      setLoading(false)
    }
  }, [selectedDate, selectedRoute, originFilter, searchQuery])

  useEffect(() => {
    fetchCancellations()
  }, [fetchCancellations])

  // Filter cancellations locally for "THIS_MONTH" and search query
  const filteredCancellations = useMemo(() => {
    return cancellations.filter((c) => {
      // Month filter
      if (selectedDate === 'THIS_MONTH') {
        const currentMonth = todayIST().slice(0, 7)
        const matchesMonth =
          c.travelDate?.startsWith(currentMonth) || c.cancelledAt?.startsWith(currentMonth)
        if (!matchesMonth) return false
      }

      // Search query
      if (!searchQuery.trim()) return true
      const q = searchQuery.toLowerCase().trim()
      return (
        c.passengerName.toLowerCase().includes(q) ||
        c.passengerMobile.includes(q) ||
        c.ticketNo.toLowerCase().includes(q) ||
        c.seatNo.toLowerCase().includes(q) ||
        c.cancellationReason.toLowerCase().includes(q) ||
        c.routeName.toLowerCase().includes(q)
      )
    })
  }, [cancellations, selectedDate, searchQuery])

  // Derived refunds list
  const refundsList = useMemo(() => {
    return filteredCancellations.filter((c) => c.netRefundAmount > 0)
  }, [filteredCancellations])

  // KPI computations matching screenshot
  const computedTotalCancelled = filteredCancellations.length
  const computedRefunded = filteredCancellations.reduce((acc, c) => acc + c.netRefundAmount, 0)
  const computedPendingRefund = filteredCancellations
    .filter((c) => c.refundStatus === 'PENDING')
    .reduce((acc, c) => acc + c.netRefundAmount, 0)
  const computedCompletedRefund = filteredCancellations
    .filter((c) => c.refundStatus === 'PROCESSED' || !c.refundStatus)
    .reduce((acc, c) => acc + c.netRefundAmount, 0)

  // Copy helper
  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(text)
    setTimeout(() => setCopiedId(null), 2000)
  }

  // Execute manual cancellation via desk counter API
  const handleExecuteManualCancel = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!manualTicketNo.trim()) {
      alert('Please enter a ticket number.')
      return
    }

    setCancelling(true)
    setActionNotice(null)
    try {
      const res = await fetch('/api/admin/cancellations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticketNo: manualTicketNo.trim().toUpperCase(),
          reason: manualReason,
          waiveFee: manualWaiveFee,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error?.message || data.error || 'Failed to cancel ticket')
      }

      setActionNotice({
        type: 'success',
        text: `✓ Ticket ${manualTicketNo.trim().toUpperCase()} cancelled successfully! Seats released back to bus inventory.`,
      })

      setManualTicketNo('')
      setIsModalOpen(false)
      await fetchCancellations()
    } catch (err: any) {
      setActionNotice({ type: 'error', text: err.message || 'Error cancelling ticket' })
    } finally {
      setCancelling(false)
    }
  }

  // Export CSV
  const handleExportCSV = () => {
    if (filteredCancellations.length === 0) {
      alert('No cancellation records to export.')
      return
    }

    const headers = [
      'Sr No',
      'Origin',
      'Ticket PNR',
      'Passenger Name',
      'Phone Number',
      'Route',
      'Seats',
      'Fare Paid (INR)',
      'Cancellation Fee (INR)',
      'Net Refund (INR)',
      'Refund Destination',
      'Cancellation Reason',
      'Cancelled Time (IST)',
    ]

    const rows = filteredCancellations.map((c, idx) => [
      idx + 1,
      `"${c.originLabel}"`,
      `"${c.ticketNo}"`,
      `"${c.passengerName.replace(/"/g, '""')}"`,
      `"${c.passengerMobile}"`,
      `"${c.routeName}"`,
      `"${c.seatNo}"`,
      c.farePaid,
      c.cancellationFee,
      c.netRefundAmount,
      `"${c.refundDestination}"`,
      `"${c.cancellationReason.replace(/"/g, '""')}"`,
      `"${c.cancelledAtFormatted}"`,
    ])

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n')

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute(
      'download',
      `Uday_Travels_Cancellations_Audit_${selectedDate}.csv`
    )
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="space-y-6">
      {/* Action Notification Banner */}
      {actionNotice && (
        <div
          className={`p-3.5 rounded-2xl text-xs font-semibold flex items-center justify-between shadow-xs ${
            actionNotice.type === 'success'
              ? 'bg-emerald-50 text-emerald-950 border border-emerald-200'
              : 'bg-red-50 text-red-950 border border-red-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {actionNotice.type === 'success' ? (
              <CheckCircle2 size={16} className="text-emerald-600" />
            ) : (
              <AlertTriangle size={16} className="text-red-600" />
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

      {/* 1. Main Executive Container Pixel-faithful to Screenshot */}
      <section className="bg-white border border-gray-100 rounded-3xl shadow-sm p-6 sm:p-8 relative overflow-hidden transition-all">
        {/* Soft yellow ambient accent glow at top-right */}
        <div className="absolute top-0 right-0 w-64 h-36 bg-gradient-to-bl from-[#FDE047]/30 via-[#FEF08A]/15 to-transparent pointer-events-none rounded-tr-3xl" />

        {/* Card Header matching Screenshot */}
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5 pb-2">
          {/* Left Title with Amber Reload Icon */}
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[#FDB022] text-gray-950 flex items-center justify-center shrink-0 shadow-xs">
              <RotateCcw size={26} strokeWidth={2.4} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 tracking-tight">
                Ticket Cancellations &amp; Refunds
              </h2>
              <p className="text-sm text-gray-500 font-normal mt-0.5">
                Track cancellations and refund status
              </p>
            </div>
          </div>

          {/* Right: Date Filter Pills and Route Dropdown matching Screenshot */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Date Pills Group */}
            <div className="flex items-center gap-1 bg-gray-100/70 p-1 rounded-full text-xs font-semibold">
              <button
                type="button"
                onClick={() => setSelectedDate('ALL')}
                className={`px-4 py-1.5 rounded-full text-xs transition-all ${
                  selectedDate === 'ALL'
                    ? 'bg-[#FDB022] text-gray-950 font-bold shadow-xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                All Dates
              </button>
              <button
                type="button"
                onClick={() => setSelectedDate(todayIST())}
                className={`px-4 py-1.5 rounded-full text-xs transition-all ${
                  selectedDate === todayIST()
                    ? 'bg-[#FDB022] text-gray-950 font-bold shadow-xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => setSelectedDate('THIS_MONTH')}
                className={`px-4 py-1.5 rounded-full text-xs transition-all ${
                  selectedDate === 'THIS_MONTH'
                    ? 'bg-[#FDB022] text-gray-950 font-bold shadow-xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                This Month
              </button>
            </div>

            {/* Route Dropdown Pill matching Screenshot */}
            <div className="relative">
              <select
                value={selectedRoute}
                onChange={(e) => setSelectedRoute(e.target.value)}
                className="appearance-none bg-white border border-gray-200 hover:border-gray-300 text-gray-800 text-xs font-bold pl-4 pr-8 py-2 rounded-full cursor-pointer focus:outline-none shadow-2xs"
              >
                <option value="ALL">All Routes</option>
                <option value="AHM_PUN">Ahilyanagar &rarr; Pune</option>
                <option value="PUN_AHM">Pune &rarr; Ahilyanagar</option>
              </select>
              <ChevronDown
                size={13}
                className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500"
              />
            </div>
          </div>
        </div>

        {/* 2. 4 Metric KPI Cards matching Screenshot */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
          {/* Card 1: Total Cancelled */}
          <div className="bg-white border border-gray-100 rounded-2xl p-4 sm:p-5 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center shrink-0">
              <Ban size={22} className="text-rose-500" strokeWidth={2.2} />
            </div>
            <div>
              <span className="text-xs font-semibold text-gray-500 block">
                Total Cancelled
              </span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-2xl font-black text-gray-900">
                  {computedTotalCancelled}
                </span>
                <span className="text-xs text-gray-400 font-medium">Tickets</span>
              </div>
            </div>
          </div>

          {/* Card 2: Refunded */}
          <div className="bg-white border border-gray-100 rounded-2xl p-4 sm:p-5 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-[#FEF9C3] text-amber-600 flex items-center justify-center shrink-0">
              <ShieldCheck size={22} className="text-[#D97706]" strokeWidth={2.2} />
            </div>
            <div>
              <span className="text-xs font-semibold text-gray-500 block">
                Refunded
              </span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-2xl font-black text-gray-900">
                  ₹{computedRefunded.toLocaleString('en-IN')}
                </span>
                <span className="text-xs text-gray-400 font-medium">Amount</span>
              </div>
            </div>
          </div>

          {/* Card 3: Pending Refund */}
          <div className="bg-white border border-gray-100 rounded-2xl p-4 sm:p-5 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
              <CreditCard size={22} className="text-purple-500" strokeWidth={2.2} />
            </div>
            <div>
              <span className="text-xs font-semibold text-gray-500 block">
                Pending Refund
              </span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-2xl font-black text-gray-900">
                  ₹{computedPendingRefund.toLocaleString('en-IN')}
                </span>
                <span className="text-xs text-gray-400 font-medium">Amount</span>
              </div>
            </div>
          </div>

          {/* Card 4: Completed Refund */}
          <div className="bg-white border border-gray-100 rounded-2xl p-4 sm:p-5 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <CheckCircle2 size={22} className="text-emerald-500" strokeWidth={2.2} />
            </div>
            <div>
              <span className="text-xs font-semibold text-gray-500 block">
                Completed Refund
              </span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-2xl font-black text-gray-900">
                  ₹{computedCompletedRefund.toLocaleString('en-IN')}
                </span>
                <span className="text-xs text-gray-400 font-medium">Amount</span>
              </div>
            </div>
          </div>
        </div>

        {/* 3. Segmented Tabs matching Screenshot + Operational Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-6">
          {/* Left Tabs matching Screenshot */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveSubTab('cancellations')}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                activeSubTab === 'cancellations'
                  ? 'bg-[#FDB022] text-gray-950 shadow-xs'
                  : 'bg-gray-100/80 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <CreditCard size={14} className="stroke-[2.5]" />
              <span>Cancellations ({filteredCancellations.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSubTab('refunds')}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                activeSubTab === 'refunds'
                  ? 'bg-[#FDB022] text-gray-950 shadow-xs'
                  : 'bg-gray-100/80 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <RotateCcw size={14} className="stroke-[2.2]" />
              <span>Refunds ({refundsList.length})</span>
            </button>
          </div>

          {/* Right: Operational Actions (Search, Origin Filter, Manual Cancel Ticket) */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Origin Switcher */}
            <div className="flex items-center gap-1 bg-gray-100/80 p-0.5 rounded-xl text-[11px]">
              <button
                type="button"
                onClick={() => setOriginFilter('ALL')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                  originFilter === 'ALL'
                    ? 'bg-white text-gray-900 shadow-2xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                All Origins
              </button>
              <button
                type="button"
                onClick={() => setOriginFilter('WEBAPP')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                  originFilter === 'WEBAPP'
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'text-blue-800 hover:bg-blue-50'
                }`}
              >
                Web App
              </button>
              <button
                type="button"
                onClick={() => setOriginFilter('MANUAL')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                  originFilter === 'MANUAL'
                    ? 'bg-amber-500 text-gray-950 shadow-2xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Manual Desk
              </button>
            </div>

            {/* Quick Search */}
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search ticket, name..."
                className="pl-7 pr-6 py-1.5 text-xs rounded-xl border border-gray-200 bg-gray-50 focus:bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#F8B018] w-36 sm:w-44"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X size={11} />
                </button>
              )}
            </div>

            {/* Executive Manual Cancel Button */}
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#F8B018] hover:bg-[#e09e14] text-gray-950 font-bold text-xs rounded-xl shadow-xs transition-colors"
            >
              <Ban size={13} />
              <span>+ Manual Cancel</span>
            </button>

            {/* Print & CSV buttons */}
            <button
              type="button"
              onClick={() => window.print()}
              title="Print"
              className="p-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition-colors"
            >
              <Printer size={13} />
            </button>
            <button
              type="button"
              onClick={handleExportCSV}
              title="Export CSV"
              className="p-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition-colors"
            >
              <Download size={13} />
            </button>
          </div>
        </div>

        {/* 4. Content Area: Empty State matching Screenshot OR Detailed Table */}
        <div className="mt-5 border border-gray-100 rounded-3xl bg-white min-h-[340px] flex flex-col justify-center overflow-hidden">
          {loading ? (
            <div className="py-20 text-center text-xs text-gray-400 flex flex-col items-center gap-2.5 font-medium">
              <RefreshCw size={24} className="animate-spin text-[#F8B018]" />
              <span>Loading cancellations and refund records...</span>
            </div>
          ) : activeSubTab === 'cancellations' ? (
            filteredCancellations.length === 0 ? (
              <EmptyCancellationsIllustration />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-gray-100 text-gray-500 font-semibold text-xs bg-gray-50/50">
                      <th className="py-3.5 px-4 font-semibold text-gray-500 w-12">Sr.</th>
                      <th className="py-3.5 px-4 font-semibold text-gray-500">Ticket No</th>
                      <th className="py-3.5 px-4 font-semibold text-gray-500">Booking Details</th>
                      <th className="py-3.5 px-4 font-semibold text-gray-500">Cancellation Origin</th>
                      <th className="py-3.5 px-4 font-semibold text-gray-500">Amount &amp; Refund</th>
                      <th className="py-3.5 px-4 font-semibold text-gray-500">Refund Destination</th>
                      <th className="py-3.5 px-4 font-semibold text-gray-500">Date &amp; Time</th>
                      <th className="py-3.5 px-4 font-semibold text-gray-500">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredCancellations.map((c, idx) => {
                      const isManual = c.cancellationOrigin === 'MANUAL_ADMIN_OVERRIDE'
                      const rawSeats = c.seatNo || 'A1'
                      const seatsDisplay = rawSeats.startsWith('Seat') ? rawSeats : `Seats ${rawSeats}`

                      return (
                        <tr
                          key={`${c.ticketNo}_${idx}`}
                          className="hover:bg-gray-50/60 transition-colors"
                        >
                          {/* Sr */}
                          <td className="py-4.5 px-4 font-bold text-gray-900 text-sm align-middle">
                            {idx + 1}
                          </td>

                          {/* Ticket No with Copy */}
                          <td className="py-4.5 px-4 align-middle">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm text-gray-900 tracking-tight">
                                {c.ticketNo}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleCopy(c.ticketNo)}
                                className="text-gray-400 hover:text-gray-700 p-1 rounded-md transition-colors"
                                title="Copy Ticket No"
                              >
                                {copiedId === c.ticketNo ? (
                                  <Check size={14} className="text-emerald-600" />
                                ) : (
                                  <Copy size={14} />
                                )}
                              </button>
                            </div>
                          </td>

                          {/* Booking Details */}
                          <td className="py-4.5 px-4 align-middle">
                            <div className="font-bold text-sm text-gray-900">
                              {c.passengerName}
                            </div>
                            <div className="text-xs text-gray-500 font-medium mt-0.5">
                              {seatsDisplay} &bull; {c.routeName}
                            </div>
                          </td>

                          {/* Origin Badge */}
                          <td className="py-4.5 px-4 align-middle">
                            {isManual ? (
                              <div>
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FEF9C3] text-gray-900 border border-[#FDE047] text-xs font-semibold shadow-2xs">
                                  <ShieldAlert size={12} className="text-amber-800" />
                                  <span>Manual Desk Override</span>
                                </span>
                                <span className="text-[11px] text-gray-400 font-normal block mt-1">
                                  Desk Admin Cancel
                                </span>
                              </div>
                            ) : (
                              <div>
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EFF6FF] text-[#1E40AF] border border-[#BFDBFE] text-xs font-semibold shadow-2xs">
                                  <Globe size={12} className="text-blue-700" />
                                  <span>Web App Self-Service</span>
                                </span>
                                <span className="text-[11px] text-gray-400 font-normal block mt-1">
                                  Online Customer Cancel
                                </span>
                              </div>
                            )}
                          </td>

                          {/* Amount & Refund */}
                          <td className="py-4.5 px-4 align-middle">
                            <div className="font-extrabold text-base text-gray-900">
                              ₹{c.netRefundAmount.toLocaleString('en-IN')}
                            </div>
                            <div className="text-[11px] text-gray-400 font-normal mt-0.5">
                              Fare: ₹{c.farePaid} • Fee: ₹{c.cancellationFee}
                            </div>
                          </td>

                          {/* Refund Destination */}
                          <td className="py-4.5 px-4 align-middle">
                            {c.refundDestination === 'Razorpay Source Refund' ? (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FAF5FF] border border-[#D8B4FE] text-[#7E22CE] text-xs font-semibold">
                                <Zap size={12} className="text-purple-600" />
                                <span>Razorpay Refund</span>
                              </span>
                            ) : c.refundDestination === 'Counter Cash Return' ? (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FEF9C3] border border-[#FDE047] text-gray-900 text-xs font-semibold">
                                <Wallet size={12} className="text-gray-700" />
                                <span>Counter Cash</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#ECFDF5] border border-[#A7F3D0] text-[#065F46] text-xs font-semibold">
                                <Wallet size={12} className="text-emerald-700" />
                                <span>User Wallet</span>
                              </span>
                            )}
                          </td>

                          {/* Date & Time */}
                          <td className="py-4.5 px-4 align-middle">
                            <div className="text-xs sm:text-sm font-medium text-gray-800">
                              {formatDisplayDateTime(c.cancelledAt)}
                            </div>
                            {c.relativeTime && (
                              <div className="flex items-center gap-1 text-xs text-gray-400 mt-0.5 font-normal">
                                <Clock size={12} className="text-gray-400" />
                                <span>{c.relativeTime}</span>
                              </div>
                            )}
                          </td>

                          {/* Status */}
                          <td className="py-4.5 px-4 align-middle">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#ECFDF5] border border-[#6EE7B7] text-[#059669] text-xs font-semibold">
                              <CheckCircle2 size={13} className="text-[#10B981]" />
                              <span>Refunded</span>
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )
          ) : (
            /* Tab 2: Refunds View */
            refundsList.length === 0 ? (
              <EmptyRefundsIllustration />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-gray-100 text-gray-500 font-semibold text-xs bg-gray-50/50">
                      <th className="py-3.5 px-4 font-semibold text-gray-500 w-12">Sr.</th>
                      <th className="py-3.5 px-4 font-semibold text-gray-500">Refund Reference</th>
                      <th className="py-3.5 px-4 font-semibold text-gray-500">Beneficiary</th>
                      <th className="py-3.5 px-4 font-semibold text-gray-500">Refund Amount</th>
                      <th className="py-3.5 px-4 font-semibold text-gray-500">Routing Channel</th>
                      <th className="py-3.5 px-4 font-semibold text-gray-500">Processed Time</th>
                      <th className="py-3.5 px-4 font-semibold text-gray-500">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {refundsList.map((r, idx) => {
                      const refId = r.razorpayRefundId || `RFD-${r.ticketNo.replace(/^UT-/, '')}`
                      return (
                        <tr
                          key={`${refId}_${idx}`}
                          className="hover:bg-gray-50/60 transition-colors"
                        >
                          <td className="py-4.5 px-4 font-bold text-gray-900 text-sm align-middle">
                            {idx + 1}
                          </td>
                          <td className="py-4.5 px-4 align-middle">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm text-gray-900 tracking-tight font-mono">
                                {refId}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleCopy(refId)}
                                className="text-gray-400 hover:text-gray-700 p-1 rounded-md transition-colors"
                                title="Copy Ref ID"
                              >
                                {copiedId === refId ? (
                                  <Check size={14} className="text-emerald-600" />
                                ) : (
                                  <Copy size={14} />
                                )}
                              </button>
                            </div>
                            <div className="text-[11px] text-gray-400 font-normal mt-0.5">
                              Ticket: {r.ticketNo}
                            </div>
                          </td>
                          <td className="py-4.5 px-4 align-middle">
                            <div className="font-bold text-sm text-gray-900">
                              {r.passengerName}
                            </div>
                            <div className="text-xs text-gray-500 font-medium mt-0.5">
                              {r.passengerMobile || 'Counter Desk'} &bull; Seats {r.seatNo}
                            </div>
                          </td>
                          <td className="py-4.5 px-4 font-extrabold text-base text-gray-900 align-middle">
                            ₹{r.netRefundAmount.toLocaleString('en-IN')}
                          </td>
                          <td className="py-4.5 px-4 align-middle">
                            {r.refundDestination === 'Razorpay Source Refund' ? (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FAF5FF] border border-[#D8B4FE] text-[#7E22CE] text-xs font-semibold">
                                <Zap size={12} className="text-purple-600" />
                                <span>Razorpay Source</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FEF9C3] border border-[#FDE047] text-gray-900 text-xs font-semibold">
                                <Wallet size={12} className="text-gray-700" />
                                <span>Counter Cash</span>
                              </span>
                            )}
                          </td>
                          <td className="py-4.5 px-4 align-middle">
                            <div className="text-xs sm:text-sm font-medium text-gray-800">
                              {formatDisplayDateTime(r.cancelledAt)}
                            </div>
                          </td>
                          <td className="py-4.5 px-4 align-middle">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#ECFDF5] border border-[#6EE7B7] text-[#059669] text-xs font-semibold">
                              <CheckCircle2 size={13} className="text-[#10B981]" />
                              <span>Completed</span>
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )
          )}
        </div>
      </section>

      {/* 5. Executive Modal for Manual Administrative Cancellation */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-gray-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-900 flex items-center justify-center font-bold">
                  <Ban size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">
                    Manual Cancel Ticket
                  </h3>
                  <p className="text-xs text-gray-500 font-normal">
                    Administrative override with instant seat release
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 flex items-center justify-center transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleExecuteManualCancel} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Ticket Number / PNR *
                </label>
                <input
                  type="text"
                  required
                  value={manualTicketNo}
                  onChange={(e) => setManualTicketNo(e.target.value)}
                  placeholder="e.g. UT-AP-7XTYN4"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 text-sm font-mono font-bold text-gray-900 uppercase"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Cancellation Reason *
                </label>
                <select
                  value={manualReason}
                  onChange={(e) => setManualReason(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:border-amber-500 text-xs font-semibold text-gray-900 bg-gray-50"
                >
                  <option value="Customer counter request">Customer counter request</option>
                  <option value="Bus breakdown / mechanical failure">Bus breakdown / mechanical failure</option>
                  <option value="Emergency medical assistance">Emergency medical assistance</option>
                  <option value="Route rescheduling by operator">Route rescheduling by operator</option>
                  <option value="Phone call assistance request">Phone call assistance request</option>
                </select>
              </div>

              <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-2xl flex items-start gap-3">
                <input
                  type="checkbox"
                  id="waiveFee"
                  checked={manualWaiveFee}
                  onChange={(e) => setManualWaiveFee(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-amber-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
                />
                <label htmlFor="waiveFee" className="text-xs text-gray-800 cursor-pointer">
                  <span className="font-bold block text-amber-950">
                    Waive Cancellation Fee (100% Full Refund)
                  </span>
                  <span className="text-gray-600 block mt-0.5">
                    Recommended for bus breakdowns, trip delays, or management goodwill overrides.
                  </span>
                </label>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={cancelling}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-[#F8B018] hover:bg-[#e09e14] text-gray-950 shadow-xs transition-colors flex items-center gap-2"
                >
                  {cancelling && <RefreshCw size={14} className="animate-spin" />}
                  <span>{cancelling ? 'Releasing Seats...' : 'Confirm Cancellation'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
