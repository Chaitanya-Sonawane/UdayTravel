'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import {
  Tag,
  Copy,
  Check,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Percent,
  Clock,
  Bus,
} from 'lucide-react'

export interface PromoOffer {
  id: string
  category: 'bus' | 'commute' | 'women'
  badge: string
  badgeColor: string
  title: string
  subtext: string
  code: string
  validity: string
  discount: string
}

const OFFERS: PromoOffer[] = [
  {
    id: 'offer-1',
    category: 'bus',
    badge: 'BUS',
    badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    title: 'Save up to ₹50 on First Journey',
    subtext: 'Valid on Ahilyanagar ⇄ Pune daily express departures',
    code: 'UDAYFIRST',
    validity: 'Valid till 31 Dec, 2026',
    discount: '₹50 OFF',
  },
  {
    id: 'offer-2',
    category: 'commute',
    badge: 'ROUND TRIP',
    badgeColor: 'bg-amber-100 text-amber-900 border-amber-200',
    title: 'Flat ₹40 Off on Return Journey',
    subtext: 'Book both outbound and return tickets together',
    code: 'RETURN40',
    validity: 'Valid on all days',
    discount: '₹40 OFF',
  },
  {
    id: 'offer-3',
    category: 'women',
    badge: 'WOMEN SAFETY',
    badgeColor: 'bg-pink-100 text-pink-800 border-pink-200',
    title: 'Free Window Upgrade for Solo Women',
    subtext: 'Dedicated adjacent seating with zero convenience fee',
    code: 'WOMENSAFE',
    validity: 'Unlimited uses',
    discount: 'FREE UPGRADE',
  },
  {
    id: 'offer-4',
    category: 'commute',
    badge: 'DAILY PASS',
    badgeColor: 'bg-blue-100 text-blue-800 border-blue-200',
    title: 'Commuter 15% Pass Discount',
    subtext: 'For regular students and office travelers on NH60',
    code: 'COMMUTE15',
    validity: 'Valid on 3+ seats',
    discount: '15% OFF',
  },
]

export function RedBusOffersSection() {
  const [activeTab, setActiveTab] = useState<'all' | 'bus' | 'commute' | 'women'>('all')
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  const filteredOffers = activeTab === 'all' ? OFFERS : OFFERS.filter((o) => o.category === activeTab)

  const handleCopy = (code: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(code)
    }
    setCopiedCode(code)
    setTimeout(() => {
      setCopiedCode(null)
    }, 2000)
  }

  return (
    <section className="w-full bg-white text-gray-900 py-12 sm:py-16 px-4 sm:px-8 border-b border-gray-100">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* ----------------------------------------------------------- */}
        {/* SECTION HEADER MATCHING REDBUS                             */}
        {/* ----------------------------------------------------------- */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
              Offers for you
            </h2>
            <p className="text-xs text-gray-500 font-medium mt-0.5">
              Exclusive discounts and promo codes for your next journey
            </p>
          </div>

          <Link
            href="/offers"
            className="text-xs sm:text-sm font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 group transition-colors"
          >
            <span>View more</span>
            <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>

        {/* ----------------------------------------------------------- */}
        {/* FILTER TABS (ALL, BUS, COMMUTE, WOMEN)                     */}
        {/* ----------------------------------------------------------- */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {[
            { id: 'all', label: 'All' },
            { id: 'bus', label: 'Bus' },
            { id: 'commute', label: 'Daily Commute' },
            { id: 'women', label: 'Women Special' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-red-50 text-[#D81A2A] border border-red-200 shadow-2xs font-black'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ----------------------------------------------------------- */}
        {/* OFFERS CARDS GRID                                          */}
        {/* ----------------------------------------------------------- */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {filteredOffers.map((offer) => (
            <div
              key={offer.id}
              className="bg-white rounded-2xl border border-gray-200 p-4 hover:border-gray-300 hover:shadow-md transition-all flex flex-col justify-between space-y-3.5 relative overflow-hidden group"
            >
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span
                    className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md border ${offer.badgeColor}`}
                  >
                    {offer.badge}
                  </span>
                  <span className="text-xs font-black text-[#D81A2A] font-mono">
                    {offer.discount}
                  </span>
                </div>

                <h3 className="font-extrabold text-sm text-gray-900 leading-snug">
                  {offer.title}
                </h3>

                <p className="text-xs text-gray-500 leading-relaxed">
                  {offer.subtext}
                </p>
              </div>

              {/* Bottom: Validity & Copyable Coupon Code */}
              <div className="pt-2 border-t border-gray-100 space-y-2">
                <span className="text-[10px] text-gray-400 font-medium block">
                  {offer.validity}
                </span>

                <div className="flex items-center justify-between gap-2 bg-gray-50 border border-dashed border-gray-300 rounded-xl px-2.5 py-1.5">
                  <span className="font-mono font-black text-xs text-gray-900 tracking-wider">
                    {offer.code}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy(offer.code)}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-gray-700 hover:text-black cursor-pointer transition-colors"
                    title="Copy coupon code"
                  >
                    {copiedCode === offer.code ? (
                      <>
                        <Check size={12} className="text-emerald-600" />
                        <span className="text-emerald-700 font-black">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy size={12} />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ----------------------------------------------------------- */}
        {/* REDBUS STYLE VALUE PROPOSITIONS STRIP                       */}
        {/* ----------------------------------------------------------- */}
        <div className="mt-8 pt-6 border-t border-gray-100 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-100">
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center font-bold shrink-0">
              ⚡
            </div>
            <div>
              <h4 className="text-xs font-black text-gray-900">Live Seat Hold</h4>
              <p className="text-[11px] text-gray-500 mt-0.5">Instant lock with 8 min payment guarantee</p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-2xl bg-pink-50/70 border border-pink-100">
            <div className="w-8 h-8 rounded-xl bg-pink-100 text-pink-700 flex items-center justify-center font-bold shrink-0">
              👩
            </div>
            <div>
              <h4 className="text-xs font-black text-gray-900">Women Reserved</h4>
              <p className="text-[11px] text-gray-500 mt-0.5">Strict female-only adjacent passenger safety</p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-2xl bg-emerald-50/70 border border-emerald-100">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold shrink-0">
              ✓
            </div>
            <div>
              <h4 className="text-xs font-black text-gray-900">Zero Cancellation</h4>
              <p className="text-[11px] text-gray-500 mt-0.5">Direct UPI refund back to your account</p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-2xl bg-blue-50/70 border border-blue-100">
            <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center font-bold shrink-0">
              📍
            </div>
            <div>
              <h4 className="text-xs font-black text-gray-900">Exact Boarding</h4>
              <p className="text-[11px] text-gray-500 mt-0.5">SMS updates at Savedi &amp; Shivajinagar</p>
            </div>
          </div>
        </div>

      </div>
    </section>
  )
}

export default RedBusOffersSection
