'use client'

import Link from 'next/link'
import Script from 'next/script'
import { useRouter } from 'next/navigation'
import { useEffect, useReducer, useState } from 'react'
import {
  ArrowLeft,
  Check,
  CreditCard,
  LockKeyhole,
  Receipt,
  ShieldCheck,
  Wallet,
  WalletCards,
  Loader2,
} from 'lucide-react'
import { useBookingStore } from '@/lib/booking-store'
import { paymentReducer } from '@/lib/payment-machine'
import { openCheckout } from '@/lib/razorpay-client'
import { getApiAuthHeaders } from '@/lib/firebase/client'

function Header() {
  return (
    <header className="payment-header">
      <Link href="/review" className="payment-back" aria-label="Back to booking review">
        <ArrowLeft />
      </Link>
      <span className="page-brand">
        <span className="page-brand-mark">UT</span>
        <span className="page-brand-name">UDAY TRAVELS</span>
      </span>
    </header>
  )
}

function HoldPill({ expires }: { expires?: number }) {
  const [seconds, setSeconds] = useState(300)

  useEffect(() => {
    const tick = () => {
      setSeconds(Math.max(0, expires ? Math.floor((expires - Date.now()) / 1000) : 300))
    }
    tick()
    const timer = setInterval(tick, 1000)
    return () => clearInterval(timer)
  }, [expires])

  const mins = String(Math.floor(seconds / 60)).padStart(2, '0')
  const secs = String(seconds % 60).padStart(2, '0')

  return (
    <span
      className={seconds < 120 ? 'hold-pill danger' : 'hold-pill'}
      role="timer"
      aria-live="off"
    >
      HOLD {mins}:{secs}
    </span>
  )
}

export default function PaymentPage() {
  const router = useRouter()
  const { passengers, journey, holdExpiresAt, grp, holdToken } = useBookingStore()
  const [state, dispatch] = useReducer(paymentReducer, 'idle')
  const [message, setMessage] = useState('')
  const [walletAvailablePaise, setWalletAvailablePaise] = useState(0)
  const [useWallet, setUseWallet] = useState(false)
  const [loadingWallet, setLoadingWallet] = useState(true)

  // Fetch current user wallet balance
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
        console.warn('[Payment] Wallet fetch failed:', err)
      } finally {
        setLoadingWallet(false)
      }
    }
    loadWallet()
  }, [])

  const perSeatPaise = journey.fare ? Math.round(journey.fare * 100) : 20000
  const totalPaise = passengers.length * perSeatPaise
  const walletDeductionPaise = useWallet
    ? Math.min(totalPaise, walletAvailablePaise)
    : 0
  const payablePaise = totalPaise - walletDeductionPaise

  const totalRupees = totalPaise / 100
  const walletDeductionRupees = walletDeductionPaise / 100
  const payableRupees = payablePaise / 100

  const disabled = !['idle', 'failed', 'dismissed'].includes(state)

  const pay = async () => {
    if (!grp) {
      setMessage('Booking session expired. Please reselect your seats.')
      return
    }

    dispatch({ type: 'CREATE' })
    setMessage('')

    try {
      const headers = await getApiAuthHeaders()
      const orderRes = await fetch('/api/payments/create-order', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          grp,
          holdToken: holdToken || 'dev_hold_token',
          useWallet,
          passengers: passengers.map((p) => ({
            seat: p.seatId || 'A1',
            name: p.name || 'Passenger',
            age: Number(p.age) || 25,
            gender: p.gender === 'woman' ? 'female' : 'male',
          })),
          contactMobile: '9890066580',
          routeId: journey.routeId || 'AHM_PUN',
          tripId: journey.tripId,
          travelDate: journey.date,
          busName: journey.busName,
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
          body: JSON.stringify({ grp }),
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
        key: orderData.keyId,
        order_id: orderData.orderId,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'Uday Travels',
        description: `${journey.from} → ${journey.to} · Seats ${passengers.map((p) => p.seatId).join(', ')}`,
        theme: { color: '#FF9D00' },
        modal: {
          ondismiss: () => {
            dispatch({ type: 'DISMISS' })
            setMessage('Payment cancelled. Your seats are still held.')
          },
        },
        handler: async (response) => {
          dispatch({ type: 'VERIFY' })
          try {
            const verifyHeaders = await getApiAuthHeaders()
            const verifyRes = await fetch('/api/payments/verify', {
              method: 'POST',
              headers: verifyHeaders,
              body: JSON.stringify({
                grp,
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
            setMessage(msg)
          }
        },
      })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Payment error'
      dispatch({ type: 'FAILED' })
      setMessage(msg)
    }
  }

  return (
    <main className="payment-page">
      {process.env.NEXT_PUBLIC_RAZORPAY_MOCK !== 'true' && (
        <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
      )}
      <Header />
      <div className="payment-main">
        {/* Order Summary */}
        <section className="payment-card">
          <div className="payment-card-title">
            <span>
              <Receipt size={18} /> ORDER SUMMARY
            </span>
            <HoldPill expires={holdExpiresAt} />
          </div>
          <div className="payment-inner">
            <div className="payment-route">
              <strong>{journey.from} → {journey.to}</strong>
              <span>{journey.busName}</span>
            </div>
            <div className="payment-meta">
              <div>
                <small>DATE & TIME</small>
                <b>{journey.date} · {journey.departure}</b>
              </div>
              <div>
                <small>STOPS</small>
                <b>Ahilyanagar Bus Stand → Shivajinagar, Pune</b>
              </div>
            </div>

            <small className="payment-label">PASSENGERS & SEATS</small>
            {passengers.map((passenger) => (
              <div className="passenger-line" key={passenger.id}>
                <span>
                  {passenger.name || 'Passenger'} ·{' '}
                  {passenger.gender === 'woman' ? 'Woman' : 'Man'}
                </span>
                <em>Seat {passenger.seatId}</em>
              </div>
            ))}

            <div className="fare-line">
              <span>Seat Fare ({passengers.length} × ₹200)</span>
              <b>₹{totalRupees}</b>
            </div>

            {walletDeductionPaise > 0 && (
              <div className="fare-line" style={{ color: '#059669' }}>
                <span>Wallet Store Credit</span>
                <b>-₹{walletDeductionRupees}</b>
              </div>
            )}

            <div className="fare-line">
              <span>Taxes & Convenience Fee</span>
              <b className="green">₹0 (FREE)</b>
            </div>
            <hr />
            <div className="total-line">
              <strong>Total Payable</strong>
              <b>₹{payableRupees}</b>
            </div>
          </div>
        </section>

        {/* Store Credit Wallet Option */}
        {walletAvailablePaise > 0 && (
          <section className="payment-card">
            <div className="payment-card-title">
              <span>
                <Wallet size={18} /> UDAY WALLET STORE CREDIT
              </span>
            </div>
            <div style={{ padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <strong>Available Credit: ₹{walletAvailablePaise / 100}</strong>
                <p className="payment-muted" style={{ margin: 0, fontSize: '0.85rem' }}>
                  Use your store credit to discount this booking
                </p>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 600 }}>
                <input
                  type="checkbox"
                  checked={useWallet}
                  onChange={(e) => setUseWallet(e.target.checked)}
                  style={{ width: '18px', height: '18px', accentColor: '#FF9D00' }}
                />
                Apply Credit
              </label>
            </div>
          </section>
        )}

        {/* Pay With Options */}
        {payablePaise > 0 && (
          <section className="payment-card">
            <div className="payment-card-title">
              <span>
                <CreditCard size={18} /> PAY WITH RAZORPAY
              </span>
            </div>
            <div className="method-list">
              <span>
                <WalletCards size={14} /> UPI
              </span>
              <span>
                <CreditCard size={14} /> Cards
              </span>
              <span>Net Banking</span>
              <span>Wallets</span>
            </div>
            <p className="payment-muted">
              Choose your payment method securely in the Razorpay dialog.
            </p>
          </section>
        )}

        <div className="trust-row">
          <ShieldCheck size={20} />
          <span>
            <b>Secured by Razorpay & Uday Travels</b>
            <small>Instant confirmation · 256-bit SSL encryption</small>
          </span>
          <em>PROTECTED</em>
        </div>

        {message && (
          <div className={state === 'success' ? 'payment-success' : 'payment-notice'}>
            {state === 'success' ? <Check size={18} /> : null}
            {message}
          </div>
        )}
      </div>

      <div className="payment-bottom">
        <button className="payment-button" onClick={pay} disabled={disabled}>
          {state === 'creating_order' ? (
            <>
              <Loader2 size={17} className="animate-spin" /> Preparing booking...
            </>
          ) : state === 'verifying' ? (
            <>
              <Loader2 size={17} className="animate-spin" /> Confirming payment...
            </>
          ) : (
            <>
              <LockKeyhole size={17} />{' '}
              {payablePaise === 0 ? 'Pay with Wallet Credit' : `Pay ₹${payableRupees}`}
            </>
          )}
        </button>
        <p>
          Need help with your booking? Call{' '}
          <a href="tel:+919890066580">+91 98900 66580</a>
        </p>
      </div>
    </main>
  )
}
