'use client'

import React, { useState } from 'react'
import {
  Search,
  Ticket,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  ShieldAlert,
  Loader2,
  Calendar,
  Clock,
  Bus,
  MapPin,
  Users,
  DollarSign,
  X,
  RefreshCw,
  Printer,
} from 'lucide-react'
import { TicketDoc } from '@/lib/schemas/ticket.schema'

export function TicketLookupAndOverrides() {
  const [searchQuery, setSearchQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<TicketDoc[]>([])
  const [hasSearched, setHasSearched] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  // Override cancellation modal state
  const [selectedTicketForCancel, setSelectedTicketForCancel] = useState<TicketDoc | null>(null)
  const [cancelReason, setCancelReason] = useState('Customer counter request / medical emergency')
  const [cancelling, setCancelling] = useState(false)
  const [cancelSuccessResult, setCancelSuccessResult] = useState<any>(null)

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!searchQuery.trim()) return

    setSearching(true)
    setErrorMsg('')
    setHasSearched(true)

    try {
      const res = await fetch(`/api/admin/tickets?q=${encodeURIComponent(searchQuery.trim())}`)
      const data = await res.json()
      if (res.ok && data.success) {
        setSearchResults(data.tickets || [])
      } else {
        throw new Error(data.error?.message || 'Failed to search tickets')
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error occurred while searching.')
    } finally {
      setSearching(false)
    }
  }

  const handleExecuteAdminOverrideCancel = async () => {
    if (!selectedTicketForCancel || cancelling) return

    setCancelling(true)
    setErrorMsg('')
    try {
      const res = await fetch('/api/admin/override-cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticketNo: selectedTicketForCancel.ticketNo,
          reason: cancelReason,
        }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setCancelSuccessResult(data)
        // Update local ticket list
        setSearchResults((prev) =>
          prev.map((t) =>
            t.ticketNo === selectedTicketForCancel.ticketNo ? { ...t, status: 'CANCELLED' } : t
          )
        )
      } else {
        throw new Error(data.error?.message || 'Failed to override cancellation')
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error executing admin cancellation.')
    } finally {
      setCancelling(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <section className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
        <h2 className="text-lg font-black text-gray-900 tracking-tight">
          Ticket Lookup
        </h2>

        {/* Search Input Bar */}
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Ticket No, Mobile, or Name..."
              className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-gray-300 bg-gray-50 text-xs font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#F8B018]"
            />
          </div>
          <button
            type="submit"
            disabled={searching || !searchQuery.trim()}
            className="px-4 py-2.5 bg-[#F8B018] hover:bg-[#e09b0b] text-gray-950 font-bold text-xs rounded-xl transition-all shadow-xs flex items-center gap-1.5 disabled:opacity-50"
          >
            {searching ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
            <span>Search</span>
          </button>
        </form>
      </section>

      {errorMsg && (
        <div className="p-4 rounded-2xl border border-red-200 bg-red-50 text-red-900 text-xs flex items-center gap-2">
          <AlertTriangle size={16} className="text-red-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Results Section */}
      {hasSearched && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-gray-500 px-1">
            <span>
              Found <strong>{searchResults.length}</strong> ticket{searchResults.length === 1 ? '' : 's'} matching &ldquo;{searchQuery}&rdquo;
            </span>
          </div>

          {searchResults.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-3xl p-12 text-center text-xs text-gray-500 shadow-xs">
              <Ticket size={36} className="mx-auto text-gray-300 mb-2" />
              <strong className="block text-gray-700 text-sm">No Tickets Found</strong>
              <span>Check the ticket number or mobile number and try again.</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {searchResults.map((t) => {
                const isCancelled = t.status === 'CANCELLED'
                const totalPaidFormatted = t.fare?.totalPaise
                  ? `₹${(t.fare.totalPaise / 100).toFixed(2)}`
                  : '₹200.00'

                return (
                  <article
                    key={t.ticketNo}
                    className={`bg-white border rounded-3xl p-5 md:p-6 shadow-xs transition-all ${
                      isCancelled ? 'border-gray-200 bg-gray-50/60 opacity-80' : 'border-gray-200 hover:border-amber-400'
                    }`}
                  >
                    {/* Top Row */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
                      <div className="flex items-center gap-3">
                        <span className="w-10 h-10 rounded-xl bg-amber-100 text-amber-900 font-mono font-black flex items-center justify-center text-xs">
                          UT
                        </span>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-base font-black text-gray-900">
                              {t.ticketNo}
                            </span>
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                isCancelled
                                  ? 'bg-red-100 text-red-800 border border-red-200'
                                  : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              }`}
                            >
                              {t.status}
                            </span>
                          </div>
                          <span className="text-[11px] text-gray-500 font-medium">
                            Booked on {new Date(t.bookedAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <a
                          href={`/ticket/${t.ticketNo}`}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3.5 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold text-xs flex items-center gap-1.5 transition-colors"
                        >
                          <span>View Public Ticket</span>
                          <ExternalLink size={12} />
                        </a>

                        {!isCancelled && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedTicketForCancel(t)
                              setCancelSuccessResult(null)
                            }}
                            className="px-3.5 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-800 border border-red-200 font-bold text-xs flex items-center gap-1.5 transition-colors"
                          >
                            <ShieldAlert size={14} className="text-red-600" />
                            <span>Admin Override Cancel</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Middle Details Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 py-4 text-xs">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-0.5">
                          Route &amp; Travel Date
                        </span>
                        <strong className="text-gray-900 text-sm block">
                          {t.route?.from} &rarr; {t.route?.to}
                        </strong>
                        <span className="text-gray-600 font-semibold">{t.travelDate}</span>
                      </div>

                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-0.5">
                          Bus &amp; Boarding Point
                        </span>
                        <strong className="text-gray-950 text-base block font-mono font-black tracking-tight">
                          {t.busNumber}
                        </strong>
                        <span className="text-xs text-gray-600 font-semibold block">
                          {t.busName || 'Uday Bus'}
                        </span>
                        <span className="text-amber-800 font-medium block truncate">
                          {t.pickup?.name} ({t.pickup?.pickupTime || '06:00'})
                        </span>
                      </div>

                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-0.5">
                          Contact &amp; Fare
                        </span>
                        <strong className="text-gray-900 block font-mono">
                          {t.contactMobile}
                        </strong>
                        <span className="text-gray-600 font-medium">
                          Paid: <b>{totalPaidFormatted}</b> ({t.payment?.method || 'Gateway'})
                        </span>
                      </div>

                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-0.5">
                          Reserved Seats ({t.passengers?.length || 0})
                        </span>
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {t.passengers?.map((p) => (
                            <span
                              key={p.seat}
                              className="px-2 py-0.5 rounded-lg bg-amber-100 text-amber-950 font-mono font-bold text-xs border border-amber-200"
                            >
                              {p.seat} ({p.name})
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Emergency Cancellation Modal */}
      {selectedTicketForCancel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-gray-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2.5 text-red-700">
                <ShieldAlert size={22} />
                <h3 className="text-base font-black text-gray-900">
                  Administrative Cancellation Override
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTicketForCancel(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100"
              >
                <X size={18} />
              </button>
            </div>

            {cancelSuccessResult ? (
              <div className="py-6 text-center space-y-4">
                <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 size={28} />
                </div>
                <div>
                  <strong className="text-base font-bold text-gray-900 block">
                    Ticket Successfully Cancelled
                  </strong>
                  <p className="text-xs text-gray-600 mt-1">
                    {cancelSuccessResult.message}
                  </p>
                </div>
                <div className="p-3.5 bg-gray-50 rounded-2xl text-xs text-left space-y-1.5 border border-gray-100 font-mono">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Ticket No:</span>
                    <strong>{cancelSuccessResult.ticketNo}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Refund Source (25%):</span>
                    <strong className="text-emerald-700">{cancelSuccessResult.refund?.sourceFormatted || '₹0.00'}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Wallet Credit (75%):</span>
                    <strong className="text-emerald-700">{cancelSuccessResult.refund?.walletFormatted || '₹0.00'}</strong>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedTicketForCancel(null)}
                  className="w-full py-2.5 bg-gray-900 text-white font-bold text-xs rounded-xl hover:bg-black"
                >
                  Close Window
                </button>
              </div>
            ) : (
              <div className="space-y-4 text-xs">
                <div className="p-3.5 bg-amber-50 rounded-2xl border border-amber-200 text-amber-950 space-y-1">
                  <strong className="font-bold block">Authority Disclaimer:</strong>
                  <p className="leading-relaxed">
                    This action is restricted to authorized administrative personnel. It bypasses regular customer cutoff windows and instantly releases seats back to the public booking chart.
                  </p>
                </div>

                <div className="p-3.5 bg-gray-50 rounded-2xl border border-gray-100 space-y-1 font-mono">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Ticket PNR:</span>
                    <strong className="text-gray-900">{selectedTicketForCancel.ticketNo}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Passenger Count:</span>
                    <strong className="text-gray-900">{selectedTicketForCancel.passengers?.length} Seats</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Journey:</span>
                    <strong className="text-gray-900">{selectedTicketForCancel.travelDate} ({selectedTicketForCancel.route?.from} &rarr; {selectedTicketForCancel.route?.to})</strong>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-600 mb-1">
                    Administrative Reason / Justification
                  </label>
                  <textarea
                    rows={2}
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-gray-300 bg-gray-50 text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-red-500"
                    placeholder="Enter reason for audit logs..."
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setSelectedTicketForCancel(null)}
                    className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-700 font-bold hover:bg-gray-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={cancelling}
                    onClick={handleExecuteAdminOverrideCancel}
                    className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold flex items-center justify-center gap-1.5 shadow-xs disabled:opacity-50"
                  >
                    {cancelling ? <Loader2 size={14} className="animate-spin" /> : <ShieldAlert size={14} />}
                    <span>Confirm Override Cancel</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
