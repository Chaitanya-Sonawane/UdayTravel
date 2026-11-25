'use client'

import React, { useState, useEffect, useRef } from 'react'
import { FareSection } from './FareSection'
import { TripTimeline } from './TripTimeline'
import { PassengerList, Passenger } from './PassengerList'
import { formatCurrency } from '@/lib/formatCurrency'
import { Lock, AlertTriangle } from 'lucide-react'

export type BookingSummaryProps = {
  holdSeconds: number
  pricePerSeat: number
  trip: {
    seatType?: string
    departure: {
      time: string
      date: string
      place: string
      boardingPoint: string
      boardingLandmark?: string
    }
    arrival: {
      time: string
      date: string
      place: string
      dropPoint: string
      dropLandmark?: string
    }
    duration: string
  }
  passengers: Passenger[]
  contact?: { phone?: string; email?: string }
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
  const expiredRef = useRef(holdSeconds <= 0)
  const onExpireRef = useRef(onExpire)

  useEffect(() => {
    onExpireRef.current = onExpire
  }, [onExpire])

  // Reset timer if holdSeconds prop changes
  useEffect(() => {
    setTimeLeft(holdSeconds)
    if (holdSeconds > 0) {
      expiredRef.current = false
    }
  }, [holdSeconds])

  // Countdown timer interval
  useEffect(() => {
    if (isProceeding) return
    if (timeLeft <= 0) return

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [timeLeft, isProceeding])

  // Safely trigger onExpire outside of render cycle when timeLeft hits 0
  useEffect(() => {
    if (isProceeding) return
    if (timeLeft <= 0 && !expiredRef.current) {
      expiredRef.current = true
      const timer = setTimeout(() => {
        onExpireRef.current?.()
      }, 0)
      return () => clearTimeout(timer)
    }
  }, [timeLeft, isProceeding])

  // Computed total
  const total = pricePerSeat * passengers.length
  const payableTotal = walletDiscount ? Math.max(0, total - walletDiscount) : total

  // Time format mm:ss
  const mins = Math.floor(Math.max(0, timeLeft) / 60)
  const secs = Math.max(0, timeLeft) % 60
  const formattedTime = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`

  const isExpired = timeLeft <= 0 && !isProceeding

  return (
    <div className="w-full max-w-[620px] lg:max-w-5xl mx-auto flex flex-col gap-4 font-jakarta">
      {/* Expiry Warning Banner if expiring within 60 seconds */}
      {timeLeft > 0 && timeLeft <= 60 && !isProceeding && (
        <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-300 rounded-xl text-rose-800 text-xs font-semibold animate-pulse shadow-xs">
          <AlertTriangle size={16} className="text-rose-600 flex-shrink-0" />
          <span>
            Hurry! Your seat hold expires in <strong>{formattedTime}</strong>. Please complete payment to avoid seat release.
          </span>
        </div>
      )}

      {/* Expired Notice */}
      {isExpired && !isProceeding && (
        <div className="flex items-center gap-2 p-3.5 bg-amber-50 border border-amber-300 rounded-xl text-amber-950 text-xs font-semibold shadow-xs">
          <AlertTriangle size={16} className="text-amber-600 flex-shrink-0" />
          <span>
            Seat hold session has expired. Seats may no longer be reserved. Please re-pick seats.
          </span>
        </div>
      )}

      {/* Main Responsive Layout for Laptop and Mobile */}
      <div className="lg:grid lg:grid-cols-12 lg:gap-8 lg:items-start space-y-4 lg:space-y-0">
        {/* Left Column: Trip Timeline, Passengers, and Payment Methods */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white rounded-2xl sm:rounded-3xl shadow-xs border border-slate-200/90 p-5 sm:p-6 divide-y divide-slate-100">
            {/* 1. Trip Timeline Section */}
            <TripTimeline passengerCount={passengers.length} trip={trip} />

            {/* 2. Passengers & Seats Section */}
            <PassengerList passengers={passengers} />
          </div>

          {/* Payment Methods Section (Passed as children) */}
          {children}
        </div>

        {/* Right Column: Fare Breakdown & Proceed CTA sticky on desktop */}
        <div className="lg:col-span-5 space-y-4 lg:sticky lg:top-24">
          <div className="bg-white rounded-2xl sm:rounded-3xl shadow-xs border border-slate-200/90 p-5 sm:p-6">
            {/* 3. Fare Breakdown Section */}
            <FareSection
              pricePerSeat={pricePerSeat}
              passengerCount={passengers.length}
              total={total}
              walletDiscount={walletDiscount}
            />
          </div>

          {/* Main CTA Proceed Button matching user screenshot */}
          {onProceed && (
            <div className="space-y-3 pt-1">
              <button
                type="button"
                onClick={onProceed}
                disabled={isExpired || isProceeding}
                className="w-full py-4 px-6 rounded-xl bg-[#F8B018] hover:bg-[#E5A010] active:scale-[0.99] transition-all text-[#0B0F19] font-black text-sm sm:text-base flex items-center justify-center gap-2 cursor-pointer shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed border border-amber-300"
              >
                <Lock size={16} className="text-[#0B0F19] stroke-[2.5]" />
                <span>
                  {proceedButtonText ||
                    (isExpired
                      ? 'Session Expired'
                      : isProceeding
                      ? 'Opening Secure Payment...'
                      : `Proceed to Pay ${formatCurrency(payableTotal)}`)}
                </span>
              </button>
              <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-500 font-medium pt-0.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Razorpay Test Mode Active · Simulated / Sandbox Cards</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default BookingSummary
