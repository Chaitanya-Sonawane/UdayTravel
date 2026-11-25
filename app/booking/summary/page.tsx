'use client'

import React, { useState, useEffect, useReducer, useCallback, useMemo } from 'react'
import Link from 'next/link'
import Script from 'next/script'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Wallet,
  ShieldCheck,
  Lock,
  Menu,
  Clock,
  CheckCircle2,
  Phone,
  Sparkles,
  CreditCard,
  HelpCircle,
  UserRound,
} from 'lucide-react'
import { BookingSummary } from '@/components/booking/BookingSummary'
import { formatDisplayTime, cleanPointName } from '@/components/booking/TripTimeline'
import { useBookingStore } from '@/lib/booking-store'
import { subscribeToAuth, fetchCurrentProfile, signOutUser } from '@/lib/auth/client-auth'
import { User } from 'firebase/auth'
import { getApiAuthHeaders } from '@/lib/firebase/client'
import { openCheckout } from '@/lib/razorpay-client'
import { paymentReducer } from '@/lib/payment-machine'
import type { Passenger as ComponentPassenger } from '@/components/booking/PassengerList'
import { ThemedErrorBanner } from '@/components/ui/ThemedErrorBanner'
import NavDrawer from '@/components/navigation/NavDrawer'
import { todayIST } from '@/lib/time/ist'

function computeTripDuration(dep?: string, arr?: string, fallback = '2h 45m'): string {
  if (!dep || !arr) return fallback
  try {
    const toMinutes = (s: string) => {
      const clean = s.replace(/[^0-9:]/g, '')
      const [h, m] = clean.split(':').map(Number)
      let hours = h || 0
      if (s.toLowerCase().includes('pm') && hours < 12) hours += 12
      if (s.toLowerCase().includes('am') && hours === 12) hours = 0
      return hours * 60 + (m || 0)
    }
    const m1 = toMinutes(dep)
    const m2 = toMinutes(arr)
    const diff = m2 >= m1 ? m2 - m1 : m2 + 24 * 60 - m1
    if (diff <= 0 || isNaN(diff)) return fallback
    const hours = Math.floor(diff / 60)
    const mins = diff % 60
    return `${hours}h ${mins ? `${mins}m` : ''}`.trim()
  } catch {
    return fallback
  }
}

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
  const isProceeding = ['creating_order', 'verifying', 'checkout_open', 'success'].includes(paymentState)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [walletAvailablePaise, setWalletAvailablePaise] = useState(0)
  const [useWallet, setUseWallet] = useState(false)
  const [userPhone, setUserPhone] = useState('9890066580')
  const [userEmail, setUserEmail] = useState('care@udaytravel.in')
  const [expired, setExpired] = useState(false)

  // Navigation Drawer state
  const [sheet, setSheet] = useState(false)
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [userProfile, setUserProfile] = useState<{ name?: string } | null>(null)

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
      } catch {
        // Safe catch for wallet fetch
      }
    }
    loadWallet()

    const unsub = subscribeToAuth(async (u) => {
      setCurrentUser(u)
      if (u) {
        if (u.phoneNumber) setUserPhone(u.phoneNumber)
        if (u.email) setUserEmail(u.email)
        try {
          const { profile } = await fetchCurrentProfile()
          if (profile) {
            setUserProfile(profile)
            if (profile.mobile) setUserPhone(profile.mobile)
            if (profile.email) setUserEmail(profile.email)
          }
        } catch {}
      }
    })
    return () => unsub()
  }, [])

  const handleLogout = async () => {
    try {
      await signOutUser()
      setCurrentUser(null)
      setUserProfile(null)
      setSheet(false)
    } catch {
      // Safe catch for logout
    }
  }

  // Calculate initial hold seconds
  const initialSeconds = useMemo(() => {
    return holdExpiresAt
      ? Math.max(0, Math.floor((holdExpiresAt - Date.now()) / 1000))
      : 600
  }, [holdExpiresAt])

  const [secondsLeft, setSecondsLeft] = useState(initialSeconds)

  useEffect(() => {
    // Never mark expired if payment is underway or confirmed
    if (isProceeding || paymentState === 'verifying' || paymentState === 'success' || paymentState === 'checkout_open') {
      return
    }
    const calc = holdExpiresAt
      ? Math.max(0, Math.floor((holdExpiresAt - Date.now()) / 1000))
      : 600
    setSecondsLeft(calc)
    if (calc <= 0) {
      setExpired(true)
    }
  }, [holdExpiresAt, isProceeding, paymentState])

  // Live countdown timer in BookingSummaryPage
  useEffect(() => {
    // Freeze countdown if payment is in progress or completed
    if (isProceeding || paymentState === 'verifying' || paymentState === 'success' || paymentState === 'checkout_open') {
      return
    }
    if (secondsLeft <= 0) return

    const interval = setInterval(() => {
      setSecondsLeft((prev) => Math.max(0, prev - 1))
    }, 1000)

    return () => clearInterval(interval)
  }, [secondsLeft, isProceeding, paymentState])

  // Auto-detect if booking is already confirmed for this group (e.g. user completed payment and refreshed or returned)
  useEffect(() => {
    const currentGrp = grp
    if (!currentGrp) return
    let active = true
    async function checkConfirmed() {
      if (!currentGrp) return
      try {
        const headers = await getApiAuthHeaders()
        const res = await fetch(`/api/bookings?grp=${encodeURIComponent(currentGrp)}`, { headers })
        if (res.ok) {
          const data = await res.json()
          const matched = (data.tickets || []).find((t: any) => t.grp === currentGrp && t.status === 'CONFIRMED')
          if (matched && matched.ticketNo && active) {
            window.location.href = `/ticket/${matched.ticketNo}`
          }
        }
      } catch {}
    }
    checkConfirmed()
    return () => { active = false }
  }, [grp])

  // Format date helper
  const tripDate = journey.date
    ? new Date(journey.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : todayIST()

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
    : `Proceed to Pay ₹${totalRupees}`

  const isFromPune = (journey.from || '').toLowerCase().includes('pune')
  const isToPune = (journey.to || '').toLowerCase().includes('pune')

  const tripData = {
    seatType: 'Deluxe Air-Conditioned Coach',
    departure: {
      time: formatDisplayTime(journey.departure, '07:00 AM'),
      date: tripDate,
      place: journey.from || (isToPune ? 'Ahilyanagar' : 'Pune'),
      boardingPoint:
        cleanPointName(pickupSnapshot?.name || boarding) ||
        (isFromPune ? 'Sangamwadi' : 'Office Bus Stand'),
    },
    arrival: {
      time: formatDisplayTime(journey.arrival, '11:00 AM'),
      date: tripDate,
      place: journey.to || (isFromPune ? 'Ahilyanagar' : 'Pune'),
      dropPoint:
        cleanPointName(dropSnapshot?.name || dropping) ||
        (isToPune ? 'Shivajinagar' : 'Ekvira Chowk'),
    },
    duration: journey.duration || computeTripDuration(journey.departure, journey.arrival, '2h 45m'),
  }

  const handleExpire = useCallback(() => {
    // Never expire if payment is in progress or succeeded!
    if (isProceeding || paymentState !== 'idle') return
    setExpired(true)
    setStatusMessage('⚠️ Hold session expired! Please re-select your seats.')
  }, [isProceeding, paymentState])

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
        const destTicket = verifyData.ticketNo || verifyData.pnr
        window.location.href = `/ticket/${destTicket}`
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
        prefill: {
          name: activePassengers[0]?.name || 'Passenger',
          contact: (userPhone || '9890066580').replace(/\D/g, '').slice(-10),
          email: userEmail || 'care@udaytravel.in',
        },
        theme: { color: '#F8B018' },
        modal: {
          ondismiss: () => {
            dispatch({ type: 'DISMISS' })
            setStatusMessage('Payment cancelled. Your seats are still held.')
            // Release temporary wallet hold so balance is immediately available
            getApiAuthHeaders().then((headers) => {
              fetch('/api/wallet/release-hold', {
                method: 'POST',
                headers,
                body: JSON.stringify({ grp: currentGrp }),
              }).catch(() => {})
            })
          },
        },
        onPaymentFailed: (errRes) => {
          dispatch({ type: 'FAILED' })
          const errorMsg =
            errRes.error?.description || 'Payment transaction was declined or failed.'
          setStatusMessage(errorMsg)
          getApiAuthHeaders().then((headers) => {
            fetch('/api/wallet/release-hold', {
              method: 'POST',
              headers,
              body: JSON.stringify({ grp: currentGrp }),
            }).catch(() => {})
          })
        },
        handler: async (response) => {
          dispatch({ type: 'VERIFY' })
          setStatusMessage(null)
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
            const destTicket = verifyResult.ticketNo || verifyResult.pnr
            window.location.href = `/ticket/${destTicket}`
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

  const mins = Math.floor(secondsLeft / 60)
  const secs = secondsLeft % 60
  const formattedHoldTime = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`

  return (
    <main className="account-page seats-flow min-h-screen bg-[#F8F9FA] flex flex-col justify-between font-jakarta">
      {process.env.NEXT_PUBLIC_RAZORPAY_MOCK !== 'true' && (
        <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
      )}

      {/* Top Header Navigation matching Choose Your Journey theme */}
      <header className="availability-header account-header sticky top-0 z-50 bg-white border-b border-gray-200 shadow-xs flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/seats" className="account-back" aria-label="Back to seat selection">
            <ArrowLeft size={18} />
          </Link>
        </div>

        <div className="flex items-center gap-4">
          <nav className="hidden items-center gap-6 text-xs uppercase tracking-[0.14em] text-gray-700 md:flex">
            <Link href="/availability" className="font-bold text-[#D97706] hover:text-[#B45309]">Book a seat</Link>
            <Link href="/about" className="hover:text-[#D97706] transition-colors">About Us</Link>
            <Link href="/policies" className="hover:text-[#D97706] transition-colors">Policies</Link>
            <Link href="/contact" className="hover:text-[#D97706] transition-colors">Contact Us</Link>
            <Link
              href="/account"
              className="!flex items-center gap-2 px-3.5 py-1.5 rounded-none bg-amber-50 border border-[#F8B018]/50 text-[#B45309] hover:bg-[#F8B018] hover:text-black font-semibold text-xs tracking-wider transition-all duration-200 shadow-sm cursor-pointer"
            >
              <UserRound size={14} className="stroke-[2.2]" />
              <span>Account</span>
            </Link>
          </nav>
          <button
            type="button"
            onClick={() => setSheet((prev) => !prev)}
            aria-label={sheet ? 'Close menu' : 'Open menu'}
            className="p-2 text-gray-700 hover:text-[#D97706] hover:bg-amber-50 rounded-xl cursor-pointer bg-transparent border-0 transition-colors"
          >
            <Menu size={24} />
          </button>
        </div>
      </header>

      {/* Booking Progress Bar */}
      <nav className="booking-progress" aria-label="Booking progress">
        {['Bus', 'Passengers', 'Seats', 'Review', 'Payment'].map((step, index) => (
          <span key={step} className={index <= 3 ? 'active' : ''}>
            <b>{index + 1}</b>
            {step}
          </span>
        ))}
      </nav>

      {/* Cityscape Hero Banner with BOOKING SUMMARY & Hold Timer matching Choose Your Journey */}
      <section className="seats-hero availability-hero" aria-label="Booking Summary Hero">
        <div className="seats-hero-overlay availability-hero-overlay" />
        <div className="availability-hero-copy">
          <div className="flex items-end justify-between flex-wrap gap-4">
            <div>
              <h1>
                BOOKING<br />
                <span>SUMMARY.</span>
              </h1>
              <p className="text-xs sm:text-sm font-semibold text-white/95 drop-shadow-[0_1px_4px_rgba(0,0,0,0.9)] mt-2 mb-0 font-jakarta">
                {journey?.from || 'Ahilyanagar'} to {journey?.to || 'Pune'} · {tripDate} · {journey?.busName || 'Express Coach'}
              </p>
            </div>

            <div
              className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-black text-gray-950 bg-[#F8B018] px-4 py-2 rounded-full shadow-[0_2px_12px_rgba(0,0,0,0.45)] border border-yellow-300 shrink-0 font-jakarta"
              role="timer"
              aria-live="polite"
              aria-label={`Hold expires in ${formattedHoldTime}`}
            >
              <Clock size={14} className="text-gray-950 stroke-[2.5]" />
              <span>Hold expires in {formattedHoldTime}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Booking Shell overlapping hero */}
      <section className="booking-shell -mt-6 sm:-mt-8 relative z-10 w-full max-w-[620px] lg:max-w-5xl mx-auto px-3 sm:px-4 lg:px-8 pb-16 flex-1">
        {/* Status Notice Banner (if triggered) */}
        {statusMessage && (
          <div className="mb-4">
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
          holdSeconds={secondsLeft}
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
          {/* Payment Methods Selection matching User Mockup */}
          <section className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 p-5 sm:p-6 shadow-xs space-y-3 font-jakarta">
            <div className="flex items-center justify-between pb-1">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                <CreditCard size={15} className="text-amber-600" />
                <span>CHOOSE PAYMENT METHOD</span>
              </h4>
            </div>

            {/* Option 1: Razorpay Secure (Selected by default) */}
            <div
              onClick={() => setUseWallet(false)}
              className={`p-3.5 sm:p-4 rounded-xl border-2 transition-all cursor-pointer ${
                !useWallet
                  ? 'border-[#F8B018] bg-white shadow-xs'
                  : 'border-slate-200 bg-white hover:border-amber-300'
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-4 h-4 rounded-full flex items-center justify-center ${
                      !useWallet
                        ? 'border-4 border-[#F8B018] bg-[#F8B018] ring-2 ring-amber-300/30'
                        : 'border-2 border-slate-300 bg-white'
                    }`}
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-900 block leading-tight">
                        Razorpay Secure
                      </span>
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-amber-100 text-amber-900 border border-amber-300/80">
                        Test Mode
                      </span>
                    </div>
                    <span className="text-xs text-slate-500 font-medium block mt-0.5">
                      UPI / Cards / NetBanking
                    </span>
                  </div>
                </div>

                <span className="text-base font-black font-mono text-slate-900">
                  ₹{totalRupees}
                </span>
              </div>
            </div>

            {/* Option 2: Uday Travels Wallet */}
            <div
              onClick={() => {
                if (walletAvailablePaise > 0) setUseWallet(true)
              }}
              className={`p-3.5 sm:p-4 rounded-xl border transition-all ${
                walletAvailablePaise > 0
                  ? useWallet
                    ? 'border-[#F8B018] bg-white shadow-xs cursor-pointer'
                    : 'border-slate-200 bg-white hover:border-amber-300 cursor-pointer'
                  : 'border-slate-200 bg-slate-50/50 opacity-75 cursor-not-allowed'
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-4 h-4 rounded-full flex items-center justify-center ${
                      useWallet && walletAvailablePaise > 0
                        ? 'border-4 border-[#F8B018] bg-[#F8B018] ring-2 ring-amber-300/30'
                        : 'border-2 border-slate-300 bg-white'
                    }`}
                  />
                  <div>
                    <span className="text-sm font-bold text-slate-700 block leading-tight">
                      Uday Travels Wallet
                    </span>
                    <span className="text-xs text-slate-400 font-medium block mt-0.5">
                      Balance: ₹{walletBalanceRupees.toFixed(2)} · Low balance
                    </span>
                  </div>
                </div>

                <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase bg-slate-100 px-2 py-0.5 rounded">
                  {walletAvailablePaise > 0
                    ? isFullWalletCoverage
                      ? '100% Wallet'
                      : `-₹${walletDeductionRupees}`
                    : 'UNAVAILABLE'}
                </span>
              </div>
            </div>
          </section>
        </BookingSummary>

        {/* Support & Help Link */}
        <div className="mt-6 text-center text-xs text-gray-500 pb-6">
          <p className="font-semibold text-gray-700">Need help with your booking?</p>
          <p className="mt-1 flex items-center justify-center gap-1.5 flex-wrap">
            <span>Call 24/7 Helpline:</span>
            <a href="tel:+919890066580" className="font-bold text-amber-700 hover:underline">
              +91 98900 66580
            </a>
            <span>·</span>
            <Link href="/help" className="font-bold text-amber-700 hover:underline">
              Help Center
            </Link>
          </p>
        </div>
      </section>

      {/* Full-Screen Verification & Success Loading Overlay */}
      {(paymentState === 'verifying' || paymentState === 'success') && (
        <div className="fixed inset-0 z-[100] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 sm:p-8 max-w-sm w-full text-center shadow-2xl flex flex-col items-center">
            <div className="w-16 h-16 rounded-full bg-emerald-50 border-2 border-emerald-400 flex items-center justify-center mb-4 animate-bounce">
              <CheckCircle2 size={36} className="text-emerald-600" />
            </div>
            <h3 className="text-lg font-black text-slate-900 tracking-tight">
              Payment Confirmed!
            </h3>
            <p className="text-xs text-slate-600 font-medium mt-1 mb-4">
              Your booking is confirmed. Opening your digital boarding pass...
            </p>
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-amber-900 text-xs font-semibold">
              <div className="w-3.5 h-3.5 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" />
              <span>Redirecting to ticket...</span>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Drawer matching User's Mockup in Light Theme */}
      <NavDrawer
        open={sheet}
        onClose={() => setSheet(false)}
        currentUser={currentUser}
        userName={userProfile?.name || ''}
        userPhone={userPhone || (userProfile as any)?.mobile || ''}
        onLogout={handleLogout}
        theme="light"
      />
    </main>
  )
}
