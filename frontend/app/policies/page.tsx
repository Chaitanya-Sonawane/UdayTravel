'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ShieldCheck, FileText, RefreshCw, AlertTriangle, ArrowUpRight } from 'lucide-react'
import { subscribeToAuth, hasDeviceAccount, isUserLoggedIn } from '@/lib/auth/client-auth'
import { User } from 'firebase/auth'

export default function PoliciesPage() {
  const router = useRouter()
  const [openPolicy, setOpenPolicy] = useState<string | null>('01')
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [deviceHasAccount, setDeviceHasAccount] = useState<boolean>(false)

  useEffect(() => {
    setDeviceHasAccount(hasDeviceAccount())
    const unsub = subscribeToAuth((u) => {
      if (u && !u.isAnonymous) setCurrentUser(u)
      else setCurrentUser(null)
    })
    return () => unsub()
  }, [])

  const handleBookJourney = (e: React.MouseEvent) => {
    e.preventDefault()
    if ((currentUser && !currentUser.isAnonymous) || isUserLoggedIn(currentUser)) {
      router.push('/availability')
    } else {
      router.push('/account?mode=register&redirect=/availability')
    }
  }

  const togglePolicy = (id: string) => {
    setOpenPolicy((prev) => (prev === id ? null : id))
  }

  const policies = [
    {
      id: '01',
      hash: 'cancellation',
      title: 'Cancellation & 25/75 Refund Policy',
      content: (
        <div className="space-y-4 text-neutral-300 text-sm md:text-base leading-relaxed">
          <ul className="space-y-3 list-disc list-inside">
            <li><strong className="text-white">25% Bank/UPI Refund:</strong> Directly returned to your original payment method (Bank account or UPI) within 3-5 business days.</li>
            <li><strong className="text-white">75% Instant Wallet Credit:</strong> Credited immediately to your Uday Travels Wallet with zero deductions, usable on any future booking without expiry.</li>
            <li><strong className="text-white">2-Hour Cutoff Window:</strong> Cancellations are permitted until exactly 2 hours prior to scheduled coach departure.</li>
            <li><strong className="text-white">Departure Cutoff:</strong> Cancellations requested within 2 hours of departure or after departure are non-refundable.</li>
          </ul>
        </div>
      ),
    },
    {
      id: '02',
      hash: 'gender-safety',
      title: 'Gender Safety & Seating Rules',
      content: (
        <div className="space-y-4 text-neutral-300 text-sm md:text-base leading-relaxed">
          <ul className="space-y-3 list-disc list-inside">
            <li><strong className="text-white">Women-Only Priority:</strong> When a female passenger books a seat on a bench, adjacent unreserved seats are strictly reserved for female co-passengers.</li>
            <li><strong className="text-white">Family Mode Exemption:</strong> Verified families or couples travelling together are permitted to sit adjacent to one another.</li>
            <li><strong className="text-white">Zero Unrelated Mixed Seating:</strong> Unrelated male and female passengers will never be assigned adjacent seats.</li>
          </ul>
        </div>
      ),
    },
    {
      id: '03',
      hash: 'terms',
      title: 'Boarding, Luggage & Identity Proof (Terms of Service)',
      content: (
        <div className="space-y-4 text-neutral-300 text-sm md:text-base leading-relaxed">
          <ul className="space-y-3 list-disc list-inside">
            <li><strong className="text-white">Reporting Time:</strong> Passengers must report at the selected pick-up location at least 15 minutes before the scheduled boarding time.</li>
            <li><strong className="text-white">Digital Boarding Pass:</strong> Please present your digital e-ticket with the tamper-evident QR code to the conductor on boarding.</li>
            <li><strong className="text-white">Valid ID Proof:</strong> Passengers must carry a government-approved identity proof matching the ticket manifest name.</li>
            <li><strong className="text-white">Luggage Allowance:</strong> Up to 15 kg of personal luggage is permitted per passenger. Hazardous goods are strictly prohibited.</li>
          </ul>
        </div>
      ),
    },
    {
      id: '04',
      hash: 'privacy',
      title: 'Privacy & Data Integrity',
      content: (
        <div className="space-y-4 text-neutral-300 text-sm md:text-base leading-relaxed">
          <p>
            Uday Travels collects passenger details solely for ticketing, safety, boarding verification, and customer assistance. We never sell, rent, or share passenger personal data with third-party advertisers. All payment transactions are processed through PCI-DSS Level 1 compliant Razorpay encryption.
          </p>
        </div>
      ),
    },
  ]

  return (
    <main className="min-h-screen bg-[#0B0F19] text-white">
      <header className="border-b border-white/10 bg-[#0B0F19]/90 px-5 py-5 md:px-10 flex items-center justify-between sticky top-0 z-30 backdrop-blur-md">
        <Link href="/" className="inline-flex items-center gap-2 text-xs font-semibold text-neutral-400 hover:text-white transition-colors">
          <ArrowLeft size={16} /> Back to home
        </Link>
        <Link href="/" className="inline-flex items-center gap-2.5 group" title="Uday Travels Home">
          <span className="w-7 h-7 rounded-lg bg-[#F8B018] text-[#0B0F19] font-black flex items-center justify-center text-[11px] tracking-wider shadow-md shadow-[#F8B018]/25 transition-transform group-hover:scale-105" style={{ backgroundColor: '#F8B018', color: '#0B0F19', fontWeight: 900 }}>
            UT
          </span>
          <span className="font-mono font-bold tracking-widest text-xs uppercase text-[#F8B018] group-hover:text-white transition-colors">
            UDAY TRAVELS POLICIES
          </span>
        </Link>
      </header>

      <section className="max-w-[1440px] w-full mx-auto px-5 py-12 md:py-20 md:px-10 xl:px-16 space-y-12">
        <div className="border-b border-white/10 pb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <span className="text-xs uppercase tracking-widest text-[#F8B018] font-mono font-bold block mb-2">Authoritative Guidelines</span>
            <h1 className="text-3xl sm:text-4xl md:text-6xl font-black uppercase text-white font-[family-name:var(--font-archivo)] tracking-tight">
              Terms &amp; Policies
            </h1>
            <p className="text-neutral-400 mt-3 text-sm md:text-base max-w-2xl leading-relaxed">
              Transparent, fair, and reliable terms designed to protect our passengers and ensure a dependable journey.
            </p>
          </div>
          <a
            href={(currentUser && !currentUser.isAnonymous) || deviceHasAccount ? '/availability' : '/account?mode=register&redirect=/availability'}
            onClick={handleBookJourney}
            className="bg-[#F8B018] text-[#0B0F19] font-bold px-5 py-3 rounded-xl hover:bg-[#ffb020] transition-colors inline-flex items-center gap-2 text-xs shadow-md shrink-0 self-start md:self-auto cursor-pointer"
          >
            Book a Journey <ArrowUpRight size={15} />
          </a>
        </div>

        {/* Minimalist Dark Accordion List */}
        <div className="border-t border-white/10">
          {policies.map((p) => {
            const isOpen = openPolicy === p.id
            return (
              <div key={p.id} id={p.hash} className="border-b border-white/10 transition-colors">
                <button
                  type="button"
                  onClick={() => togglePolicy(p.id)}
                  className="w-full py-5 md:py-6 flex items-center justify-between text-left group cursor-pointer select-none transition-colors"
                  aria-expanded={isOpen}
                >
                  <div className="flex items-center gap-4 sm:gap-6 min-w-0 pr-4">
                    <span className={`font-mono text-xs sm:text-sm font-semibold transition-colors shrink-0 ${
                      isOpen ? 'text-[#F8B018] font-bold' : 'text-white/40 group-hover:text-white/80'
                    }`}>
                      {p.id}
                    </span>
                    <span className={`text-base sm:text-lg md:text-xl font-bold tracking-tight truncate transition-colors ${
                      isOpen ? 'text-white' : 'text-neutral-300 group-hover:text-white'
                    }`}>
                      {p.title}
                    </span>
                  </div>

                  <div
                    className={`w-2.5 h-2.5 rounded-full shrink-0 transition-all duration-300 ${
                      isOpen
                        ? 'bg-[#F8B018] ring-4 ring-[#F8B018]/30 scale-125'
                        : 'bg-white/20 group-hover:bg-white/40'
                    }`}
                  />
                </button>

                <div className={`accordion-content-grid ${isOpen ? 'is-open' : ''}`}>
                  <div className="accordion-content-inner">
                    <div className="pl-8 sm:pl-12 md:pl-14 pr-2 pb-8 pt-2">
                      {p.content}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <div className="pt-8 border-t border-white/10 flex items-center justify-between text-xs text-neutral-400">
          <div className="flex items-center gap-2.5">
            <span className="w-5 h-5 bg-[#F8B018] text-[#0B0F19] font-black rounded flex items-center justify-center text-[10px]">UT</span>
            <span>Last updated: November 2026</span>
          </div>
          <a
            href={(currentUser && !currentUser.isAnonymous) || deviceHasAccount ? '/availability' : '/account?mode=register&redirect=/availability'}
            onClick={handleBookJourney}
            className="text-[#F8B018] hover:text-[#ffb020] font-bold inline-flex items-center gap-1 transition-colors cursor-pointer"
          >
            Book a Journey <ArrowUpRight size={14} />
          </a>
        </div>
      </section>
    </main>
  )
}
