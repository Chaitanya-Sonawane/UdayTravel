'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, CreditCard, ShieldCheck } from 'lucide-react'
import { RazorpayCheckoutButton } from '@/components/RazorpayCheckoutButton'

export default function RazorpayTestPage() {
  const [customRupees, setCustomRupees] = useState('200')
  const [customerName, setCustomerName] = useState('Chaitanya Sonawane')
  const [customerMobile, setCustomerMobile] = useState('9890066580')
  const [customerEmail, setCustomerEmail] = useState('care@udaytravel.in')
  const [lastSuccess, setLastSuccess] = useState<any>(null)

  const amountPaise = Math.max(100, Math.round(Number(customRupees || '1') * 100))

  return (
    <main className="min-h-screen bg-[#0B0F19] text-white p-6 md:p-12 flex flex-col items-center">
      <div className="w-full max-w-lg">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-white/60 hover:text-white mb-6"
        >
          <ArrowLeft size={16} /> Back to Uday Travels
        </Link>

        <div className="bg-[#11151F] border border-white/10 rounded-xl p-6 sm:p-8 shadow-2xl">
          <div className="flex items-center gap-3 pb-6 border-b border-white/10 mb-6">
            <div className="w-10 h-10 rounded-lg bg-[#F8B018]/10 border border-[#F8B018]/30 flex items-center justify-center text-[#F8B018]">
              <CreditCard size={20} />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">
                Razorpay Standard Web Checkout
              </h1>
              <p className="text-xs text-white/50">
                Test integration with order creation & signature verification
              </p>
            </div>
          </div>

          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-xs uppercase tracking-wider text-white/60 mb-1.5 font-semibold">
                Amount (in ₹ Rupees)
              </label>
              <input
                type="number"
                min="1"
                step="1"
                value={customRupees}
                onChange={(e) => setCustomRupees(e.target.value)}
                className="w-full bg-[#0B0F19] border border-white/15 rounded-lg px-4 py-2.5 text-white font-mono text-sm focus:border-[#F8B018] focus:outline-none"
              />
              <span className="text-[11px] text-white/40 mt-1 block">
                Calculated: {amountPaise} paise (Minimum 100 paise)
              </span>
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider text-white/60 mb-1.5 font-semibold">
                Customer Name
              </label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full bg-[#0B0F19] border border-white/15 rounded-lg px-4 py-2.5 text-white text-sm focus:border-[#F8B018] focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs uppercase tracking-wider text-white/60 mb-1.5 font-semibold">
                  Mobile
                </label>
                <input
                  type="text"
                  value={customerMobile}
                  onChange={(e) => setCustomerMobile(e.target.value)}
                  className="w-full bg-[#0B0F19] border border-white/15 rounded-lg px-4 py-2.5 text-white text-sm focus:border-[#F8B018] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-wider text-white/60 mb-1.5 font-semibold">
                  Email
                </label>
                <input
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  className="w-full bg-[#0B0F19] border border-white/15 rounded-lg px-4 py-2.5 text-white text-sm focus:border-[#F8B018] focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-white/10">
            <RazorpayCheckoutButton
              amountPaise={amountPaise}
              customerName={customerName}
              customerEmail={customerEmail}
              customerMobile={customerMobile}
              description="Uday Travels - Test Payment"
              className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg font-bold bg-[#F8B018] text-[#0B0F19] hover:bg-[#e08b00] transition-all shadow-md"
              onSuccess={(data) => setLastSuccess(data)}
            />
          </div>

          {lastSuccess && (
            <div className="mt-6 p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
              <span className="text-xs font-bold text-emerald-400 block mb-2">
                ✓ Verification Response:
              </span>
              <pre className="text-[11px] font-mono text-emerald-300 overflow-x-auto whitespace-pre-wrap">
                {JSON.stringify(lastSuccess, null, 2)}
              </pre>
            </div>
          )}

          <div className="mt-6 p-3 rounded-lg bg-white/[0.03] border border-white/10 text-[11px] text-white/50 space-y-1">
            <p className="flex items-center gap-1.5 text-white/70 font-semibold">
              <ShieldCheck size={14} className="text-[#F8B018]" /> Flow Details:
            </p>
            <p>1. Calls <code>POST /api/create-order</code> to generate Razorpay order</p>
            <p>2. Opens Razorpay Standard Checkout popup modal</p>
            <p>3. Calls <code>POST /api/verify-payment</code> to verify HMAC SHA-256 signature</p>
          </div>
        </div>
      </div>
    </main>
  )
}
