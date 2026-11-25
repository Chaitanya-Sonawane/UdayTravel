'use client'

import Link from 'next/link'
import { ArrowLeft, Gift, Ticket, Bus } from 'lucide-react'

export default function GiftCardsPage() {
  return (
    <main className="min-h-screen bg-[#0B0F19] text-white flex flex-col justify-between">
      {/* Header */}
      <header className="px-5 py-4 sm:px-10 border-b border-white/10 flex items-center justify-between bg-[#0F1420]/80 backdrop-blur-md sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="p-2 -ml-2 text-white/70 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
            aria-label="Back to home"
          >
            <ArrowLeft size={20} />
          </Link>
          <Link href="/" className="flex items-center gap-2.5 group cursor-pointer" title="Uday Travels Home">
            <span
              className="brand-logo-mark w-8 h-8 rounded-lg bg-[#F8B018] text-[#0B0F19] font-black flex items-center justify-center text-xs tracking-wider shadow-md shadow-[#F8B018]/25 transition-transform group-hover:scale-105"
              style={{ backgroundColor: '#F8B018', color: '#0B0F19', fontWeight: 900 }}
            >
              UT
            </span>
            <strong className="tracking-wider font-extrabold text-sm text-white group-hover:text-[#F8B018] transition-colors">
              UDAY TRAVELS
            </strong>
          </Link>
        </div>

        <Link
          href="/availability"
          className="text-xs uppercase tracking-wider font-extrabold text-[#F8B018] hover:underline"
        >
          Book a seat
        </Link>
      </header>

      {/* Main Content Area: No Gift Card Found Empty State */}
      <section className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-md bg-[#0F1420] border border-[#F8B018]/25 rounded-3xl p-8 sm:p-10 text-center shadow-2xl shadow-black/60 relative overflow-hidden">
          {/* Subtle gold glow accent */}
          <div className="absolute -top-24 -left-24 w-48 h-48 bg-[#F8B018]/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-[#F8B018]/10 rounded-full blur-3xl pointer-events-none" />

          {/* Icon Badge */}
          <div className="w-20 h-20 rounded-3xl bg-[#F8B018]/15 border border-[#F8B018]/30 text-[#F8B018] flex items-center justify-center mx-auto mb-6 shadow-lg shadow-[#F8B018]/10">
            <Gift size={40} className="stroke-[2.2]" />
          </div>

          {/* Heading & Subtitle */}
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            No Gift Card Found
          </h1>
          <p className="text-sm text-white/60 mt-3 leading-relaxed max-w-xs mx-auto">
            You haven&apos;t received or redeemed any gift cards yet. When a voucher is credited to your account, it will appear here.
          </p>

          {/* Promo code redemption input */}
          <div className="mt-8 pt-6 border-t border-white/10 space-y-3">
            <span className="text-xs font-bold text-white/70 block text-left">
              Have an Uday Travels gift voucher?
            </span>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Enter voucher code"
                className="flex-1 bg-white/[0.04] border border-white/15 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#F8B018] uppercase tracking-wider font-mono"
              />
              <button
                type="button"
                onClick={() => alert('No matching gift voucher found for this code.')}
                className="px-4 py-2.5 rounded-xl bg-[#F8B018] hover:bg-[#ffbe2e] text-black font-extrabold text-xs tracking-wider transition-colors cursor-pointer"
              >
                Redeem
              </button>
            </div>
          </div>

          {/* Call to Actions */}
          <div className="mt-8 flex flex-col gap-3">
            <Link
              href="/availability"
              className="w-full py-3.5 rounded-xl bg-[#F8B018] hover:bg-[#ffbe2e] text-black font-extrabold text-sm shadow-lg shadow-[#F8B018]/20 transition-all text-center block cursor-pointer"
            >
              Book a Journey
            </Link>
            <Link
              href="/"
              className="text-xs font-bold text-white/60 hover:text-white transition-colors"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-6 border-t border-white/10 text-center text-xs text-white/50">
        <p>&copy; {new Date().getFullYear()} Uday Travels &bull; Pune &harr; Ahilyanagar Highway Express</p>
      </footer>
    </main>
  )
}
