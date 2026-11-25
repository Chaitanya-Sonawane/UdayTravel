'use client'

import React from 'react'
import { formatCurrency } from '@/lib/formatCurrency'
import { Sparkles } from 'lucide-react'

export type FareSectionProps = {
  pricePerSeat: number
  passengerCount: number
  total: number
  walletDiscount?: number
}

export function FareSection({ pricePerSeat, passengerCount, total, walletDiscount }: FareSectionProps) {
  const seatSubtitle = passengerCount === 1 ? '1 Seat' : `${passengerCount} Seats`
  const formattedTicketTotal = formatCurrency(pricePerSeat * passengerCount)
  const payableTotal = walletDiscount ? Math.max(0, total - walletDiscount) : total
  const formattedPayableTotal = formatCurrency(payableTotal)

  return (
    <section className="pt-4 sm:pt-5 font-jakarta">
      {/* Header */}
      <div className="flex items-center justify-between mb-3.5">
        <h3 className="font-bold text-xs tracking-wider uppercase text-slate-400">
          FARE BREAKDOWN
        </h3>
        <span className="text-xs font-semibold text-slate-500">
          {seatSubtitle}
        </span>
      </div>

      {/* Breakdown Rows */}
      <div className="space-y-2.5 text-xs sm:text-sm">
        {/* Ticket Base Fare */}
        <div className="flex items-center justify-between text-slate-700">
          <span className="font-medium">Base Fare ({passengerCount} × ₹{pricePerSeat})</span>
          <span className="font-bold font-mono text-slate-900">{formattedTicketTotal}</span>
        </div>

        {/* Taxes and Convenience Fee: FREE */}
        <div className="flex items-center justify-between text-slate-700">
          <span className="font-medium">Taxes &amp; Platform Fee (0% Fee)</span>
          <span className="font-bold text-emerald-600">FREE</span>
        </div>

        {/* Wallet Store Credit Discount if applicable */}
        {walletDiscount !== undefined && walletDiscount > 0 && (
          <div className="flex items-center justify-between text-emerald-700 font-semibold bg-emerald-50/70 p-2 rounded-xl border border-emerald-200">
            <span className="flex items-center gap-1.5">
              <Sparkles size={13} className="text-emerald-600" />
              <span>Wallet Store Credit Applied</span>
            </span>
            <span className="font-mono font-bold">-{formatCurrency(walletDiscount)}</span>
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="border-t border-slate-100 my-3.5" />

      {/* Total Payable Row */}
      <div className="flex items-center justify-between pt-0.5">
        <div>
          <span className="text-base sm:text-lg font-bold text-slate-900 block leading-tight">
            Total Payable
          </span>
          <span className="text-[11px] sm:text-xs text-slate-400 font-normal block mt-0.5">
            Inclusive of all taxes &amp; passenger insurance
          </span>
        </div>
        <span className="font-mono font-black text-xl sm:text-2xl text-slate-900">
          {formattedPayableTotal}
        </span>
      </div>
    </section>
  )
}

export default FareSection
