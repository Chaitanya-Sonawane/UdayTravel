'use client'

import { useState } from 'react'
import Script from 'next/script'
import { openCheckout, type RazorpaySuccessResponse, type RazorpayFailureResponse } from '@/lib/razorpay-client'
import { Loader2, ShieldCheck, CheckCircle2, AlertCircle } from 'lucide-react'

export interface RazorpayCheckoutButtonProps {
  amountPaise: number // e.g. 20000 for ₹200.00
  currency?: string
  receipt?: string
  description?: string
  customerName?: string
  customerEmail?: string
  customerMobile?: string
  onSuccess?: (verifyData: any) => void
  onFailure?: (error: string) => void
  className?: string
  buttonText?: string
}

export function RazorpayCheckoutButton({
  amountPaise,
  currency = 'INR',
  receipt,
  description = 'Uday Travels Journey Ticket',
  customerName,
  customerEmail,
  customerMobile,
  onSuccess,
  onFailure,
  className,
  buttonText,
}: RazorpayCheckoutButtonProps) {
  const [loading, setLoading] = useState(false)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [statusType, setStatusType] = useState<'success' | 'error' | null>(null)

  const handlePayment = async () => {
    try {
      setLoading(true)
      setStatusMessage(null)
      setStatusType(null)

      // Step 1: Create Order on Backend
      const createRes = await fetch('/api/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: amountPaise,
          currency,
          receipt: receipt || `rcpt_${Date.now()}`,
        }),
      })

      const orderData = await createRes.json()

      if (!createRes.ok) {
        throw new Error(orderData.error || 'Failed to initialize payment order')
      }

      // Step 2: Open Standard Razorpay Checkout Modal
      openCheckout({
        key: orderData.key_id || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || '',
        order_id: orderData.order_id,
        amount: orderData.amount,
        currency: orderData.currency || currency,
        name: 'Uday Travels',
        description,
        prefill: {
          name: customerName || '',
          email: customerEmail || '',
          contact: customerMobile || '',
        },
        theme: {
          color: '#F8B018',
        },
        modal: {
          ondismiss: () => {
            setLoading(false)
            setStatusType('error')
            setStatusMessage('Payment cancelled by user.')
            onFailure?.('Payment cancelled by user.')
          },
        },
        onPaymentFailed: (response: RazorpayFailureResponse) => {
          setLoading(false)
          const errorMsg =
            response.error?.description || 'Payment transaction failed.'
          setStatusType('error')
          setStatusMessage(errorMsg)
          onFailure?.(errorMsg)
        },
        handler: async (response: RazorpaySuccessResponse) => {
          // Step 3: Verify Payment Signature on Backend
          try {
            setStatusMessage('Verifying payment signature...')
            const verifyRes = await fetch('/api/verify-payment', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              }),
            })

            const verifyData = await verifyRes.json()

            if (!verifyRes.ok || !verifyData.success) {
              throw new Error(
                verifyData.message ||
                  verifyData.error ||
                  'Signature verification failed'
              )
            }

            setLoading(false)
            setStatusType('success')
            setStatusMessage(
              `Payment successful! Payment ID: ${response.razorpay_payment_id}`
            )
            onSuccess?.(verifyData)
          } catch (verifyErr: any) {
            setLoading(false)
            setStatusType('error')
            const msg = verifyErr.message || 'Payment verification failed'
            setStatusMessage(msg)
            onFailure?.(msg)
          }
        },
      })
    } catch (err: any) {
      setLoading(false)
      setStatusType('error')
      const msg = err.message || 'Payment error'
      setStatusMessage(msg)
      onFailure?.(msg)
    }
  }

  const amountDisplay = (amountPaise / 100).toFixed(2)

  return (
    <div className="space-y-2">
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        strategy="lazyOnload"
      />
      <button
        type="button"
        onClick={handlePayment}
        disabled={loading}
        className={
          className ||
          'inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-bold bg-[#F8B018] text-[#0B0F19] hover:bg-[#e08b00] disabled:opacity-60 transition-all shadow-md'
        }
      >
        {loading ? (
          <>
            <Loader2 size={18} className="animate-spin" /> Processing...
          </>
        ) : (
          <>
            <ShieldCheck size={18} />
            {buttonText || `Pay ₹${amountDisplay} with Razorpay`}
          </>
        )}
      </button>

      {statusMessage && (
        <div
          className={`flex items-center gap-2 p-3 text-xs rounded-md border ${
            statusType === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              : 'bg-red-500/10 border-red-500/30 text-red-400'
          }`}
        >
          {statusType === 'success' ? (
            <CheckCircle2 size={15} />
          ) : (
            <AlertCircle size={15} />
          )}
          <span>{statusMessage}</span>
        </div>
      )}
    </div>
  )
}
