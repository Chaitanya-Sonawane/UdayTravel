'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Phone, Mail, MessageCircle, MapPin, Clock, ArrowUpRight } from 'lucide-react'

export default function ContactPage() {
  const [openContact, setOpenContact] = useState<string | null>('01')

  const toggleContact = (id: string) => {
    setOpenContact((prev) => (prev === id ? null : id))
  }

  const contacts = [
    {
      id: '01',
      title: 'Telephone Helpline & Dispatch Desk',
      content: (
        <div className="space-y-4 text-neutral-300 text-sm md:text-base leading-relaxed">
          <p>
            Direct 24/7 telephonic booking queries, departure times, pickup coordination, and route assistance.
          </p>
          <div className="pt-1 flex flex-wrap gap-4 font-mono text-sm">
            <a
              href="tel:+919890066580"
              className="px-5 py-3 rounded-xl bg-white/[0.06] border border-white/15 text-white font-bold inline-flex items-center gap-2 hover:bg-[#F8B018] hover:text-[#0B0F19] hover:border-transparent transition-colors"
            >
              <Phone size={15} className="text-[#F8B018] group-hover:text-inherit" /> +91 98900 66580
            </a>
          </div>
        </div>
      ),
    },
    {
      id: '02',
      title: 'WhatsApp Instant Support & QR E-Ticket Delivery',
      content: (
        <div className="space-y-4 text-neutral-300 text-sm md:text-base leading-relaxed">
          <p>
            Connect directly with our customer desk on WhatsApp for live location sharing, seat re-issues, and rapid replies.
          </p>
          <div className="pt-1">
            <a
              href="https://wa.me/919890066580"
              target="_blank"
              rel="noreferrer"
              className="px-5 py-3 rounded-xl bg-[#25D366] text-white font-bold inline-flex items-center gap-2 hover:bg-[#20ba5a] transition-colors"
            >
              <MessageCircle size={16} /> Chat on WhatsApp (+91 98900 66580)
            </a>
          </div>
        </div>
      ),
    },
    {
      id: '03',
      title: 'Official Email & Corporate Booking Requests',
      content: (
        <div className="space-y-4 text-neutral-300 text-sm md:text-base leading-relaxed">
          <p>
            Send corporate bus charter requests, invoice inquiries, or formal feedback to our central office desk.
          </p>
          <div className="pt-1">
            <a
              href="mailto:udaytravels6787@gmail.com"
              className="px-5 py-3 rounded-xl border border-white/15 bg-white/[0.04] text-white font-bold inline-flex items-center gap-2 hover:bg-white/[0.08] transition-colors"
            >
              <Mail size={15} className="text-[#F8B018]" /> udaytravels6787@gmail.com
            </a>
          </div>
        </div>
      ),
    },
    {
      id: '04',
      title: 'Head Office & Operating Counter (Ahilyanagar)',
      content: (
        <div className="space-y-4 text-neutral-300 text-sm md:text-base leading-relaxed">
          <p className="font-medium text-white">
            Shop no. 13, Santachaya Apartment,<br />
            Opposite Kohinoor Maangal Karyalaya,<br />
            Gulmohar Road, Savedi, Ahilyanagar,<br />
            Maharashtra 414003
          </p>
          <div className="flex items-center gap-2 text-xs text-neutral-400 pt-1">
            <Clock size={14} className="text-[#F8B018]" /> Counter operating hours: Daily 05:00 AM – 10:30 PM
          </div>
          <div className="pt-2">
            <a
              href="https://www.google.com/maps/search/?api=1&query=Shop+no.+13%2C+Santachaya+Apartment%2C+Gulmohar+Road%2C+Savedi%2C+Ahilyanagar%2C+Maharashtra+414003"
              target="_blank"
              rel="noreferrer"
              className="text-xs font-bold text-[#F8B018] hover:text-[#ffb020] underline inline-flex items-center gap-1 transition-colors"
            >
              Open office location in Google Maps <ArrowUpRight size={13} />
            </a>
          </div>
        </div>
      ),
    },
  ]

  return (
    <main className="min-h-screen bg-[#0B0F19] text-white font-jakarta">
      <header className="border-b border-white/10 bg-[#0B0F19]/90 px-5 py-5 md:px-10 flex items-center justify-between sticky top-0 z-30 backdrop-blur-md">
        <Link href="/" className="inline-flex items-center gap-2 text-xs font-semibold text-neutral-400 hover:text-white transition-colors">
          <ArrowLeft size={16} /> Back to home
        </Link>
        <Link href="/" className="inline-flex items-center gap-2.5 group" title="Uday Travels Home">
          <span className="brand-logo-mark w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-[#F8B018] text-[#0B0F19] font-black flex items-center justify-center text-[11px] sm:text-xs tracking-wider shadow-md shadow-[#F8B018]/25 transition-transform group-hover:scale-105 shrink-0" style={{ backgroundColor: '#F8B018', color: '#0B0F19', fontWeight: 900 }}>
            UT
          </span>
          <span className="font-mono font-bold tracking-widest text-xs uppercase text-[#F8B018] group-hover:text-white transition-colors">
            CONTACT UDAY TRAVELS
          </span>
        </Link>
      </header>

      <section className="max-w-[1440px] w-full mx-auto px-5 py-12 md:py-20 md:px-10 xl:px-16 space-y-12">
        <div className="border-b border-white/10 pb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <span className="text-xs uppercase tracking-widest text-[#F8B018] font-mono font-bold block mb-2">24/7 Traveller Support</span>
            <h1 className="text-3xl sm:text-4xl md:text-6xl font-black uppercase text-white font-[family-name:var(--font-archivo)] tracking-tight">
              Get in touch
            </h1>
            <p className="text-neutral-400 mt-3 text-sm md:text-base max-w-2xl leading-relaxed">
              Have questions about your bus schedule, pickup point, or booking? Our team is always here to assist you.
            </p>
          </div>
          <Link
            href="/availability"
            className="inline-flex items-center justify-center gap-1.5 px-5 py-3 rounded-xl bg-[#F8B018] text-[#0B0F19] font-bold text-xs hover:bg-[#ffb020] transition-colors shrink-0 shadow-md self-start md:self-auto"
          >
            Check Bus Availability <ArrowUpRight size={15} />
          </Link>
        </div>

        {/* Minimalist Dark Accordion List */}
        <div className="border-t border-white/10">
          {contacts.map((c) => {
            const isOpen = openContact === c.id
            return (
              <div key={c.id} className="border-b border-white/10 transition-colors">
                <button
                  type="button"
                  onClick={() => toggleContact(c.id)}
                  className="w-full py-5 md:py-6 flex items-center justify-between text-left group cursor-pointer select-none transition-colors"
                  aria-expanded={isOpen}
                >
                  <div className="flex items-center gap-4 sm:gap-6 min-w-0 pr-4">
                    <span className={`font-mono text-xs sm:text-sm font-semibold transition-colors shrink-0 ${
                      isOpen ? 'text-[#F8B018] font-bold' : 'text-white/40 group-hover:text-white/80'
                    }`}>
                      {c.id}
                    </span>
                    <span className={`text-base sm:text-lg md:text-xl font-bold tracking-tight truncate transition-colors ${
                      isOpen ? 'text-white' : 'text-neutral-300 group-hover:text-white'
                    }`}>
                      {c.title}
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
                      {c.content}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div>
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#F8B018] block mb-1">Need a ride today?</span>
            <strong className="text-white text-lg sm:text-xl font-bold block">Ahilyanagar ↔ Pune Express Coaches</strong>
            <span className="text-xs text-neutral-400">Scheduled departures throughout the morning, afternoon, and evening.</span>
          </div>
          <Link
            href="/availability"
            className="inline-flex items-center justify-center gap-1.5 px-5 py-3 rounded-xl bg-[#F8B018] text-[#0B0F19] font-bold text-xs hover:bg-[#ffb020] transition-colors shrink-0 shadow-md"
          >
            Check Bus Availability <ArrowUpRight size={14} />
          </Link>
        </div>

        <div className="pt-8 border-t border-white/10 flex items-center justify-between text-xs text-neutral-400">
          <div className="flex items-center gap-2.5">
            <span className="w-5 h-5 bg-[#F8B018] text-[#0B0F19] font-black rounded flex items-center justify-center text-[10px]">UT</span>
            <span>Uday Travels © 2026. All rights reserved.</span>
          </div>
          <Link href="/" className="text-neutral-400 hover:text-white transition-colors">
            Back to home →
          </Link>
        </div>
      </section>
    </main>
  )
}
