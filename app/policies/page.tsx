'use client'

import Link from 'next/link'
import { ArrowLeft, ShieldCheck, FileText, RefreshCw, AlertTriangle } from 'lucide-react'

export default function PoliciesPage() {
  return (
    <main className="min-h-screen bg-[#0B0F19] text-white">
      <header className="border-b border-white/10 px-5 py-5 md:px-10 flex items-center justify-between">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-white/70 hover:text-white transition-colors">
          <ArrowLeft size={18} /> Back to home
        </Link>
        <span className="font-bold tracking-widest text-[#FF9D00]">UDAY POLICIES</span>
      </header>

      <section className="max-w-3xl mx-auto px-5 py-12 md:py-16 space-y-10">
        <div>
          <span className="text-xs uppercase tracking-widest text-[#FF9D00] font-semibold">Authoritative Guidelines</span>
          <h1 className="text-3xl md:text-5xl font-black uppercase mt-2">Terms & Policies</h1>
          <p className="text-white/60 mt-3 text-sm md:text-base">
            Transparent, fair, and reliable terms designed to protect our passengers and ensure a dependable journey.
          </p>
        </div>

        <div className="space-y-8">
          <article className="border border-white/10 rounded-lg p-6 bg-white/[0.02]">
            <div className="flex items-center gap-3 text-lg font-bold text-white mb-3">
              <RefreshCw className="text-[#FF9D00]" size={22} />
              <h2>1. Cancellation & Store Credit Refund Policy</h2>
            </div>
            <ul className="space-y-2 text-sm text-white/70 leading-relaxed list-disc list-inside">
              <li><strong>100% Wallet Refund:</strong> If cancelled at least 2 hours before scheduled departure, 100% of the ticket fare is immediately credited to your Uday Travels Store Credit Wallet.</li>
              <li><strong>Zero Cancellation Deductions:</strong> No cancellation charges or platform penalty fees are levied.</li>
              <li><strong>Instant Usability:</strong> Store credit wallet balances can be used immediately toward any future booking on any route.</li>
              <li><strong>Departure Cutoff:</strong> Cancellations requested within 2 hours of scheduled departure or after bus departure are non-refundable.</li>
            </ul>
          </article>

          <article className="border border-white/10 rounded-lg p-6 bg-white/[0.02]">
            <div className="flex items-center gap-3 text-lg font-bold text-white mb-3">
              <ShieldCheck className="text-[#FF9D00]" size={22} />
              <h2>2. Gender Safety & Seating Rules</h2>
            </div>
            <ul className="space-y-2 text-sm text-white/70 leading-relaxed list-disc list-inside">
              <li><strong>Women-Only Priority:</strong> When a woman passenger books a seat on a bench, adjacent unreserved seats are strictly reserved for female co-passengers.</li>
              <li><strong>Family Mode Exemption:</strong> Verified families or couples travelling together are permitted to sit adjacent to one another.</li>
              <li><strong>Zero Unrelated Mixed Seating:</strong> Unrelated male and female passengers will never be assigned adjacent seats.</li>
            </ul>
          </article>

          <article className="border border-white/10 rounded-lg p-6 bg-white/[0.02]">
            <div className="flex items-center gap-3 text-lg font-bold text-white mb-3">
              <FileText className="text-[#FF9D00]" size={22} />
              <h2>3. Boarding, Luggage & Identity Proof</h2>
            </div>
            <ul className="space-y-2 text-sm text-white/70 leading-relaxed list-disc list-inside">
              <li><strong>Reporting Time:</strong> Passengers must report at the selected pick-up location at least 15 minutes before the scheduled boarding time.</li>
              <li><strong>Digital Boarding Pass:</strong> Please present your digital e-ticket with the tamper-evident QR code to the driver/conductor on boarding.</li>
              <li><strong>Valid ID Proof:</strong> Passengers must carry a government-approved identity proof (Aadhaar, Voter ID, Driving Licence) matching the ticket manifest name.</li>
              <li><strong>Luggage Allowance:</strong> Up to 15 kg of personal luggage is permitted per passenger. Hazardous, flammable, or offensive goods are strictly prohibited.</li>
            </ul>
          </article>

          <article className="border border-white/10 rounded-lg p-6 bg-white/[0.02]">
            <div className="flex items-center gap-3 text-lg font-bold text-white mb-3">
              <AlertTriangle className="text-[#FF9D00]" size={22} />
              <h2>4. Privacy & Data Integrity</h2>
            </div>
            <p className="text-sm text-white/70 leading-relaxed">
              Uday Travels collects passenger details solely for ticketing, safety, boarding verification, and customer assistance. We never sell, rent, or share passenger personal data with third-party advertisers. All payment transactions are processed through PCI-DSS Level 1 compliant Razorpay encryption.
            </p>
          </article>
        </div>

        <div className="pt-6 border-t border-white/10 flex items-center justify-between">
          <span className="text-xs text-white/40">Last updated: November 2026</span>
          <Link href="/availability" className="bg-[#FF9D00] text-[#0B0F19] text-xs font-bold px-4 py-2 rounded-sm hover:bg-[#ffb020] transition-colors">
            Book a Journey
          </Link>
        </div>
      </section>
    </main>
  )
}
