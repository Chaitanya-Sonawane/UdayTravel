'use client'

import { useEffect, useState, type ReactNode } from 'react'
import Link from 'next/link'
import {
  ArrowUpRight,
  CircleHelp,
  Menu,
  X,
  UserRound,
  FileText,
  PhoneCall,
  Info,
  LogOut,
  CheckCircle2,
} from 'lucide-react'
import { subscribeToAuth, signOutUser, fetchCurrentProfile } from '@/lib/auth/client-auth'
import { User } from 'firebase/auth'

const heroImage =
  'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Purple%20Coach%20on%20a%20Scenic%20Mountain%20Highway-TSaeVT07TMIavvjQrPeiy7sFnyQTFD.png'

function FooterColumn({ title, children }: { title: string; children: ReactNode }) {
  return <section className="footer-column group scroll-reveal" aria-labelledby={`footer-${title.toLowerCase().replace(/\\s+/g, '-')}`}>
    <h2 id={`footer-${title.toLowerCase().replace(/\\s+/g, '-')}`} className="footer-heading">{title}</h2>
    <div className="mt-5 flex flex-col gap-4 text-lg leading-8 text-white/70">{children}</div>
  </section>
}

export default function Page() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [userName, setUserName] = useState<string>('')

  useEffect(() => {
    const unsubscribe = subscribeToAuth(async (user) => {
      // Ignore anonymous sessions for "logged in" display
      if (user && !user.isAnonymous) {
        setCurrentUser(user)
        try {
          const { profile } = await fetchCurrentProfile()
          if (profile?.name) setUserName(profile.name)
        } catch {}
      } else {
        setCurrentUser(null)
        setUserName('')
      }
    })
    return () => unsubscribe()
  }, [])

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

  const handleLogout = async () => {
    await signOutUser()
    setCurrentUser(null)
    setUserName('')
    setMenuOpen(false)
  }

  return (
    <main className="min-h-screen bg-[#0B0F19] text-white">

      <section id="top" className="hero-section relative isolate min-h-[760px] overflow-hidden lg:min-h-[860px]">
        <img src={heroImage} alt="Aerial view of a purple coach travelling through a green mountain road" className="hero-image absolute inset-0 h-full w-full object-cover object-center" />
        <div className="hero-black-fade absolute inset-0 bg-black/40" />
        <header className="home-header absolute inset-x-0 top-0 z-20 flex items-center justify-between px-5 py-5 md:px-10 xl:px-16">
          <a href="/" aria-label="Uday Travels home" className="home-brand"><span className="home-brand-mark" aria-hidden="true">UT</span><span className="home-brand-name">UDAY TRAVELS</span></a>
          <nav className="hidden items-center gap-8 text-xs uppercase tracking-[0.16em] text-white/75 md:flex" aria-label="Primary navigation">
            <a href="/availability" className="transition-colors hover:text-white">Book a seat</a>
            <a href="/about" className="transition-colors hover:text-white">About Us</a>
            <a href="/policies" className="transition-colors hover:text-white">Policies</a>
            <a href="/contact" className="transition-colors hover:text-white">Contact Us</a>
            <a href="/account" className="transition-colors hover:text-white flex items-center gap-1.5 text-[#FF9D00] font-semibold">
              <UserRound size={14} />
              {currentUser ? (userName || 'My Account') : 'Create Account'}
            </a>
            {currentUser && (
              <button
                onClick={handleLogout}
                className="text-white/60 hover:text-white text-xs uppercase tracking-[0.16em] transition-colors"
              >
                Logout
              </button>
            )}
          </nav>

          {/* Mobile Hamburger Menu Trigger (Replaced BOOK button) */}
          <button
            onClick={() => setMenuOpen(true)}
            className="flex items-center justify-center w-11 h-11 border border-white/20 rounded-md bg-black/40 backdrop-blur-md text-white hover:text-[#FF9D00] hover:border-[#FF9D00]/50 transition-all md:hidden"
            aria-label="Open navigation menu"
          >
            <Menu size={22} />
          </button>
        </header>

        {/* Mobile Hamburger Menu Drawer */}
        {menuOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex justify-end" onClick={() => setMenuOpen(false)}>
            <aside
              className="w-full max-w-xs bg-[#0F1420] border-l border-white/10 h-full p-6 flex flex-col justify-between"
              onClick={(e) => e.stopPropagation()}
            >
              <div>
                <div className="flex items-center justify-between pb-6 border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 bg-[#FF9D00] text-[#0B0F19] font-black flex items-center justify-center text-xs">UT</span>
                    <strong className="tracking-widest font-black text-sm">UDAY TRAVELS</strong>
                  </div>
                  <button
                    onClick={() => setMenuOpen(false)}
                    className="p-2 text-white/70 hover:text-white"
                    aria-label="Close menu"
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* User Status Greeting */}
                <div className="mt-6 mb-6 p-4 rounded-lg bg-white/[0.03] border border-white/10">
                  {currentUser ? (
                    <div>
                      <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
                        <CheckCircle2 size={14} />
                        <span>Signed in</span>
                      </div>
                      <p className="text-sm font-bold text-white mt-1 truncate">
                        {userName || currentUser.email || 'Passenger'}
                      </p>
                    </div>
                  ) : (
                    <div>
                      <span className="text-xs text-[#FF9D00] uppercase font-semibold tracking-wider">Welcome</span>
                      <p className="text-xs text-white/60 mt-1">Sign in or create an account for fast booking.</p>
                    </div>
                  )}
                </div>

                {/* Nav Links */}
                <nav className="flex flex-col space-y-2">
                  <Link
                    href="/account"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center justify-between p-3.5 rounded-lg text-sm font-semibold bg-[#FF9D00]/10 text-[#FF9D00] border border-[#FF9D00]/20 hover:bg-[#FF9D00]/20 transition-colors"
                  >
                    <span className="flex items-center gap-3">
                      <UserRound size={18} />
                      {currentUser ? 'My Account' : 'Create Account / Log In'}
                    </span>
                    <ArrowUpRight size={16} />
                  </Link>

                  <Link
                    href="/availability"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-3 p-3.5 rounded-lg text-sm text-white/80 hover:text-white hover:bg-white/[0.04] transition-colors"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-[#FF9D00]" />
                    Book a Journey
                  </Link>

                  <Link
                    href="/about"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-3 p-3.5 rounded-lg text-sm text-white/80 hover:text-white hover:bg-white/[0.04] transition-colors"
                  >
                    <Info size={17} className="text-white/50" />
                    About Us
                  </Link>

                  <Link
                    href="/policies"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-3 p-3.5 rounded-lg text-sm text-white/80 hover:text-white hover:bg-white/[0.04] transition-colors"
                  >
                    <FileText size={17} className="text-white/50" />
                    Policies
                  </Link>

                  <Link
                    href="/contact"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-3 p-3.5 rounded-lg text-sm text-white/80 hover:text-white hover:bg-white/[0.04] transition-colors"
                  >
                    <PhoneCall size={17} className="text-white/50" />
                    Contact Us
                  </Link>
                </nav>
              </div>

              {/* Bottom section with Logout when logged in */}
              <div className="pt-6 border-t border-white/10">
                {currentUser ? (
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center justify-center gap-2 p-3 rounded-lg text-sm font-bold text-red-400 bg-red-500/10 hover:bg-red-500/20 transition-colors"
                  >
                    <LogOut size={16} /> Logout
                  </button>
                ) : (
                  <p className="text-center text-xs text-white/40">
                    Ahilyanagar ↔ Pune Express
                  </p>
                )}
              </div>
            </aside>
          </div>
        )}

        <div className="absolute inset-x-0 bottom-0 h-52 bg-gradient-to-t from-[#0B0F19] to-transparent" />

        <div className="hero-content relative mx-auto flex min-h-[760px] max-w-[1440px] items-end px-5 pb-14 pt-32 md:px-10 md:pb-20 md:pt-40 xl:min-h-[860px] xl:px-16">
          <div className="grid w-full grid-cols-1 gap-12 lg:grid-cols-12 lg:items-end">
            <div className="lg:col-span-8">
              <p className="mb-7 flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#FF9D00]"><span className="h-px w-9 bg-[#FF9D00]" /> Pune → Ahilyanagar</p>
              <h1 className="hero-title max-w-4xl font-[family-name:var(--font-archivo)] text-[clamp(3.9rem,9vw,9.2rem)] font-black uppercase leading-[.82] tracking-[-.07em]">Make the<br /><span className="text-[#FF9D00]">road yours.</span></h1>
              <p className="mt-8 max-w-md text-base leading-7 text-white/70 md:text-lg">A better way across Maharashtra. Thoughtfully timed, quietly comfortable, always moving.</p>
              <a href="/availability" className="mt-9 inline-flex h-14 items-center gap-9 bg-[#FF9D00] px-6 text-sm font-bold text-[#0B0F19] transition-transform hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-[#0B0F19]">Find your journey <ArrowUpRight size={19} /></a>
            </div>

          </div>
        </div>
        <div className="absolute bottom-8 right-5 hidden items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-white/50 md:flex xl:right-16"><CircleHelp size={14} /> Need a hand?</div>
      </section>

      <section id="book" className="brand-band scroll-reveal border-t border-white/10 bg-[#11151F] px-5 py-14 sm:py-16 md:px-10 xl:px-16" aria-label="Uday Travels brand statement">
        <div className="brand-marquee" aria-hidden="true"><span>UDAY TRAVELS</span><span>UDAY TRAVELS</span></div>
        <p className="brand-caption">A better way across Maharashtra</p>
      </section>

      <footer className="border-t border-white/10 bg-[#0B0F19] px-5 py-12 md:px-10 md:py-16 xl:px-16">
        <div className="mx-auto grid max-w-[760px] grid-cols-1 gap-12">
          <FooterColumn title="About us">
            <div className="about-content space-y-6">
              <p>Uday Travels is committed to providing reliable, convenient and affordable bus transportation between Ahilyanagar and Pune. We serve students, working professionals, families and business travellers with a focus on comfort, accessibility and a hassle-free travel experience.</p>
              <div>
                <h3 className="mb-2 font-semibold text-white">Convenient Pick-Up and Drop-Off Locations</h3>
                <p>We understand that convenience begins close to home. That&apos;s why our coaches connect 20 pick-up points across Ahilyanagar, including Ekvira Chowk, Delhigate, Nepti Naka and Ambika Nagar, with 12 drop-off locations across Pune, including Wakadewadi, Yerwada, Viman Nagar, Kharadi Bye Pass and Wagholi.</p>
                <p className="mt-2">Our extensive route network helps passengers travel closer to their homes, workplaces and destinations.</p>
              </div>
              <div>
                <h3 className="mb-2 font-semibold text-white">Affordable and Transparent Fares</h3>
                <p>Travel comfortably without stretching your budget. Our 3+2 seating coaches offer a simple, flat fare of ₹200 per seat, with transparent pricing and no unnecessary complications.</p>
              </div>
              <div>
                <h3 className="mb-2 font-semibold text-white">Thoughtful Seating Arrangements</h3>
                <p>Passenger comfort, privacy and convenience are important to us:</p>
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  <li>Women are seated alongside women, and men alongside men.</li>
                  <li>Families can book seats together.</li>
                  <li>Every passenger receives an individual seat number.</li>
                  <li>Passengers can select their preferred available seats directly through our website.</li>
                  <li>Selected seats are temporarily reserved during payment.</li>
                </ul>
              </div>
              <div>
                <h3 className="mb-2 font-semibold text-white">Seamless Online Booking</h3>
                <p>Browse available buses, select your journey, choose your preferred seats and complete your payment online. Your confirmed ticket is delivered through WhatsApp and SMS with a QR code for boarding verification.</p>
              </div>
              <div>
                <h3 className="mb-2 font-semibold text-white">Support When Your Plans Change</h3>
                <p>Our support team is available for booking queries and cancellations.</p>
                <p className="mt-2">Phone: <a href="tel:+919890066580" className="footer-link inline">+91 9890066580</a></p>
                <p>Email: <a href="mailto:udaytravels6787@gmail.com" className="footer-link inline">udaytravels6787@gmail.com</a></p>
                <p className="mt-2">As per our cancellation policy, the value of a cancelled ticket is retained as travel credit for your next journey.</p>
              </div>
              <p className="about-closing font-semibold text-white">Uday Travels – Making Every Journey Between Ahilyanagar and Pune Simpler, More Convenient and More Comfortable.</p>
            </div>
            <a href="#top" className="footer-link">Back to home <ArrowUpRight size={14} /></a>
          </FooterColumn>
          <FooterColumn title="Contact us">
            <p>Shop no. 13, Santachaya Apartment,<br />Opposite Kohinoor Maangal Karyalaya,<br />Gulmohar Road, Savedi, Ahilyanagar,<br />Maharashtra 414003</p>
            <a href="tel:+919890066580" className="footer-link">+91 9890066580</a>
            <a href="mailto:udaytravels6787@gmail.com" className="footer-link">udaytravels6787@gmail.com</a>
            <a href="https://www.google.com/maps/search/?api=1&query=Shop+no.+13%2C+Santachaya+Apartment%2C+Gulmohar+Road%2C+Savedi%2C+Ahilyanagar%2C+Maharashtra+414003" target="_blank" rel="noreferrer" className="footer-link">Open office in Google Maps <ArrowUpRight size={14} /></a>
          </FooterColumn>
          <FooterColumn title="Travel policies">
            <a href="/policies#terms" className="footer-link">Terms of Service</a>
            <a href="/policies#cancellation" className="footer-link">Cancellation & Refund Policy</a>
            <a href="/policies#privacy" className="footer-link">Privacy Policy</a>
          </FooterColumn>
          <FooterColumn title="Need help?">
            <p>Our support team is here for your booking questions and journey updates.</p>
            <a href="mailto:udaytravels6787@gmail.com" className="footer-link">Mail to our support team <ArrowUpRight size={14} /></a>
          </FooterColumn>
        </div>
        <div className="mx-auto mt-12 max-w-[1440px] border-t border-white/10 pt-5 text-[10px] uppercase tracking-[0.2em] text-white/35">© 2026 Uday Travels. All rights reserved.</div>
      </footer>
    </main>
  )
}

