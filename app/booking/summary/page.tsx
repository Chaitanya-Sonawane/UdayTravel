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
import { ThemedErrorBanner } from '@/components/ui/ThemedErrorBanner'

export default function BookingSummaryPage() {
  const router = useRouter()
  const {
    passengers,
    journey,
    boarding,
    dropping,
    pickupSnapshot,
    dropSnapshot,
    holdExpiresAt,
    grp,
    holdToken,
  } = useBookingStore()

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
          const avail = Number(data.availablePaise) || 0
          setWalletAvailablePaise(avail)
          if (avail > 0) {
            setUseWallet(true)
          }
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

  const walletBalanceRupees = walletAvailablePaise / 100
  const walletDeductionPaise = useWallet
    ? Math.min(totalPaise, walletAvailablePaise)
    : 0
  const walletDeductionRupees = walletDeductionPaise / 100
  const remainingPayableRupees = Math.max(0, totalRupees - walletDeductionRupees)
  const isFullWalletCoverage = useWallet && walletAvailablePaise >= totalPaise

  const isProceeding = ['creating', 'verifying'].includes(paymentState)

  const ctaButtonText = expired
    ? 'Session Expired'
    : isProceeding
    ? isFullWalletCoverage
      ? 'Confirming Booking from Wallet...'
      : 'Opening Secure Payment...'
    : isFullWalletCoverage
    ? `Pay ₹${totalRupees} from Wallet`
    : useWallet && walletDeductionRupees > 0
    ? `Pay ₹${remainingPayableRupees} via Razorpay (₹${walletDeductionRupees} from Wallet)`
    : `Pay ₹${totalRupees} via Razorpay`

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
          pickup: pickupSnapshot || {
            pointId: '',
            name: boarding || 'Office',
            pickupTime: journey.departure || '06:00',
          },
          drop: dropSnapshot || {
            pointId: '',
            name: dropping || 'Wakadewadi',
          },
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
        <div className="w-full max-w-md mx-auto mb-4">
          <ThemedErrorBanner
            title="Booking Notice"
            message={statusMessage}
            onDismiss={() => setStatusMessage(null)}
            variant={paymentState === 'failed' ? 'error' : 'warning'}
          />
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
        proceedButtonText={ctaButtonText}
        isProceeding={isProceeding}
        onExpire={handleExpire}
        onProceed={handleProceed}
      >
        {/* Payment Methods Selection */}
        <section className="mt-3 bg-white rounded-xl border border-gray-100 p-3.5 shadow-2xs space-y-3">
          <div className="flex items-center justify-between border-b border-gray-100 pb-2">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#111] flex items-center gap-1.5">
              Payment Method
            </h4>
            {walletAvailablePaise > 0 && (
              <span className="text-[10px] font-bold text-amber-900 bg-amber-100/70 border border-amber-300 px-2 py-0.5 rounded-full">
                Wallet Balance: ₹{walletBalanceRupees}
              </span>
            )}
          </div>

          {/* Option 1: Uday Travels Wallet */}
          {walletAvailablePaise > 0 ? (
            <div
              onClick={() => setUseWallet(true)}
              className={`p-3 rounded-xl border-2 transition-all cursor-pointer ${
                useWallet
                  ? 'border-[#F8B018] bg-gradient-to-r from-amber-50/70 via-yellow-50/30 to-white shadow-xs'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <div className="flex items-start justify-between gap-2.5">
                <div className="flex items-start gap-2.5">
                  <input
                    type="radio"
                    id="payMethodWallet"
                    name="payMethod"
                    checked={useWallet}
                    onChange={() => setUseWallet(true)}
                    className="mt-0.5 w-4 h-4 accent-[#F8B018] cursor-pointer flex-shrink-0"
                  />
                  <div>
                    <label htmlFor="payMethodWallet" className="text-xs font-bold text-gray-900 block cursor-pointer">
                      {isFullWalletCoverage
                        ? 'Option 1 — Pay from Uday Travels Wallet'
                        : 'Option 1 — Wallet + Razorpay Split'}
                    </label>

                    <div className="mt-1 space-y-0.5 text-[11px] text-gray-600">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500">Wallet Balance:</span>
                        <strong className="font-mono text-gray-900 font-bold">₹{walletBalanceRupees}</strong>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500">Amount to Pay:</span>
                        <strong className="font-mono text-emerald-700 font-bold">₹{walletDeductionRupees} from Wallet</strong>
                      </div>
                      {isFullWalletCoverage ? (
                        <p className="text-[11px] text-emerald-700 font-bold mt-1">
                          ✓ Entire ₹{totalRupees} fare paid from wallet. No Razorpay payment created.
                        </p>
                      ) : (
                        <div className="flex items-center gap-2 text-amber-900 font-semibold pt-0.5">
                          <span className="text-gray-500">Remaining to Pay:</span>
                          <strong className="font-mono text-amber-900 font-bold">₹{remainingPayableRupees} via Razorpay</strong>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <span className="text-[10px] font-mono font-bold text-[#92400E] bg-[#FEF3C7] border border-amber-300 px-2 py-0.5 rounded-full whitespace-nowrap">
                  {isFullWalletCoverage ? '100% Wallet' : `-₹${walletDeductionRupees}`}
                </span>
              </div>
            </div>
          ) : (
            <div className="p-3 rounded-xl border border-dashed border-gray-200 bg-gray-50 flex items-center justify-between text-xs text-gray-400">
              <div className="flex items-center gap-2">
                <Wallet size={15} />
                <span>Uday Travels Wallet Balance: <strong>₹0</strong></span>
              </div>
              <span className="text-[10px] uppercase font-bold text-gray-400">Unavailable</span>
            </div>
          )}

          {/* Option 2: Pay via Razorpay Online */}
          <div
            onClick={() => setUseWallet(false)}
            className={`p-3 rounded-xl border-2 transition-all cursor-pointer ${
              !useWallet
                ? 'border-[#F8B018] bg-gradient-to-r from-amber-50/70 via-yellow-50/30 to-white shadow-xs'
                : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            <div className="flex items-start justify-between gap-2.5">
              <div className="flex items-start gap-2.5">
                <input
                  type="radio"
                  id="payMethodRazorpay"
                  name="payMethod"
                  checked={!useWallet}
                  onChange={() => setUseWallet(false)}
                  className="mt-0.5 w-4 h-4 accent-[#F8B018] cursor-pointer flex-shrink-0"
                />
                <div>
                  <label htmlFor="payMethodRazorpay" className="text-xs font-bold text-gray-900 block cursor-pointer">
                    Pay Full via Razorpay
                  </label>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    UPI (Google Pay, PhonePe, Paytm), Debit / Credit Cards, NetBanking
                  </p>
                </div>
              </div>

              <span className="text-xs font-mono font-bold text-gray-900 whitespace-nowrap">
                ₹{totalRupees}
              </span>
            </div>
          </div>
        </section>

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
