'use client'

import React, { useState, useEffect, useRef } from 'react'
import { FareSection } from './FareSection'
import { TripTimeline } from './TripTimeline'
import { PassengerList, Passenger } from './PassengerList'
import { ContactSection } from './ContactSection'
import { formatCurrency } from '@/lib/formatCurrency'

export type BookingSummaryProps = {
  holdSeconds: number
  pricePerSeat: number
  trip: {
    seatType?: string
    departure: { time: string; date: string; place: string; boardingPoint: string }
    arrival: { time: string; date: string; place: string; dropPoint: string }
    duration: string
  }
  passengers: Passenger[]
  contact: { phone: string; email?: string }
  walletDiscount?: number
  proceedButtonText?: string
  isProceeding?: boolean
  children?: React.ReactNode
  onExpire?: () => void
  onProceed?: () => void
}

export function BookingSummary({
  holdSeconds,
  pricePerSeat,
  trip,
  passengers,
  contact,
  walletDiscount,
  proceedButtonText,
  isProceeding,
  children,
  onExpire,
  onProceed,
}: BookingSummaryProps) {
  const [timeLeft, setTimeLeft] = useState(holdSeconds)
  const expiredRef = useRef(false)

  // Reset timer if holdSeconds prop changes
  useEffect(() => {
    setTimeLeft(holdSeconds)
    expiredRef.current = false
  }, [holdSeconds])

  // Countdown timer effect
  useEffect(() => {
    if (timeLeft <= 0) {
      if (!expiredRef.current) {
        expiredRef.current = true
        onExpire?.()
      }
      return
    }

    const interval = setInterval(() => {
      setTimeLeft((prev) => Math.max(0, prev - 1))
    }, 1000)

    return () => clearInterval(interval)
  }, [timeLeft, onExpire])

  // Computed total
  const total = pricePerSeat * passengers.length
  const payableTotal = walletDiscount ? Math.max(0, total - walletDiscount) : total

  // Time format mm:ss
  const mins = Math.floor(Math.max(0, timeLeft) / 60)
  const secs = Math.max(0, timeLeft) % 60
  const formattedTime = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`

  const isExpired = timeLeft <= 0

  return (
    <div className="w-full max-w-md mx-auto flex flex-col">
      {/* 1. Hold Timer (above card, right-aligned) with Uday Yellow theme */}
      <div className="flex justify-end mb-2 px-1">
        <span
          className="font-bold text-[#F8B018] underline decoration-[#F8B018] decoration-2 underline-offset-4 text-sm tracking-wider tabular-nums"
          role="timer"
          aria-live="polite"
          aria-label={`Time remaining to complete booking: ${formattedTime}`}
        >
          {formattedTime}
        </span>
      </div>

      {/* Main Booking Summary Card with signature Yellow top border accent */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 border-t-4 border-t-[#F8B018] overflow-hidden divide-y divide-gray-100">
        {/* 2. Fare Section */}
        <FareSection
          pricePerSeat={pricePerSeat}
          passengerCount={passengers.length}
          total={total}
          walletDiscount={walletDiscount}
        />

        {/* 3. Trip Section */}
        <TripTimeline passengerCount={passengers.length} trip={trip} />

        {/* 4. Passengers Section */}
        <PassengerList passengers={passengers} />

        {/* 5. Contact Section */}
        <ContactSection contact={contact} />
      </div>

      {/* Optional Children (e.g. Wallet Selector or Payment Methods) */}
      {children}

      {/* 6. Sticky Bottom CTA (outside card) with brand Yellow theme */}
      <div className="sticky bottom-0 left-0 right-0 w-full pt-3 pb-4 bg-gray-50/95 backdrop-blur-xs mt-4 z-10">
        <button
          type="button"
          onClick={onProceed}
          disabled={isExpired || isProceeding}
          className="w-full bg-[#F8B018] hover:bg-[#e68d00] text-[#0B0F19] font-black text-sm sm:text-base py-3.5 px-4 rounded-xl transition-all shadow-md shadow-[#F8B018]/20 active:scale-[0.99] disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed disabled:shadow-none disabled:active:scale-100"
        >
          {proceedButtonText ||
            (isExpired
              ? 'Session Expired'
              : isProceeding
              ? 'Opening Secure Payment...'
              : `Proceed to Pay ${formatCurrency(payableTotal)}`)}
        </button>
      </div>
    </div>
  )
}

export default BookingSummary
