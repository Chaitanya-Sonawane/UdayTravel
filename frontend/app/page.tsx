'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowUpRight, CircleHelp, Menu, X, BusFront, Ticket, UserRound } from 'lucide-react'
import { subscribeToAuth } from '@/lib/auth/client-auth'
import { User } from 'firebase/auth'
import AboutSection from '@/components/about-section'
import ContactSection from '@/components/contact-section'
import PolicySection from '@/components/policy-section'

const heroImage =
  'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Purple%20Coach%20on%20a%20Scenic%20Mountain%20Highway-TSaeVT07TMIavvjQrPeiy7sFnyQTFD.png'

export default function Page() {
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)
  const [currentUser, setCurrentUser] = useState<User | null>(null)

  useEffect(() => {
    const unsub = subscribeToAuth((user) => {
      setCurrentUser(user)
    })
    return () => unsub()
  }, [])

  const handleFindJourney = (e: React.MouseEvent) => {
    e.preventDefault()
    if (currentUser && !currentUser.isAnonymous) {
      router.push('/availability')
    } else {
      router.push('/account?mode=register&redirect=/availability')
    }
  }

  useEffect(() => {
    const elements = document.querySelectorAll<HTMLElement>('.scroll-reveal')
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible')
          observer.unobserve(entry.target)
        }
      })
    }, { threshold: 0.16, rootMargin: '0px 0px -8% 0px' })
    elements.forEach((element) => observer.observe(element))
    return () => observer.disconnect()
  }, [])

  return (
    <main className="min-h-screen bg-[#0B0F19] text-white">

      <section id="top" className="hero-section relative isolate min-h-[760px] overflow-hidden lg:min-h-[860px]">
        <img src={heroImage} alt="Aerial view of a purple coach travelling through a green mountain road" className="hero-image absolute inset-0 h-full w-full object-cover object-center" />
        <div className="hero-black-fade absolute inset-0 bg-black/40" />
        <header className="home-header absolute inset-x-0 top-0 z-20 flex items-center justify-between px-5 py-5 md:px-10 xl:px-16">
          <a href="/" aria-label="Uday Travels home" className="home-brand"><span className="home-brand-mark" aria-hidden="true">UT</span><span className="home-brand-name">UDAY TRAVELS</span></a>
          <nav className="hidden items-center gap-8 text-xs uppercase tracking-[0.16em] text-white/75 md:flex" aria-label="Primary navigation">
            <a href="/availability" className="transition-colors hover:text-white">Book a seat</a>
            <a href="/bookings" className="transition-colors hover:text-white">Bookings</a>
            <a href="/help" className="transition-colors hover:text-white">Help</a>
            <a href="/account" className="transition-colors hover:text-white">Account</a>
          </nav>
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            className="flex items-center justify-center w-11 h-11 border border-white/20 rounded-lg bg-black/40 backdrop-blur-md text-white hover:text-[#F8B018] hover:border-[#F8B018]/50 transition-all md:hidden"
            aria-label="Open navigation menu"
          >
            <Menu size={22} />
          </button>
        </header>

        {/* Mobile Hamburger Navigation Drawer */}
        {menuOpen && (
          <div
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex justify-end"
            onClick={() => setMenuOpen(false)}
          >
            <aside
              className="w-full max-w-xs bg-[#0F1420] border-l border-white/10 h-full p-6 flex flex-col justify-between shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div>
                <div className="flex items-center justify-between pb-6 border-b border-white/10">
                  <div className="flex items-center gap-2.5">
                    <span className="w-8 h-8 border-2 border-[#F8B018] text-[#F8B018] font-black flex items-center justify-center text-xs">UT</span>
                    <strong className="tracking-widest font-bold text-sm text-white">UDAY TRAVELS</strong>
                  </div>
                  <button
                    onClick={() => setMenuOpen(false)}
                    className="p-2 text-white/70 hover:text-white rounded-md hover:bg-white/10 transition-colors"
                    aria-label="Close menu"
                  >
                    <X size={20} />
                  </button>
                </div>

                <nav className="flex flex-col space-y-2.5 mt-6" aria-label="Mobile navigation">
                  <Link
                    href="/availability"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center justify-between p-3.5 rounded-lg text-sm font-semibold bg-[#F8B018] text-[#0B0F19] hover:bg-[#F8B018]/90 transition-colors"
                  >
                    <span className="flex items-center gap-3">
                      <BusFront size={18} />
                      Book a seat
                    </span>
                    <ArrowUpRight size={16} />
                  </Link>

                  <Link
                    href="/bookings"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center justify-between p-3.5 rounded-lg text-sm text-white/85 hover:text-white hover:bg-white/[0.06] transition-colors"
                  >
                    <span className="flex items-center gap-3">
                      <Ticket size={18} className="text-[#F8B018]" />
                      My Bookings
                    </span>
                  </Link>

                  <Link
                    href="/help"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center justify-between p-3.5 rounded-lg text-sm text-white/85 hover:text-white hover:bg-white/[0.06] transition-colors"
                  >
                    <span className="flex items-center gap-3">
                      <CircleHelp size={18} className="text-[#F8B018]" />
                      Help Center
                    </span>
                  </Link>

                  <Link
                    href="/account"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center justify-between p-3.5 rounded-lg text-sm text-white/85 hover:text-white hover:bg-white/[0.06] transition-colors"
                  >
                    <span className="flex items-center gap-3">
                      <UserRound size={18} className="text-[#F8B018]" />
                      Account & Profile
                    </span>
                  </Link>
                </nav>
              </div>

              <div className="pt-6 border-t border-white/10">
                <p className="text-[11px] font-semibold tracking-wider text-white/50 uppercase">Pune ↔ Ahilyanagar</p>
                <p className="text-xs text-white/70 mt-1">Daily departures · Clean & reliable</p>
                <a
                  href="tel:+919890066580"
                  className="mt-3 block text-xs text-[#F8B018] font-bold hover:underline"
                >
                  Call +91 98900 66580
                </a>
              </div>
            </aside>
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 h-52 bg-gradient-to-t from-[#0B0F19] to-transparent" />

        <div className="hero-content relative mx-auto flex min-h-[760px] max-w-[1440px] items-end px-5 pb-14 pt-32 md:px-10 md:pb-20 md:pt-40 xl:min-h-[860px] xl:px-16">
          <div className="grid w-full grid-cols-1 gap-12 lg:grid-cols-12 lg:items-end">
            <div className="lg:col-span-8">
              <p className="hero-kicker mb-7 flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#F8B018]"><span className="h-px w-9 bg-[#F8B018]" /> Pune → Ahilyanagar</p>
              <h1 className="hero-title max-w-4xl font-[family-name:var(--font-tektur)] text-[clamp(3.9rem,9vw,9.2rem)] font-black uppercase leading-[.82] tracking-[-.07em]">Make the<br /><span className="hero-accent-text text-[#F8B018]">road yours.</span></h1>
              <p className="hero-description mt-8 max-w-md text-base leading-7 text-white/70 md:text-lg">A better way across Maharashtra. Thoughtfully timed, quietly comfortable, always moving.</p>
              <button
                type="button"
                onClick={handleFindJourney}
                className="hero-cta mt-9 inline-flex h-14 items-center gap-9 bg-[#F8B018] px-6 text-sm font-bold text-[#0B0F19] transition-transform hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-[#0B0F19] cursor-pointer"
              >
                Find your journey <ArrowUpRight size={19} />
              </button>
            </div>

          </div>
        </div>
        <div className="absolute bottom-8 right-5 hidden items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-white/50 md:flex xl:right-16"><CircleHelp size={14} /> Need a hand?</div>
      </section>

      <section id="book" className="brand-band scroll-reveal border-t border-white/10 bg-[#11151F] px-5 py-14 sm:py-16 md:px-10 xl:px-16" aria-label="Uday Travels brand statement">
        <div className="brand-marquee" aria-hidden="true"><span>UDAY TRAVELS</span><span>UDAY TRAVELS</span><span>UDAY TRAVELS</span><span>UDAY TRAVELS</span></div>
        <p className="brand-caption">A better way across Maharashtra</p>
      </section>

      <AboutSection />
      <PolicySection />
      <ContactSection />
    </main>
  )
}

