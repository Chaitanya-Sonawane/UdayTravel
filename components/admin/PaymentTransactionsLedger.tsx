'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import {
  CreditCard,
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
  TrendingUp,
  Receipt,
  Banknote,
  Wallet,
  X,
  Copy,
  Check,
  Zap,
  AlertTriangle,
} from 'lucide-react'
import { RouteId, ROUTES } from '@/lib/config/routes'
import { todayIST } from '@/lib/time/ist'
import { PaymentAuditRecord } from '@/app/api/admin/payments/route'

// Authentic UPI Icon (slanted green & orange bars)
function UpiIcon({ className = 'w-3.5 h-3.5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M4.5 19.5L11 4.5H14.5L8 19.5H4.5Z" fill="#097939" />
      <path d="M11 19.5L17.5 4.5H21L14.5 19.5H11Z" fill="#ED752E" />
    </svg>
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

export function PaymentTransactionsLedger() {
  const [selectedDate, setSelectedDate] = useState<string>('ALL')
  const [selectedRoute, setSelectedRoute] = useState<string>('ALL')
  const [selectedMethod, setSelectedMethod] = useState<'ALL' | 'UPI' | 'CARD' | 'WALLET' | 'CASH'>('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // Data state
  const [loading, setLoading] = useState(false)
  const [payments, setPayments] = useState<PaymentAuditRecord[]>([])
  const [totalRevenue, setTotalRevenue] = useState(0)
  const [totalTransactions, setTotalTransactions] = useState(0)
  const [cashRevenue, setCashRevenue] = useState(0)
  const [razorpayRevenue, setRazorpayRevenue] = useState(0)
  const [razorpayCapturedCount, setRazorpayCapturedCount] = useState(0)
  const [isLiveRazorpayConnected, setIsLiveRazorpayConnected] = useState(false)
  const [errorNotice, setErrorNotice] = useState<string | null>(null)

  // Fetch payments
  const fetchPayments = useCallback(async () => {
    setLoading(true)
    setErrorNotice(null)
    try {
      const dateParam = selectedDate && selectedDate !== 'ALL' ? `&date=${selectedDate}` : ''
      const routeParam = selectedRoute !== 'ALL' ? `&route=${selectedRoute}` : ''
      const searchParam = searchQuery.trim() ? `&q=${encodeURIComponent(searchQuery.trim())}` : ''

      const res = await fetch(
        `/api/admin/payments?t=${Date.now()}${dateParam}${routeParam}${searchParam}`
      )
      const data = await res.json()
      if (data.success) {
        setPayments(data.payments || [])
        setTotalRevenue(data.totalRevenue || 0)
        setTotalTransactions(data.totalTransactions || 0)
        setCashRevenue(data.cashRevenue || 0)
        setRazorpayRevenue(data.razorpayRevenue || 0)
        setRazorpayCapturedCount(data.razorpayCapturedCount || 0)
        setIsLiveRazorpayConnected(Boolean(data.isLiveRazorpayConnected))
      } else {
        throw new Error(data.error?.message || data.error || 'Failed to load payments')
      }
    } catch (err: any) {
      setErrorNotice(err.message || 'Error fetching payment records')
    } finally {
      setLoading(false)
    }
  }, [selectedDate, selectedRoute, searchQuery])

  useEffect(() => {
    fetchPayments()
  }, [fetchPayments])

  // Filter payments by selected method and search query
  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      // Method filter
      if (selectedMethod === 'UPI') {
        const isUpi =
          p.paymentMethodCategory === 'UPI' ||
          p.paymentMethod.toLowerCase().includes('upi') ||
          p.razorpayInstrument?.toLowerCase().includes('upi')
        if (!isUpi) return false
      } else if (selectedMethod === 'CARD') {
        const isCard =
          p.paymentMethodCategory === 'CARD' ||
          p.paymentMethod.toLowerCase().includes('card') ||
          p.razorpayInstrument?.toLowerCase().includes('card')
        if (!isCard) return false
      } else if (selectedMethod === 'WALLET') {
        const isWallet =
          p.paymentMethodCategory === 'WALLET' ||
          p.paymentMethodCategory === 'NETBANKING' ||
          p.paymentMethod.toLowerCase().includes('wallet') ||
          p.paymentMethod.toLowerCase().includes('netbanking')
        if (!isWallet) return false
      } else if (selectedMethod === 'CASH') {
        const isCash =
          p.paymentMethodCategory === 'CASH' ||
          p.paymentMethod.toLowerCase().includes('cash') ||
          !p.isRazorpay
        if (!isCash) return false
      }

      // Local search query filter
      if (!searchQuery.trim()) return true
      const q = searchQuery.toLowerCase().trim()
      return (
        p.passengerName.toLowerCase().includes(q) ||
        p.passengerMobile.includes(q) ||
        p.ticketNo.toLowerCase().includes(q) ||
        p.seatNo.toLowerCase().includes(q) ||
        (p.razorpayPaymentId && p.razorpayPaymentId.toLowerCase().includes(q)) ||
        (p.razorpayOrderId && p.razorpayOrderId.toLowerCase().includes(q)) ||
        p.routeName.toLowerCase().includes(q) ||
        p.paymentMethod.toLowerCase().includes(q)
      )
    })
  }, [payments, selectedMethod, searchQuery])

  // Copy helper
  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(text)
    setTimeout(() => setCopiedId(null), 2000)
  }

  // Export to CSV
  const handleExportCSV = () => {
    if (payments.length === 0) {
      alert('No payment transactions to export.')
      return
    }

    const headers = [
      'Sr No',
      'Transaction ID',
      'Passenger Name',
      'Phone Number',
      'Seats',
      'Amount (INR)',
      'Payment Method',
      'Date & Time',
      'Status',
      'Razorpay Payment ID',
    ]

    const rows = payments.map((p, idx) => [
      idx + 1,
      `"${p.isRazorpay && p.razorpayPaymentId ? p.razorpayPaymentId : p.ticketNo}"`,
      `"${p.passengerName.replace(/"/g, '""')}"`,
      `"${p.passengerMobile}"`,
      `"${p.seatNo}"`,
      p.amount,
      `"${p.paymentMethod}"`,
      `"${p.bookedAtFormatted}"`,
      `"${p.paymentStatus}"`,
      `"${p.razorpayPaymentId || '-'}"`,
    ])

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n')

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute(
      'download',
      `Uday_Travels_Payment_Audit_${selectedDate || 'All'}.csv`
    )
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Print
  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="space-y-6">
      {/* 1. Sleek Management Bar & Operations */}
      <section className="bg-white border border-gray-200/90 rounded-2xl p-4 shadow-xs space-y-3.5 print:hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Quick Filter: Date Range & Route */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 bg-gray-100/80 p-1 rounded-xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => setSelectedDate('ALL')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  selectedDate === 'ALL'
                    ? 'bg-white text-gray-950 shadow-xs font-bold'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                All History
              </button>
              <button
                type="button"
                onClick={() => setSelectedDate(todayIST())}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  selectedDate === todayIST()
                    ? 'bg-white text-gray-950 shadow-xs font-bold'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Today
              </button>
              <input
                type="date"
                value={selectedDate === 'ALL' ? '' : selectedDate}
                onChange={(e) => setSelectedDate(e.target.value || 'ALL')}
                className="bg-transparent border-0 px-2 py-1 text-xs font-mono font-bold text-gray-800 focus:outline-none"
                placeholder="Pick date"
              />
            </div>

            <select
              value={selectedRoute}
              onChange={(e) => setSelectedRoute(e.target.value)}
              className="px-3 py-2 rounded-xl border border-gray-200 text-xs font-bold text-gray-800 bg-gray-50/80 hover:bg-white focus:outline-none focus:ring-2 focus:ring-[#F8B018]"
            >
              <option value="ALL">All Routes</option>
              <option value="AHM_PUN">Ahilyanagar &rarr; Pune</option>
              <option value="PUN_AHM">Pune &rarr; Ahilyanagar</option>
            </select>
          </div>

          {/* Search & Actions */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:w-64">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search ID, name, seat..."
                className="w-full pl-9 pr-7 py-2 text-xs rounded-xl border border-gray-200 bg-gray-50 focus:bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#F8B018]"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={fetchPayments}
              disabled={loading}
              title="Refresh / Sync payments"
              className="p-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition-colors"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>

            <button
              type="button"
              onClick={handlePrint}
              title="Print transaction sheet"
              className="p-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition-colors"
            >
              <Printer size={14} />
            </button>

            <button
              type="button"
              onClick={handleExportCSV}
              title="Export CSV"
              className="p-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition-colors"
            >
              <Download size={14} />
            </button>
          </div>
        </div>

        {errorNotice && (
          <div className="p-3 bg-red-50 text-red-900 border border-red-200 rounded-xl text-xs font-semibold">
            {errorNotice}
          </div>
        )}
      </section>

      {/* 2. Executive KPI Cards */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 print:hidden">
        <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
              Total Revenue
            </span>
            <div className="text-xl font-black text-gray-900 mt-0.5">
              ₹{totalRevenue.toLocaleString('en-IN')}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-black shrink-0">
            <Banknote size={18} />
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-purple-700 uppercase tracking-wider block">
              Razorpay Online
            </span>
            <div className="text-xl font-black text-gray-900 mt-0.5">
              ₹{razorpayRevenue.toLocaleString('en-IN')}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center font-black shrink-0">
            <Zap size={18} />
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider block">
              Counter Cash
            </span>
            <div className="text-xl font-black text-gray-900 mt-0.5">
              ₹{cashRevenue.toLocaleString('en-IN')}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-black shrink-0">
            <Wallet size={18} />
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
              Transactions
            </span>
            <div className="text-xl font-black text-gray-900 mt-0.5">
              {totalTransactions}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-gray-100 text-gray-700 flex items-center justify-center font-black shrink-0">
            <Clock size={18} />
          </div>
        </div>
      </section>

      {/* 3. The Centerpiece Card: Pixel-faithful to User's Mockup */}
      <section className="bg-white border border-gray-100 rounded-3xl shadow-sm p-6 sm:p-8 relative overflow-hidden transition-all">
        {/* Soft yellow ambient accent glow at top-right */}
        <div className="absolute top-0 right-0 w-64 h-36 bg-gradient-to-bl from-[#FDE047]/30 via-[#FEF08A]/15 to-transparent pointer-events-none rounded-tr-3xl" />

        {/* Card Header matching Screenshot */}
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6">
          {/* Left Title with Amber Rounded Icon */}
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[#FDB022] text-gray-950 flex items-center justify-center shrink-0 shadow-xs">
              <CreditCard size={28} strokeWidth={2.2} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 tracking-tight">
                Booking Payments
              </h2>
              <p className="text-sm text-gray-500 font-normal mt-0.5">
                Your payment details and transaction history
              </p>
            </div>
          </div>

          {/* Right: Payment Methods Pills with Interactive Filtering */}
          <div className="flex flex-col sm:items-end gap-1.5">
            <span className="text-xs font-semibold text-gray-500">Payment Methods</span>
            <div className="flex items-center gap-2 flex-wrap">
              {/* All Filter Pill */}
              <button
                type="button"
                onClick={() => setSelectedMethod('ALL')}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                  selectedMethod === 'ALL'
                    ? 'bg-gray-900 text-white shadow-xs font-semibold'
                    : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                All
              </button>

              {/* UPI Pill */}
              <button
                type="button"
                onClick={() => setSelectedMethod(selectedMethod === 'UPI' ? 'ALL' : 'UPI')}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all ${
                  selectedMethod === 'UPI'
                    ? 'bg-purple-100 border border-purple-400 text-purple-950 shadow-xs font-semibold'
                    : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <UpiIcon className="w-3.5 h-3.5" />
                <span>UPI</span>
              </button>

              {/* Cards Pill */}
              <button
                type="button"
                onClick={() => setSelectedMethod(selectedMethod === 'CARD' ? 'ALL' : 'CARD')}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all ${
                  selectedMethod === 'CARD'
                    ? 'bg-blue-100 border border-blue-400 text-blue-950 shadow-xs font-semibold'
                    : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <CreditCard size={13} className="text-gray-700" />
                <span>Cards</span>
              </button>

              {/* Wallet Pill */}
              <button
                type="button"
                onClick={() => setSelectedMethod(selectedMethod === 'WALLET' ? 'ALL' : 'WALLET')}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all ${
                  selectedMethod === 'WALLET'
                    ? 'bg-emerald-100 border border-emerald-400 text-emerald-950 shadow-xs font-semibold'
                    : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Wallet size={13} className="text-gray-700" />
                <span>Wallet</span>
              </button>

              {/* Cash Pill */}
              <button
                type="button"
                onClick={() => setSelectedMethod(selectedMethod === 'CASH' ? 'ALL' : 'CASH')}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all ${
                  selectedMethod === 'CASH'
                    ? 'bg-amber-100 border border-amber-400 text-amber-950 shadow-xs font-semibold'
                    : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Banknote size={13} className="text-gray-700" />
                <span>Cash</span>
              </button>
            </div>
          </div>
        </div>

        {/* Table Body matching Screenshot */}
        {loading ? (
          <div className="py-20 text-center text-xs text-gray-400 flex flex-col items-center gap-2.5 font-medium">
            <RefreshCw size={24} className="animate-spin text-[#F8B018]" />
            <span>Loading payment transactions...</span>
          </div>
        ) : filteredPayments.length === 0 ? (
          <div className="py-20 text-center text-xs text-gray-500 space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-gray-50 text-gray-400 flex items-center justify-center mx-auto">
              <Receipt size={24} />
            </div>
            <strong className="block text-gray-800 text-sm font-bold">No payment transactions found</strong>
            <p className="text-gray-400 max-w-sm mx-auto">
              No transactions match your current filters. Switch filters or click &quot;All&quot; to view all records.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-gray-100 text-gray-500 font-semibold text-xs bg-gray-50/50">
                  <th className="py-3.5 px-4 font-semibold text-gray-500 w-12">Sr.</th>
                  <th className="py-3.5 px-4 font-semibold text-gray-500">Transaction ID</th>
                  <th className="py-3.5 px-4 font-semibold text-gray-500">Booking Details</th>
                  <th className="py-3.5 px-4 font-semibold text-gray-500">Amount</th>
                  <th className="py-3.5 px-4 font-semibold text-gray-500">Payment Method</th>
                  <th className="py-3.5 px-4 font-semibold text-gray-500">Date &amp; Time</th>
                  <th className="py-3.5 px-4 font-semibold text-gray-500">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredPayments.map((p, idx) => {
                  // Determine display transaction ID (e.g. UT-AP-7XTYN4 or RZP-HUSYTT)
                  const displayId =
                    p.isRazorpay && p.razorpayPaymentId && !p.ticketNo.startsWith('UT-')
                      ? p.razorpayPaymentId
                      : p.ticketNo

                  // Determine seats display
                  const rawSeats = p.seatNo || 'B1'
                  const seatsDisplay = rawSeats.startsWith('Seat') ? rawSeats : `Seats ${rawSeats}`

                  // Determine payment method badge style
                  const isCash =
                    p.paymentMethodCategory === 'CASH' ||
                    p.paymentMethod.toLowerCase().includes('cash') ||
                    !p.isRazorpay

                  const isUpi =
                    p.paymentMethodCategory === 'UPI' ||
                    p.paymentMethod.toLowerCase().includes('upi') ||
                    p.razorpayInstrument?.toLowerCase().includes('upi') ||
                    (p.isRazorpay && !p.paymentMethod.toLowerCase().includes('card'))

                  const isCard =
                    p.paymentMethodCategory === 'CARD' ||
                    p.paymentMethod.toLowerCase().includes('card') ||
                    p.razorpayInstrument?.toLowerCase().includes('card')

                  // Status badge style
                  const isCaptured = p.gatewayStatus === 'captured' || (p.isRazorpay && p.paymentStatus === 'CONFIRMED')
                  const isConfirmed = !p.isRazorpay && p.paymentStatus === 'CONFIRMED'
                  const isRefunded = p.paymentStatus === 'REFUNDED'

                  return (
                    <tr
                      key={`${p.transactionId}_${idx}`}
                      className="hover:bg-gray-50/60 transition-colors"
                    >
                      {/* 1. Sr. (Clean bold number) */}
                      <td className="py-4.5 px-4 font-bold text-gray-900 text-sm align-middle">
                        {idx + 1}
                      </td>

                      {/* 2. Transaction ID with Copy Button */}
                      <td className="py-4.5 px-4 align-middle">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-gray-900 tracking-tight">
                            {displayId}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopy(displayId)}
                            className="text-gray-400 hover:text-gray-700 p-1 rounded-md transition-colors"
                            title="Copy ID"
                          >
                            {copiedId === displayId ? (
                              <Check size={14} className="text-emerald-600" />
                            ) : (
                              <Copy size={14} />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* 3. Booking Details (Passenger Name + Seats) */}
                      <td className="py-4.5 px-4 align-middle">
                        <div className="font-bold text-sm text-gray-900">
                          {p.passengerName || 'Online Customer'}
                        </div>
                        <div className="text-xs text-gray-500 font-medium mt-0.5">
                          {seatsDisplay}
                        </div>
                      </td>

                      {/* 4. Amount (₹200 in large bold font) */}
                      <td className="py-4.5 px-4 font-extrabold text-base text-gray-900 align-middle">
                        ₹{p.amount.toLocaleString('en-IN')}
                      </td>

                      {/* 5. Payment Method (Yellow or Purple pill with subtitle) */}
                      <td className="py-4.5 px-4 align-middle">
                        {isCash ? (
                          <div>
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FEF9C3] text-gray-900 border border-[#FDE047] text-xs font-semibold shadow-2xs">
                              <Wallet size={12} className="text-gray-700" />
                              <span>Cash at Counter</span>
                            </span>
                            <span className="text-[11px] text-gray-400 font-normal block mt-1">
                              Office Desk Collection
                            </span>
                          </div>
                        ) : isUpi ? (
                          <div>
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F3E8FF] text-[#6B21A8] border border-[#E9D5FF] text-xs font-semibold shadow-2xs">
                              <UpiIcon className="w-3.5 h-3.5" />
                              <span>UPI Payment</span>
                            </span>
                            <span className="text-[11px] text-gray-400 font-normal block mt-1">
                              Razorpay
                            </span>
                          </div>
                        ) : isCard ? (
                          <div>
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EFF6FF] text-[#1E40AF] border border-[#BFDBFE] text-xs font-semibold shadow-2xs">
                              <CreditCard size={12} className="text-blue-700" />
                              <span>Card Payment</span>
                            </span>
                            <span className="text-[11px] text-gray-400 font-normal block mt-1">
                              Razorpay {p.razorpayInstrument || ''}
                            </span>
                          </div>
                        ) : (
                          <div>
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#ECFDF5] text-[#065F46] border border-[#A7F3D0] text-xs font-semibold shadow-2xs">
                              <Wallet size={12} className="text-emerald-700" />
                              <span>Wallet Payment</span>
                            </span>
                            <span className="text-[11px] text-gray-400 font-normal block mt-1">
                              Razorpay
                            </span>
                          </div>
                        )}
                      </td>

                      {/* 6. Date & Time (Date & Time + relative time) */}
                      <td className="py-4.5 px-4 align-middle">
                        <div className="text-xs sm:text-sm font-medium text-gray-800">
                          {formatDisplayDateTime(p.bookedAt)}
                        </div>
                        {p.relativeTime && (
                          <div className="flex items-center gap-1 text-xs text-gray-400 mt-0.5 font-normal">
                            <Clock size={12} className="text-gray-400" />
                            <span>{p.relativeTime}</span>
                          </div>
                        )}
                      </td>

                      {/* 7. Status (Confirmed or Captured Pill) */}
                      <td className="py-4.5 px-4 align-middle">
                        {isConfirmed ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#ECFDF5] border border-[#6EE7B7] text-[#059669] text-xs font-semibold">
                            <CheckCircle2 size={13} className="text-[#10B981]" />
                            <span>Confirmed</span>
                          </span>
                        ) : isCaptured ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FAF5FF] border border-[#D8B4FE] text-[#7E22CE] text-xs font-semibold">
                            <CheckCircle2 size={13} className="text-[#9333EA]" />
                            <span>Captured</span>
                          </span>
                        ) : isRefunded ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FFF1F2] border border-[#FECDD3] text-[#E11D48] text-xs font-semibold">
                            <AlertTriangle size={13} />
                            <span>Refunded</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FFFBEB] border border-[#FDE68A] text-[#D97706] text-xs font-semibold">
                            <Clock size={13} />
                            <span>Pending</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
