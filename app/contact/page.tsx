'use client'

import Link from 'next/link'
import { ArrowLeft, Phone, Mail, MessageCircle, MapPin, Clock } from 'lucide-react'

export default function ContactPage() {
  return (
    <main className="min-h-screen bg-[#0B0F19] text-white">
      <header className="border-b border-white/10 px-5 py-5 md:px-10 flex items-center justify-between">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-white/70 hover:text-white transition-colors">
          <ArrowLeft size={18} /> Back to home
        </Link>
        <span className="font-bold tracking-widest text-[#F8B018]">CONTACT UDAY TRAVELS</span>
      </header>

      <section className="max-w-3xl mx-auto px-5 py-12 md:py-16 space-y-10">
        <div>
          <span className="text-xs uppercase tracking-widest text-[#F8B018] font-semibold">24/7 Traveller Support</span>
          <h1 className="text-3xl md:text-5xl font-black uppercase mt-2">Get in touch</h1>
          <p className="text-white/60 mt-3 text-sm md:text-base">
            Have questions about your bus schedule, pickup point, or booking? Our team is always here to assist you.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <a
            href="tel:+919890066580"
            className="border border-white/10 rounded-lg p-5 bg-white/[0.02] hover:border-[#F8B018] transition-colors flex flex-col justify-between"
          >
            <div className="flex items-center justify-between mb-4">
              <Phone className="text-[#F8B018]" size={24} />
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">24/7 Available</span>
            </div>
            <div>
              <strong className="block text-white text-base">Call Support</strong>
              <span className="text-sm text-white/70 mt-1 block font-mono">+91 98900 66580</span>
            </div>
          </a>

          <a
            href="https://wa.me/919890066580"
            target="_blank"
            rel="noreferrer"
            className="border border-white/10 rounded-lg p-5 bg-white/[0.02] hover:border-[#F8B018] transition-colors flex flex-col justify-between"
          >
            <div className="flex items-center justify-between mb-4">
              <MessageCircle className="text-emerald-400" size={24} />
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Instant Chat</span>
            </div>
            <div>
              <strong className="block text-white text-base">WhatsApp Help</strong>
              <span className="text-sm text-white/70 mt-1 block">Chat with support team</span>
            </div>
          </a>

          <a
            href="mailto:support@udaytravel.in"
            className="border border-white/10 rounded-lg p-5 bg-white/[0.02] hover:border-[#F8B018] transition-colors flex flex-col justify-between"
          >
            <div className="flex items-center justify-between mb-4">
              <Mail className="text-[#F8B018]" size={24} />
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-white/10 text-white/70">Email</span>
            </div>
            <div>
              <strong className="block text-white text-base">Email Queries</strong>
              <span className="text-sm text-white/70 mt-1 block truncate">support@udaytravel.in</span>
            </div>
          </a>
        </div>

        <div className="border border-white/10 rounded-lg p-6 bg-white/[0.02] space-y-6">
          <h2 className="text-xl font-bold uppercase tracking-wider flex items-center gap-2">
            <MapPin className="text-[#F8B018]" size={20} />
            Operating Offices
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            <div>
              <span className="text-xs font-semibold text-[#F8B018] uppercase tracking-wider">Ahilyanagar (Ahmednagar) Hub</span>
              <p className="text-sm text-white/80 mt-1.5 leading-relaxed">
                Office No. 4, Nepti Naka Chowk, Near Ekvira Chowk, Ahilyanagar, Maharashtra 414001
              </p>
              <div className="flex items-center gap-2 text-xs text-white/50 mt-2">
                <Clock size={13} /> Open daily 05:00 AM – 10:00 PM
              </div>
            </div>

            <div>
              <span className="text-xs font-semibold text-[#F8B018] uppercase tracking-wider">Pune Operating Desk</span>
              <p className="text-sm text-white/80 mt-1.5 leading-relaxed">
                Opposite Wakadewadi ST Bus Stand, Old Mumbai-Pune Highway, Wakadewadi, Pune, Maharashtra 411005
              </p>
              <div className="flex items-center gap-2 text-xs text-white/50 mt-2">
                <Clock size={13} /> Open daily 06:00 AM – 11:00 PM
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
