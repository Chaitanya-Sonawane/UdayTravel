'use client'

import React from 'react'
import { formatCurrency } from '@/lib/formatCurrency'
import { Receipt, Sparkles } from 'lucide-react'

export type FareSectionProps = {
  pricePerSeat: number
  passengerCount: number
  total: number
  walletDiscount?: number
}

export function FareSection({ pricePerSeat, passengerCount, total, walletDiscount }: FareSectionProps) {
  const seatSubtitle = passengerCount === 1 ? '1 Seat' : `${passengerCount} Seats`
  const formattedPricePerSeat = formatCurrency(pricePerSeat)
  const formattedTicketTotal = formatCurrency(pricePerSeat * passengerCount)
  const payableTotal = walletDiscount ? Math.max(0, total - walletDiscount) : total
  const formattedPayableTotal = formatCurrency(payableTotal)

  return (
    <section className="p-4 sm:p-5">
      {/* Header with Title and Seat Count badge */}
      <div className="flex items-center justify-between mb-3.5">
        <h3 className="font-extrabold text-sm sm:text-base text-gray-950 flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-amber-500/10 text-amber-700 flex items-center justify-center">
            <Receipt size={14} />
          </div>
          <span>Fare Breakdown</span>
        </h3>
        <span className="text-xs font-bold text-amber-950 bg-amber-100/80 px-2.5 py-0.5 rounded-full border border-amber-300">
          {seatSubtitle}
        </span>
      </div>

      {/* Breakdown Rows */}
      <div className="space-y-2 text-xs sm:text-sm">
        {/* Ticket Base Fare */}
        <div className="flex items-center justify-between text-gray-600">
          <span>Ticket fare ({passengerCount} × {formattedPricePerSeat})</span>
          <span className="font-bold font-mono text-gray-900">{formattedTicketTotal}</span>
        </div>

        {/* Taxes and Convenience Fee: FREE */}
        <div className="flex items-center justify-between text-gray-600">
          <span className="flex items-center gap-1.5">
            <span>Taxes &amp; Platform Fee</span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
              0% Fee
            </span>
          </span>
          <span className="font-bold text-emerald-700">FREE</span>
        </div>

        {/* Wallet Store Credit Discount */}
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
      <div className="border-t border-gray-200/80 my-3.5" />

      {/* Total Payable Row */}
      <div className="flex items-center justify-between bg-amber-50/50 p-2.5 rounded-xl border border-amber-200/60">
        <div>
          <span className="text-xs sm:text-sm font-extrabold text-gray-950 block">
            Total Payable
          </span>
          <span className="text-[10px] text-gray-500 font-medium block">
            Inclusive of all taxes &amp; passenger insurance
          </span>
        </div>
        <span className="font-mono font-black text-lg sm:text-xl text-gray-950">
          {formattedPayableTotal}
        </span>
      </div>
    </section>
  )
}
export default FareSection
