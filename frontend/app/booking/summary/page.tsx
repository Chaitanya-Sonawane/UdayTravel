'use client'

import React, { useState, useEffect, useReducer } from 'react'
import Link from 'next/link'
import Script from 'next/script'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Wallet, ShieldCheck, Lock } from 'lucide-react'
import { BookingSummary, BookingSummaryProps } from '@/components/booking/BookingSummary'
import { useBookingStore } from '@/lib/booking-store'
import { subscribeToAuth, fetchCurrentProfile } from '@/lib/auth/client-auth'
import { getApiAuthHeaders } from '@/lib/firebase/client'
import { openCheckout } from '@/lib/razorpay-client'
import { paymentReducer } from '@/lib/payment-machine'
import type { Passenger as ComponentPassenger } from '@/components/booking/PassengerList'

export default function BookingSummaryPage() {
  const router = useRouter()
  const { passengers, journey, boarding, dropping, holdExpiresAt, grp, holdToken } =
    useBookingStore()

  const [paymentState, dispatch] = useReducer(paymentReducer, 'idle')
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [walletAvailablePaise, setWalletAvailablePaise] = useState(0)
  const [useWallet, setUseWallet] = useState(false)
  const [userPhone, setUserPhone] = useState('9890066580')
  const [userEmail, setUserEmail] = useState('care@udaytravel.in')
  const [expired, setExpired] = useState(false)

  // Fetch current user profile & wallet balance
  useEffect(() => {
    async function loadWallet() {
      try {
        const headers = await getApiAuthHeaders()
        const res = await fetch('/api/wallet', { headers })
        if (res.ok) {
          const data = await res.json()
          setWalletAvailablePaise(data.availablePaise || 0)
        }
      } catch (err) {
        console.warn('[BookingSummary] Wallet fetch failed:', err)
      }
    }
    loadWallet()

    const unsub = subscribeToAuth(async (u) => {
      if (u) {
        if (u.phoneNumber) setUserPhone(u.phoneNumber)
        if (u.email) setUserEmail(u.email)
        try {
          const { profile } = await fetchCurrentProfile()
          if (profile?.mobile) setUserPhone(profile.mobile)
          if (profile?.email) setUserEmail(profile.email)
        } catch {}
      }
    })
    return () => unsub()
  }, [])

  // Calculate hold seconds
  const remainingSeconds = holdExpiresAt
    ? Math.max(0, Math.floor((holdExpiresAt - Date.now()) / 1000))
    : 600

  // Format date helper
  const tripDate = journey.date
    ? new Date(journey.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : 'Nov 15'

  // Map passengers to component format (fallback to default if empty)
  const activePassengers: ComponentPassenger[] =
    passengers && passengers.length > 0
      ? passengers.map((p, idx) => ({
          name: p.name || `Passenger ${idx + 1}`,
          gender: (p.gender === 'woman' ? 'FEMALE' : 'MALE') as 'MALE' | 'FEMALE' | 'OTHER',
          age: parseInt(p.age, 10) || 25,
          seatNo: p.seatId || `Seat ${idx + 1}`,
        }))
      : [
          {
            name: 'Chaitanya',
            gender: 'MALE',
            age: 21,
            seatNo: '32',
          },
        ]

  const pricePerSeat = journey.fare || 200
  const totalRupees = pricePerSeat * activePassengers.length
  const totalPaise = totalRupees * 100

  const walletDeductionPaise = useWallet
    ? Math.min(totalPaise, walletAvailablePaise)
    : 0
  const walletDeductionRupees = walletDeductionPaise / 100

  const tripData = {
    seatType: 'Seater Coach',
    departure: {
      time: journey.departure || '07:00 AM',
      date: tripDate,
      place: journey.from || 'Ahilyanagar',
      boardingPoint: boarding || 'Office Bus Stand',
    },
    arrival: {
      time: journey.arrival || '11:00 AM',
      date: tripDate,
      place: journey.to || 'Pune',
      dropPoint: dropping || 'Shivajinagar',
    },
    duration: '3h 30m',
  }

  const handleExpire = () => {
    setExpired(true)
    setStatusMessage('⚠️ Hold session expired! Please re-select your seats.')
  }

  const handleProceed = async () => {
    if (expired) {
      setStatusMessage('⚠️ Booking session expired. Please reselect your seats.')
      return
    }

    const currentGrp = grp || `grp_dev_${Date.now()}`
    const currentHoldToken = holdToken || 'dev_hold_token'

    dispatch({ type: 'CREATE' })
    setStatusMessage(null)

    try {
      const headers = await getApiAuthHeaders()
      const orderRes = await fetch('/api/payments/create-order', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          grp: currentGrp,
          holdToken: currentHoldToken,
          useWallet,
          passengers: activePassengers.map((p) => ({
            seat: p.seatNo,
            name: p.name,
            age: p.age,
            gender: p.gender === 'FEMALE' ? 'female' : 'male',
          })),
          contactMobile: userPhone,
          routeId: journey.routeId || 'AHM_PUN',
          tripId: journey.tripId || 'TRIP-1',
          travelDate: journey.date || new Date().toISOString().slice(0, 10),
          busName: journey.busName || 'Express Coach',
        }),
      })

      const orderData = await orderRes.json()
      if (!orderRes.ok) {
        throw new Error(orderData.error?.message || 'Failed to prepare payment')
      }

      // If fully covered by wallet (payablePaise === 0)
      if (orderData.razorpayPaise === 0 || orderData.orderId === 'INTERNAL_WALLET_ONLY') {
        dispatch({ type: 'VERIFY' })
        const verifyRes = await fetch('/api/payments/verify', {
          method: 'POST',
          headers,
          body: JSON.stringify({ grp: currentGrp }),
        })
        const verifyData = await verifyRes.json()
        if (!verifyRes.ok) {
          throw new Error(verifyData.error?.message || 'Failed to finalize booking')
        }
        dispatch({ type: 'SUCCESS' })
        router.push(`/ticket/${verifyData.ticketNo || verifyData.pnr}`)
        return
      }

      // External Razorpay Checkout
      dispatch({ type: 'CHECKOUT' })
      openCheckout({
        key: orderData.keyId || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || 'rzp_test_U00WmPMLownfgs',
        order_id: orderData.orderId,
        amount: orderData.amount,
        currency: orderData.currency || 'INR',
        name: 'Uday Travels',
        description: `${journey.from || 'Ahilyanagar'} → ${journey.to || 'Pune'} · Seats ${activePassengers.map((p) => p.seatNo).join(', ')}`,
        theme: { color: '#F8B018' },
        modal: {
          ondismiss: () => {
            dispatch({ type: 'DISMISS' })
            setStatusMessage('Payment cancelled. Your seats are still held.')
          },
        },
        onPaymentFailed: (errRes) => {
          dispatch({ type: 'FAILED' })
          const errorMsg =
            errRes.error?.description || 'Payment transaction was declined or failed.'
          setStatusMessage(errorMsg)
        },
        handler: async (response) => {
          dispatch({ type: 'VERIFY' })
          try {
            const verifyHeaders = await getApiAuthHeaders()
            const verifyRes = await fetch('/api/payments/verify', {
              method: 'POST',
              headers: verifyHeaders,
              body: JSON.stringify({
                grp: currentGrp,
                ...response,
              }),
            })
            const verifyResult = await verifyRes.json()
            if (!verifyRes.ok) {
              throw new Error(verifyResult.error?.message || 'Payment verification failed')
            }
            dispatch({ type: 'SUCCESS' })
            router.push(`/ticket/${verifyResult.ticketNo || verifyResult.pnr}`)
          } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Verification failed'
            dispatch({ type: 'FAILED' })
            setStatusMessage(msg)
          }
        },
      })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Payment initialization failed'
      dispatch({ type: 'FAILED' })
      setStatusMessage(msg)
    }
  }

  const isProceeding = ['creating', 'verifying'].includes(paymentState)

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col justify-between py-6 sm:py-10 px-4">
      {process.env.NEXT_PUBLIC_RAZORPAY_MOCK !== 'true' && (
        <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
      )}

      {/* Top Header Navigation matching Uday Travels theme */}
      <header className="w-full max-w-md mx-auto mb-4 flex items-center justify-between">
        <Link
          href="/seats"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#111] hover:text-[#F8B018] transition-colors"
        >
          <ArrowLeft size={15} /> Back
        </Link>
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 bg-[#F8B018] text-[#0B0F19] font-black flex items-center justify-center text-[10px] rounded shadow-xs">
            UT
          </span>
          <span className="font-black text-xs tracking-wider text-[#111]">
            UDAY TRAVELS
          </span>
        </div>
        <span className="text-[11px] font-bold text-amber-900 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-full">
          Summary
        </span>
      </header>

      {/* Status Notice Banner (if triggered) */}
      {statusMessage && (
        <div className="w-full max-w-md mx-auto mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 font-medium text-center shadow-xs">
          {statusMessage}
        </div>
      )}

      {/* Main Booking Summary Card Component */}
      <BookingSummary
        holdSeconds={remainingSeconds}
        pricePerSeat={pricePerSeat}
        trip={tripData}
        passengers={activePassengers}
        contact={{
          phone: userPhone,
          email: userEmail,
        }}
        walletDiscount={walletDeductionRupees}
        isProceeding={isProceeding}
        onExpire={handleExpire}
        onProceed={handleProceed}
      >
        {/* Optional Uday Wallet Store Credit Card */}
        {walletAvailablePaise > 0 && (
          <div className="mt-3 bg-white rounded-xl border border-gray-100 p-3.5 shadow-2xs flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-[#B45309]">
                <Wallet size={16} />
              </div>
              <div>
                <p className="text-xs font-bold text-[#111] leading-tight">
                  Available Credit: ₹{(walletAvailablePaise / 100).toLocaleString('en-IN')}
                </p>
                <p className="text-[11px] text-[#6b7280] mt-0.5">
                  Apply credit to discount this booking
                </p>
              </div>
            </div>
            <label className="flex items-center gap-1.5 cursor-pointer text-xs font-bold text-[#111]">
              <input
                type="checkbox"
                checked={useWallet}
                onChange={(e) => setUseWallet(e.target.checked)}
                className="w-4 h-4 accent-[#F8B018] rounded cursor-pointer"
              />
              Apply
            </label>
          </div>
        )}

        {/* Security & Trust row */}
        <div className="mt-3 flex items-center justify-center gap-4 text-[11px] font-semibold text-gray-400 py-1">
          <span className="flex items-center gap-1 text-emerald-600">
            <ShieldCheck size={13} /> 100% Secure Checkout
          </span>
          <span className="flex items-center gap-1">
            <Lock size={12} /> 256-bit Encryption
          </span>
        </div>
      </BookingSummary>
    </main>
  )
}
