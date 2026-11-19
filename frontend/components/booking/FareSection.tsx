import React from 'react'
import { formatCurrency } from '@/lib/formatCurrency'

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
    <section className="p-4">
      {/* Title & Seat Subtitle with subtle warm amber badge */}
      <div className="flex items-baseline justify-between mb-3">
        <h3 className="font-semibold text-base text-[#111]">Fare</h3>
        <span className="text-xs font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200/60">{seatSubtitle}</span>
      </div>

      {/* Ticket Fare Breakdown */}
      <div className="flex items-center justify-between text-sm mb-3">
        <span className="text-[#6b7280]">
          Ticket fare ({passengerCount} × {formattedPricePerSeat})
        </span>
        <span className="font-bold text-[#111]">{formattedTicketTotal}</span>
      </div>

      {walletDiscount !== undefined && walletDiscount > 0 && (
        <div className="flex items-center justify-between text-sm mb-3 text-emerald-600 font-medium">
          <span>Wallet Store Credit</span>
          <span>-{formatCurrency(walletDiscount)}</span>
        </div>
      )}

      {/* Divider */}
      <div className="border-t border-gray-100 my-3" />

      {/* Total Row */}
      <div className="flex items-center justify-between">
        <span className="font-semibold text-base sm:text-lg text-[#111]">Total Payable</span>
        <span className="font-bold text-base sm:text-lg text-[#111]">{formattedPayableTotal}</span>
      </div>
    </section>
  )
}
