'use client'

import Link from 'next/link'
import { ArrowLeft, Tag, Bus, Sparkles, CheckCircle2 } from 'lucide-react'

export default function OffersPage() {
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

      {/* Main Content Area: No Offers Found Empty State */}
      <section className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-md bg-[#0F1420] border border-[#F8B018]/25 rounded-3xl p-8 sm:p-10 text-center shadow-2xl shadow-black/60 relative overflow-hidden">
          {/* Subtle gold glow accent */}
          <div className="absolute -top-24 -left-24 w-48 h-48 bg-[#F8B018]/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-[#F8B018]/10 rounded-full blur-3xl pointer-events-none" />

          {/* Icon Badge */}
          <div className="w-20 h-20 rounded-3xl bg-[#F8B018]/15 border border-[#F8B018]/30 text-[#F8B018] flex items-center justify-center mx-auto mb-6 shadow-lg shadow-[#F8B018]/10">
            <Tag size={40} className="stroke-[2.2]" />
          </div>

          {/* Heading & Subtitle */}
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            No Offers Found
          </h1>
          <p className="text-sm text-white/60 mt-3 leading-relaxed max-w-xs mx-auto">
            There are currently no active promotional offers or discounts for your account. We roll out special discounts during festival rushes!
          </p>

          {/* Best Value Guarantee Box */}
          <div className="mt-8 pt-6 border-t border-white/10 text-left bg-white/[0.03] p-4 rounded-2xl border border-white/5 space-y-2">
            <div className="flex items-center gap-2 text-[#F8B018] text-xs font-bold uppercase tracking-wider">
              <Sparkles size={14} /> Guaranteed Best Rate
            </div>
            <p className="text-xs text-white/70 leading-relaxed">
              All daily departures between <strong className="text-white">Pune &harr; Ahilyanagar</strong> are fixed at a flat fare of <strong className="text-[#F8B018]">₹200 per seat</strong> with no surge pricing or hidden convenience fees.
            </p>
          </div>

          {/* Call to Actions */}
          <div className="mt-8 flex flex-col gap-3">
            <Link
              href="/availability"
              className="w-full py-3.5 rounded-xl bg-[#F8B018] hover:bg-[#ffbe2e] text-black font-extrabold text-sm shadow-lg shadow-[#F8B018]/20 transition-all text-center block cursor-pointer"
            >
              View Available Buses
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
