'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  ArrowUpRight,
  Bus,
  CheckCircle2,
  Shield,
  Users,
  MapPin,
  Clock,
  Phone,
  Mail,
  Receipt,
  RotateCcw,
} from 'lucide-react'
import { subscribeToAuth, hasDeviceAccount, markDeviceAccountCreated, isUserLoggedIn } from '@/lib/auth/client-auth'
import { User } from 'firebase/auth'
import DotMatrixFooter from '@/components/footer/DotMatrixFooter'

export default function AboutPage() {
  const router = useRouter()
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [deviceHasAccount, setDeviceHasAccount] = useState(false)
  const [openSection, setOpenSection] = useState<string | null>('01')

  const toggleSection = (id: string) => {
    setOpenSection((prev) => (prev === id ? null : id))
  }

  const sections = [
    {
      id: '01',
      title: 'About us',
      subtitle: 'Commitment & Highway Express Service',
      content: (
        <div className="space-y-5 text-neutral-300 text-sm md:text-base leading-relaxed">
          <div className="text-white/95 text-base md:text-lg leading-relaxed space-y-3">
            <p>
              Uday Travels is a reliable bus transportation service connecting <strong className="text-white font-bold">Ahilyanagar and Pune</strong>. We provide affordable, punctual, and comfortable travel for students, professionals, families, and daily commuters.
            </p>
            <p>
              Our services operate with a simple and transparent <strong className="text-[#F8B018] font-bold">flat fare of ₹200 per seat</strong>. We use a modern <strong className="text-white font-bold">digital booking and travel management platform</strong> to simplify the entire journey.
            </p>
            <p>
              Passengers can select seats, book tickets, make secure online payments, and receive <strong className="text-white font-bold">QR tickets via WhatsApp and SMS</strong>. Our system also manages family seating and passenger safety preferences during booking.
            </p>
            <p>
              With <strong className="text-white font-bold">real-time GPS bus tracking</strong>, passengers can monitor their bus location and journey progress. By combining reliable transportation with smart digital solutions, Uday Travels delivers a <strong className="text-[#F8B018] font-bold">safer, simpler, and more convenient travel experience</strong>.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
            <div className="bg-white/[0.04] rounded-xl p-4 border border-white/10">
              <span className="text-[11px] font-mono font-bold text-[#F8B018] uppercase tracking-wider block mb-1">Corridor</span>
              <h4 className="text-white font-bold text-sm">Ahilyanagar ⇄ Pune</h4>
              <p className="text-xs text-neutral-400 mt-1">Direct highway connectivity via NH60 with daily scheduled departures.</p>
            </div>

            <div className="bg-white/[0.04] rounded-xl p-4 border border-white/10">
              <span className="text-[11px] font-mono font-bold text-[#F8B018] uppercase tracking-wider block mb-1">Standard Fare</span>
              <h4 className="text-white font-bold text-sm">Flat ₹200 / Seat</h4>
              <p className="text-xs text-neutral-400 mt-1">Honest flat pricing with zero hidden surcharges or peak surges.</p>
            </div>

            <div className="bg-white/[0.04] rounded-xl p-4 border border-white/10">
              <span className="text-[11px] font-mono font-bold text-[#F8B018] uppercase tracking-wider block mb-1">Coach Comfort</span>
              <h4 className="text-white font-bold text-sm">3+2 Pushback Seating</h4>
              <p className="text-xs text-neutral-400 mt-1">Spacious legroom, dedicated seat numbers &amp; sanitized cabins.</p>
            </div>

            <div className="bg-white/[0.04] rounded-xl p-4 border border-white/10">
              <span className="text-[11px] font-mono font-bold text-[#F8B018] uppercase tracking-wider block mb-1">Digital Boarding</span>
              <h4 className="text-white font-bold text-sm">WhatsApp &amp; SMS QR</h4>
              <p className="text-xs text-neutral-400 mt-1">Instant verified mobile ticket pass with live conductor scanning.</p>
            </div>
          </div>
          <p className="text-sm font-semibold text-white/80">
            Uday Travels – Making Every Journey Between Ahilyanagar and Pune Simpler, More Convenient and More Comfortable.
          </p>
        </div>
      ),
    },
    {
      id: '02',
      title: 'Convenient Pick-Up and Drop-Off Locations',
      subtitle: '20 Stops across Ahilyanagar & 12 Stops across Pune',
      content: (
        <div className="space-y-4 text-neutral-300 text-sm md:text-base leading-relaxed">
          <p>
            We understand that convenience begins close to home. That&apos;s why our coaches connect <strong>20 pick-up points across Ahilyanagar</strong>, including Ekvira Chowk, Delhigate, Nepti Naka and Ambika Nagar, with <strong>12 drop-off locations across Pune</strong>, including Wakadewadi, Yerwada, Viman Nagar, Kharadi Bye Pass and Wagholi.
          </p>
          <p className="text-xs md:text-sm text-neutral-400">
            Our extensive route network helps passengers travel closer to their homes, workplaces and destinations.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div className="bg-white/[0.04] rounded-2xl p-5 border border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-white text-sm md:text-base flex items-center gap-2">
                  <MapPin size={16} className="text-[#F8B018]" />
                  20 Pick-Up Locations in Ahilyanagar
                </h4>
                <span className="px-2 py-0.5 rounded-full bg-[#F8B018]/15 text-[#F8B018] text-[10px] font-mono font-bold">20 STOPS</span>
              </div>
              <div className="flex flex-wrap gap-1.5 text-xs">
                {['Ekvira Chowk', 'Delhigate', 'Nepti Naka', 'Ambika Nagar', 'Savedi', 'Maliwada', 'Swastik Chowk', 'Market Yard', 'DSP Chowk', 'Tarakpur', 'Kotla', 'Bhingar'].map((stop) => (
                  <span key={stop} className="px-2.5 py-1 rounded-lg bg-white/[0.05] border border-white/10 text-neutral-200">
                    {stop}
                  </span>
                ))}
                <span className="px-2.5 py-1 rounded-lg bg-[#F8B018]/10 text-[#F8B018] font-bold text-xs">
                  + 8 more pickup stops
                </span>
              </div>
            </div>

            <div className="bg-white/[0.04] rounded-2xl p-5 border border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-white text-sm md:text-base flex items-center gap-2">
                  <MapPin size={16} className="text-[#F8B018]" />
                  12 Drop-Off Locations in Pune
                </h4>
                <span className="px-2 py-0.5 rounded-full bg-[#F8B018]/15 text-[#F8B018] text-[10px] font-mono font-bold">12 STOPS</span>
              </div>
              <div className="flex flex-wrap gap-1.5 text-xs">
                {['Wakadewadi', 'Yerwada', 'Viman Nagar', 'Kharadi Bye Pass', 'Wagholi', 'Chandan Nagar', 'Shastri Nagar', 'Shivajinagar', 'Sangamwadi'].map((stop) => (
                  <span key={stop} className="px-2.5 py-1 rounded-lg bg-white/[0.05] border border-white/10 text-neutral-200">
                    {stop}
                  </span>
                ))}
                <span className="px-2.5 py-1 rounded-lg bg-[#F8B018]/10 text-[#F8B018] font-bold text-xs">
                  + 3 more drop stops
                </span>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: '03',
      title: 'Affordable and Transparent Fares',
      subtitle: 'Flat ₹200 per seat with no hidden surcharges',
      content: (
        <div className="space-y-4 text-neutral-300 text-sm md:text-base leading-relaxed">
          <p className="text-white/90">
            Travel comfortably without stretching your budget. Our 3+2 seating coaches offer a simple, flat fare of ₹200 per seat, with transparent pricing and no unnecessary complications.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <div className="bg-white/[0.04] rounded-xl p-4 border border-white/10">
              <div className="text-2xl font-black text-[#F8B018] font-mono">₹200</div>
              <h4 className="text-white font-bold text-sm mt-1">Simple Flat Fare</h4>
              <p className="text-xs text-neutral-400 mt-1">Predictable pricing for every seat on every scheduled departure.</p>
            </div>

            <div className="bg-white/[0.04] rounded-xl p-4 border border-white/10">
              <div className="text-2xl font-black text-emerald-400 font-mono">0%</div>
              <h4 className="text-white font-bold text-sm mt-1">Zero Surge Pricing</h4>
              <p className="text-xs text-neutral-400 mt-1">No festival markups, rush-hour premiums, or algorithmic price increases.</p>
            </div>

            <div className="bg-white/[0.04] rounded-xl p-4 border border-white/10">
              <div className="text-2xl font-black text-sky-400 font-mono">100%</div>
              <h4 className="text-white font-bold text-sm mt-1">Direct Transparency</h4>
              <p className="text-xs text-neutral-400 mt-1">What you see is exactly what you pay at checkout via Razorpay.</p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: '04',
      title: 'Thoughtful Seating Arrangements',
      subtitle: 'Gender protection, family contiguous seating & live selection',
      content: (
        <div className="space-y-4 text-neutral-300 text-sm md:text-base leading-relaxed">
          <p className="text-white/90">
            Passenger comfort, privacy and convenience are important to us:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="flex items-start gap-3 p-4 rounded-xl bg-white/[0.04] border border-white/10">
              <Shield className="text-[#F8B018] shrink-0 mt-0.5" size={18} />
              <div>
                <strong className="text-white text-sm block">Gender Protection Rules</strong>
                <span className="text-xs text-neutral-400">Women are seated alongside women, and men alongside men. Adjacent seats are automatically restricted for female safety.</span>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 rounded-xl bg-white/[0.04] border border-white/10">
              <Users className="text-[#F8B018] shrink-0 mt-0.5" size={18} />
              <div>
                <strong className="text-white text-sm block">Family Co-Seating Mode</strong>
                <span className="text-xs text-neutral-400">Families can book seats together across continuous rows with grouped passenger details.</span>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 rounded-xl bg-white/[0.04] border border-white/10">
              <CheckCircle2 className="text-[#F8B018] shrink-0 mt-0.5" size={18} />
              <div>
                <strong className="text-white text-sm block">Guaranteed Assigned Seat</strong>
                <span className="text-xs text-neutral-400">Every passenger receives an individual seat number. Passengers select their preferred available seats directly through our website.</span>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 rounded-xl bg-white/[0.04] border border-white/10">
              <Clock className="text-[#F8B018] shrink-0 mt-0.5" size={18} />
              <div>
                <strong className="text-white text-sm block">Temporary Payment Hold</strong>
                <span className="text-xs text-neutral-400">Selected seats are temporarily reserved during payment to ensure your seats are held while completing UPI checkout.</span>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: '05',
      title: 'Seamless Online Booking',
      subtitle: 'Real-time selection, fast checkout & WhatsApp QR e-ticket',
      content: (
        <div className="space-y-4 text-neutral-300 text-sm md:text-base leading-relaxed">
          <p className="text-white/90">
            Browse available buses, select your journey, choose your preferred seats and complete your payment online. Your confirmed ticket is delivered through WhatsApp and SMS with a QR code for boarding verification.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2">
            <div className="p-4 rounded-xl bg-white/[0.04] border border-white/10 text-center">
              <span className="w-8 h-8 rounded-full bg-[#F8B018] text-[#0B0F19] font-black text-xs inline-flex items-center justify-center mb-2">1</span>
              <strong className="text-white text-xs block font-bold">Pick Journey</strong>
              <span className="text-[11px] text-neutral-400">Choose date &amp; route</span>
            </div>

            <div className="p-4 rounded-xl bg-white/[0.04] border border-white/10 text-center">
              <span className="w-8 h-8 rounded-full bg-[#F8B018] text-[#0B0F19] font-black text-xs inline-flex items-center justify-center mb-2">2</span>
              <strong className="text-white text-xs block font-bold">Select Seats</strong>
              <span className="text-[11px] text-neutral-400">Pick preferred seats</span>
            </div>

            <div className="p-4 rounded-xl bg-white/[0.04] border border-white/10 text-center">
              <span className="w-8 h-8 rounded-full bg-[#F8B018] text-[#0B0F19] font-black text-xs inline-flex items-center justify-center mb-2">3</span>
              <strong className="text-white text-xs block font-bold">Fast Payment</strong>
              <span className="text-[11px] text-neutral-400">UPI, cards &amp; wallet</span>
            </div>

            <div className="p-4 rounded-xl bg-white/[0.04] border border-white/10 text-center">
              <span className="w-8 h-8 rounded-full bg-[#F8B018] text-[#0B0F19] font-black text-xs inline-flex items-center justify-center mb-2">4</span>
              <strong className="text-white text-xs block font-bold">Instant Ticket</strong>
              <span className="text-[11px] text-neutral-400">WhatsApp QR e-ticket</span>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: '06',
      title: 'Support When Your Plans Change',
      subtitle: '25% source refund + 75% instant wallet credit',
      content: (
        <div className="space-y-4 text-neutral-300 text-sm md:text-base leading-relaxed">
          <p className="text-white/90">
            Our support team is available for booking queries and cancellations.
          </p>

          <div className="bg-white/[0.04] rounded-2xl p-5 border border-white/10 space-y-3">
            <div className="flex flex-wrap items-center gap-6 font-mono text-xs sm:text-sm">
              <div className="flex items-center gap-2">
                <Phone size={15} className="text-[#F8B018]" />
                <span className="text-neutral-400">Phone:</span>
                <a href="tel:+919890066580" className="text-white font-bold hover:text-[#F8B018] underline">
                  +91 9890066580
                </a>
              </div>
              <div className="flex items-center gap-2">
                <Mail size={15} className="text-[#F8B018]" />
                <span className="text-neutral-400">Email:</span>
                <a href="mailto:udaytravels6787@gmail.com" className="text-white font-bold hover:text-[#F8B018] underline">
                  udaytravels6787@gmail.com
                </a>
              </div>
            </div>

            <div className="pt-3 border-t border-white/10 text-xs sm:text-sm text-neutral-300">
              <span className="font-bold text-[#F8B018] block mb-1">Cancellation Policy:</span>
              As per our cancellation policy, the value of a cancelled ticket is retained as travel credit for your next journey (<strong>25% refund</strong> to source payment method + <strong>75% credited instantly</strong> to your Uday Travels Wallet with zero expiry).
            </div>
          </div>
        </div>
      ),
    },
    {
      id: '07',
      title: 'Travel policies',
      subtitle: 'Terms of service, refund policy & privacy protection',
      content: (
        <div className="space-y-4 text-neutral-300 text-sm md:text-base leading-relaxed">
          <p>
            Review our comprehensive customer guidelines, cancellation terms, and privacy protocols designed to protect your safety and funds.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <Link
              href="/policies#terms"
              className="p-4 rounded-xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] hover:border-[#F8B018]/50 transition-colors block"
            >
              <strong className="text-white text-xs sm:text-sm font-bold block">Terms of Service</strong>
              <span className="text-[11px] text-neutral-400 mt-1 block">Boarding rules, reporting windows &amp; passenger conduct.</span>
            </Link>

            <Link
              href="/policies#cancellation"
              className="p-4 rounded-xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] hover:border-[#F8B018]/50 transition-colors block"
            >
              <strong className="text-white text-xs sm:text-sm font-bold block">Cancellation &amp; Refund</strong>
              <span className="text-[11px] text-neutral-400 mt-1 block">25% original source refund + 75% instant wallet credit.</span>
            </Link>

            <Link
              href="/policies#privacy"
              className="p-4 rounded-xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] hover:border-[#F8B018]/50 transition-colors block"
            >
              <strong className="text-white text-xs sm:text-sm font-bold block">Privacy Policy</strong>
              <span className="text-[11px] text-neutral-400 mt-1 block">Encrypted data handling, SMS &amp; WhatsApp communication rules.</span>
            </Link>
          </div>
        </div>
      ),
    },
    {
      id: '08',
      title: 'Contact us',
      subtitle: 'Operating office in Savedi, Ahilyanagar & 24/7 helpline',
      content: (
        <div className="space-y-4 text-neutral-300 text-sm md:text-base leading-relaxed">
          <div className="bg-white/[0.04] rounded-2xl p-5 border border-white/10 space-y-3">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#F8B018] block mb-1">Office Address</span>
              <p className="text-white font-medium text-xs md:text-sm">
                Shop no. 13, Santachaya Apartment,<br />
                Opposite Kohinoor Maangal Karyalaya,<br />
                Gulmohar Road, Savedi, Ahilyanagar,<br />
                Maharashtra 414003
              </p>
            </div>

            <div className="pt-3 border-t border-white/10 flex flex-wrap gap-6 font-mono text-xs md:text-sm">
              <div>
                <span className="text-[10px] font-bold uppercase text-neutral-400 block font-sans">Helpline</span>
                <a href="tel:+919890066580" className="font-bold text-white hover:text-[#F8B018] underline">
                  +91 98900 66580
                </a>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase text-neutral-400 block font-sans">Email</span>
                <a href="mailto:udaytravels6787@gmail.com" className="font-bold text-white hover:text-[#F8B018] underline">
                  udaytravels6787@gmail.com
                </a>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 pt-1 text-xs font-bold">
            <a
              href="https://www.google.com/maps/search/?api=1&query=Shop+no.+13%2C+Santachaya+Apartment%2C+Gulmohar+Road%2C+Savedi%2C+Ahilyanagar%2C+Maharashtra+414003"
              target="_blank"
              rel="noreferrer"
              className="text-[#F8B018] hover:text-[#ffb020] inline-flex items-center gap-1 transition-colors"
            >
              Open office in Google Maps <ArrowUpRight size={13} />
            </a>
            <a
              href="mailto:udaytravels6787@gmail.com"
              className="text-neutral-300 hover:text-white transition-colors"
            >
              Mail to our support team →
            </a>
          </div>
        </div>
      ),
    },
  ]

  useEffect(() => {
    setDeviceHasAccount(hasDeviceAccount())
    const unsub = subscribeToAuth((user) => {
      setCurrentUser(user)
      if (user && !user.isAnonymous) {
        markDeviceAccountCreated()
        setDeviceHasAccount(true)
      }
    })
    return () => unsub()
  }, [])

  const handleFindJourney = (e: React.MouseEvent) => {
    e.preventDefault()
    if ((currentUser && !currentUser.isAnonymous) || isUserLoggedIn(currentUser)) {
      router.push('/availability')
    } else {
      router.push('/account?mode=register&redirect=/availability')
    }
  }

  return (
    <main className="min-h-screen bg-[#0B0F19] text-white font-jakarta">
      {/* Header */}
      <header className="border-b border-white/10 bg-[#0B0F19]/90 px-5 py-5 md:px-10 flex items-center justify-between sticky top-0 z-30 backdrop-blur-md">
        <Link href="/" className="inline-flex items-center gap-2 text-xs font-semibold text-neutral-400 hover:text-white transition-colors">
          <ArrowLeft size={16} /> Back to home
        </Link>
        <Link href="/" className="inline-flex items-center gap-2.5 group" title="Uday Travels Home">
          <span className="brand-logo-mark w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-[#F8B018] text-[#0B0F19] font-black flex items-center justify-center text-[11px] sm:text-xs tracking-wider shadow-md shadow-[#F8B018]/25 transition-transform group-hover:scale-105 shrink-0" style={{ backgroundColor: '#F8B018', color: '#0B0F19', fontWeight: 900 }}>
            UT
          </span>
          <span className="font-mono font-bold tracking-widest text-xs uppercase text-[#F8B018] group-hover:text-white transition-colors">
            ABOUT UDAY TRAVELS
          </span>
        </Link>
      </header>

      {/* Main Section */}
      <section className="max-w-[1440px] w-full mx-auto px-5 py-12 md:py-20 md:px-10 xl:px-16 space-y-12">
        <div className="border-b border-white/10 pb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <span className="text-xs uppercase tracking-widest text-[#F8B018] font-mono font-bold block mb-2">
              Reliable Intercity Travel
            </span>
            <h1 className="text-3xl sm:text-4xl md:text-6xl font-black uppercase text-white font-[family-name:var(--font-archivo)] tracking-tight">
              About Uday Travels
            </h1>
            <p className="text-neutral-400 mt-3 text-sm md:text-base leading-relaxed max-w-2xl">
              Thoughtfully timed, quietly comfortable, and always moving. Uday Travels is Maharashtra&apos;s trusted coach service connecting Ahilyanagar and Pune.
            </p>
          </div>
          <button
            type="button"
            onClick={handleFindJourney}
            className="inline-flex items-center gap-2 bg-[#F8B018] text-[#0B0F19] text-xs font-bold px-5 py-3 rounded-xl hover:bg-[#ffb020] transition-colors cursor-pointer shadow-md shrink-0 self-start md:self-auto"
          >
            Find your journey <ArrowUpRight size={15} />
          </button>
        </div>

        {/* Minimalist Dark Accordion List (Full Width 01..08) */}
        <div className="border-t border-white/10">
          {sections.map((s) => {
            const isOpen = openSection === s.id
            return (
              <div key={s.id} className="border-b border-white/10 transition-colors">
                <button
                  type="button"
                  onClick={() => toggleSection(s.id)}
                  className="w-full py-5 md:py-6 flex items-center justify-between text-left group cursor-pointer select-none transition-colors"
                  aria-expanded={isOpen}
                >
                  <div className="flex items-center gap-4 sm:gap-6 min-w-0 pr-4">
                    <span className={`font-mono text-xs sm:text-sm font-semibold transition-colors shrink-0 ${
                      isOpen ? 'text-[#F8B018] font-bold' : 'text-white/40 group-hover:text-white/80'
                    }`}>
                      {s.id}
                    </span>
                    <span className={`text-base sm:text-lg md:text-xl font-bold tracking-tight truncate transition-colors ${
                      isOpen ? 'text-white' : 'text-neutral-300 group-hover:text-white'
                    }`}>
                      {s.title}
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
                      {s.content}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Our Commitment Card */}
        <article className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 sm:p-8 space-y-4 text-sm text-neutral-300 leading-relaxed">
          <h2 className="text-base sm:text-lg font-bold uppercase text-white font-[family-name:var(--font-archivo)]">
            Our Commitment to Maharashtra Travellers
          </h2>
          <p>
            Whether you are a student travelling between colleges, a professional commuting for work, or a family visiting relatives, Uday Travels ensures punctual departures, clean interiors, and straightforward transparent pricing without hidden surcharges.
          </p>
          <p>
            With digital seat reservations, live Firestore seat synchronization, and instant WhatsApp boarding passes, our mission is to make road travel across Maharashtra hassle-free and dependable.
          </p>
        </article>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between text-xs text-neutral-400 gap-4">
          <div className="flex items-center gap-2.5">
            <span className="w-5 h-5 bg-[#F8B018] text-[#0B0F19] font-black rounded flex items-center justify-center text-[10px]">UT</span>
            <span>Uday Travels © 2026. All rights reserved.</span>
          </div>
          <button
            type="button"
            onClick={handleFindJourney}
            className="inline-flex items-center gap-2 bg-[#F8B018] text-[#0B0F19] text-xs font-bold px-5 py-3 rounded-xl hover:bg-[#ffb020] transition-colors cursor-pointer shadow-md"
          >
            Find your journey <ArrowUpRight size={15} />
          </button>
        </div>
      </section>

      {/* DIRECT AT THE VERY LAST - LED DOT MATRIX FOOTER ("UDAY TRAVELS") */}
      <DotMatrixFooter />
    </main>
  )
}
