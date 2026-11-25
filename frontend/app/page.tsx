'use client'

import { useEffect, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
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
  MapPin,
  Bus,
  Shield,
  Users,
  Mail,
  Phone,
  Clock,
  ChevronDown,
  List,
  ChevronRight,
  Gift,
  Tag,
  HelpCircle,
  Wallet,
  RotateCcw,
  Loader2,
} from 'lucide-react'
import { subscribeToAuth, signOutUser, fetchCurrentProfile, hasDeviceAccount, isUserLoggedIn } from '@/lib/auth/client-auth'
import { User } from 'firebase/auth'
import BlackThemeFooter from '@/components/footer/BlackThemeFooter'
import NavDrawer from '@/components/navigation/NavDrawer'
import AlternatingInfoSection from '@/components/home/AlternatingInfoSection'
import DarkThemeStatsSection from '@/components/home/DarkThemeStatsSection'

const heroImage = 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/uday-travels-homepage-background%20%281%29-zMwZmyD7R7O8ItfYIMzzIrrJEy2TQT.png'

export default function Page() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [menuOpen, setMenuOpen] = useState(false)
  const [isMounted, setIsMounted] = useState(false)
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [userName, setUserName] = useState<string>('')
  const [deviceHasAccount, setDeviceHasAccount] = useState<boolean>(false)

  useEffect(() => {
    setIsMounted(true)
    setDeviceHasAccount(hasDeviceAccount())
  }, [])

  const handleFindJourney = (e: React.MouseEvent) => {
    e.preventDefault()
    startTransition(() => {
      if ((currentUser && !currentUser.isAnonymous) || isUserLoggedIn(currentUser)) {
        router.push('/availability')
      } else {
        router.push('/account?mode=register&redirect=/availability')
      }
    })
  }

  const findJourneyHref =
    isMounted && ((currentUser && !currentUser.isAnonymous) || isUserLoggedIn(currentUser))
      ? '/availability'
      : '/account?mode=register&redirect=/availability'

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
    <main className="min-h-screen w-full max-w-full overflow-x-hidden bg-[#0B0F19] text-white">

      <section id="top" className="hero-section relative isolate min-h-[820px] overflow-hidden lg:min-h-[920px] xl:min-h-[980px]">
        <img src={heroImage} alt="Purple coach travelling along a mountain highway" className="hero-image absolute inset-0 h-full w-full object-cover object-center" />
        <div className="hero-black-fade absolute inset-0 bg-black/40" />
        <header className="home-header absolute inset-x-0 top-0 z-[60] flex items-center justify-between px-5 py-5 md:px-10 xl:px-16">
          <Link href="/" className="flex items-center gap-2.5 text-white no-underline group" aria-label="Uday Travels Home">
            <span
              className="brand-logo-mark w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-[#F8B018] text-[#0B0F19] font-black flex items-center justify-center font-sans tracking-tight text-xs sm:text-sm shadow-md shrink-0 group-hover:scale-105 transition-transform"
              style={{ backgroundColor: '#F8B018', color: '#0B0F19', fontWeight: 900 }}
            >
              UT
            </span>
            <span className="font-chakra text-lg sm:text-xl font-black uppercase tracking-tight text-white leading-none">
              UDAY <span className="text-[#F8B018]">TRAVELS</span>
            </span>
          </Link>

          {/* Navigation Menu Trigger (Clean Hamburger Symbol) */}
          <button
            type="button"
            onClick={() => setMenuOpen((prev) => !prev)}
            className="flex items-center justify-center p-2 text-white hover:text-[#F8B018] bg-transparent border-0 cursor-pointer transition-colors shadow-none"
            aria-label="Open navigation menu"
          >
            <Menu size={28} className="text-white hover:text-[#F8B018] stroke-[2.5] transition-colors" />
          </button>
        </header>

        {/* Navigation Drawer matching User's Mockup in Yellow & Black Theme */}
        {menuOpen && (
          <div
            className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex justify-end animate-in fade-in duration-200"
            onClick={() => setMenuOpen(false)}
          >
            <aside
              className="w-full max-w-sm sm:max-w-md bg-[#0B0F19] border-l border-[#F8B018]/25 text-white h-full shadow-2xl shadow-black flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-250 p-6 sm:p-7 relative z-[101]"
              onClick={(e) => e.stopPropagation()}
            >
              <div>
                {/* Clean Navigation Bar Top without duplicate logo */}
                <div className="flex items-center justify-between pb-4 border-b border-white/10">
                  <span className="text-xs uppercase font-extrabold tracking-widest text-[#F8B018] font-mono">
                    Menu
                  </span>
                  <button
                    type="button"
                    onClick={() => setMenuOpen(false)}
                    className="p-1.5 -mr-1 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
                    aria-label="Close menu"
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* 1. Header Area: Log in to manage your bookings OR Profile */}
                {!currentUser ? (
                  <div className="pt-4 pb-5 space-y-3">
                    <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-snug">
                      Log in to manage your bookings
                    </h2>
                    <Link
                      href="/account"
                      onClick={() => setMenuOpen(false)}
                      className="w-full py-3.5 rounded-none bg-[#F8B018] hover:bg-[#ffbe2e] text-black font-extrabold text-sm sm:text-base shadow-lg shadow-[#F8B018]/25 hover:shadow-[#F8B018]/40 transition-all text-center block cursor-pointer active:scale-[0.99]"
                    >
                      Log in
                    </Link>
                    <p className="text-xs sm:text-sm text-white/70">
                      Don&apos;t have an account?{' '}
                      <Link
                        href="/account"
                        onClick={() => setMenuOpen(false)}
                        className="font-extrabold underline text-[#F8B018] hover:text-[#ffca58] transition-colors"
                      >
                        Sign up
                      </Link>
                    </p>
                  </div>
                ) : (
                  <div className="pt-4 pb-5">
                    <div className="p-4 bg-[#111827] border border-[#F8B018]/35 rounded-2xl flex items-center gap-3.5 shadow-lg shadow-black/40">
                      <div className="w-11 h-11 rounded-full bg-[#F8B018] text-black font-black text-base flex items-center justify-center shadow-md shadow-[#F8B018]/30 shrink-0">
                        {(userName || currentUser.displayName || 'P')[0]?.toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-extrabold text-sm text-white truncate">
                          {userName || currentUser.displayName || 'Passenger'}
                        </div>
                        <div className="text-xs text-[#F8B018] font-mono font-bold tracking-wide truncate">
                          {currentUser.phoneNumber || currentUser.email || ''}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. Section: My details */}
                <div className="space-y-1.5 pt-1">
                  <h3 className="text-xs sm:text-sm font-extrabold tracking-wider uppercase text-[#F8B018] mb-2.5">
                    My details
                  </h3>

                  {/* Bookings -> Go to Availability Page */}
                  <Link
                    href="/availability"
                    onClick={() => setMenuOpen(false)}
                    className="bg-[#F8B018]/15 border border-[#F8B018]/45 hover:bg-[#F8B018]/25 text-white font-bold px-4 py-3 rounded-2xl flex items-center justify-between transition-all group cursor-pointer shadow-sm shadow-[#F8B018]/10"
                  >
                    <div className="flex items-center gap-3.5">
                      <List size={18} className="text-[#F8B018] stroke-[2.4]" />
                      <span className="text-sm font-bold text-white group-hover:text-[#F8B018] transition-colors">
                        Bookings
                      </span>
                    </div>
                    <ChevronRight size={18} className="text-[#F8B018] group-hover:translate-x-1 transition-transform" />
                  </Link>

                  {/* Personal information -> Profile Page */}
                  <Link
                    href="/account"
                    onClick={() => setMenuOpen(false)}
                    className="px-4 py-3 rounded-2xl flex items-center justify-between bg-white/[0.03] hover:bg-white/[0.08] hover:border-[#F8B018]/30 border border-white/5 text-white/90 font-medium transition-all group cursor-pointer"
                  >
                    <div className="flex items-center gap-3.5">
                      <UserRound size={18} className="text-[#F8B018]" />
                      <span className="text-sm font-medium text-white/90 group-hover:text-white transition-colors">
                        Personal information
                      </span>
                    </div>
                    <ChevronRight size={18} className="text-white/40 group-hover:text-[#F8B018] group-hover:translate-x-1 transition-transform" />
                  </Link>
                </div>

                {/* Divider */}
                <hr className="my-3.5 border-white/10" />

                {/* 3. Section: Payments */}
                <div className="space-y-1.5">
                  <h3 className="text-xs sm:text-sm font-extrabold tracking-wider uppercase text-[#F8B018] mb-2.5">
                    Payments
                  </h3>

                  {/* Uday Wallet -> Profile Page */}
                  <Link
                    href="/account"
                    onClick={() => setMenuOpen(false)}
                    className="px-4 py-3 rounded-2xl flex items-center justify-between bg-white/[0.03] hover:bg-white/[0.08] hover:border-[#F8B018]/30 border border-white/5 text-white/90 font-medium transition-all group cursor-pointer"
                  >
                    <div className="flex items-center gap-3.5">
                      <Wallet size={18} className="text-[#F8B018]" />
                      <span className="text-sm font-medium text-white/90 group-hover:text-white transition-colors">
                        Uday Wallet
                      </span>
                    </div>
                    <ChevronRight size={18} className="text-white/40 group-hover:text-[#F8B018] group-hover:translate-x-1 transition-transform" />
                  </Link>

                  {/* Redeem gift card -> Renders No Gift Card Found */}
                  <Link
                    href="/gift-cards"
                    onClick={() => setMenuOpen(false)}
                    className="px-4 py-3 rounded-2xl flex items-center justify-between bg-white/[0.03] hover:bg-white/[0.08] hover:border-[#F8B018]/30 border border-white/5 text-white/90 font-medium transition-all group cursor-pointer"
                  >
                    <div className="flex items-center gap-3.5">
                      <Gift size={18} className="text-[#F8B018]" />
                      <span className="text-sm font-medium text-white/90 group-hover:text-white transition-colors">
                        Redeem gift card
                      </span>
                    </div>
                    <ChevronRight size={18} className="text-white/40 group-hover:text-[#F8B018] group-hover:translate-x-1 transition-transform" />
                  </Link>
                </div>

                {/* Divider */}
                <hr className="my-3.5 border-white/10" />

                {/* 4. Section: More */}
                <div className="space-y-1.5">
                  <h3 className="text-xs sm:text-sm font-extrabold tracking-wider uppercase text-[#F8B018] mb-2.5">
                    More
                  </h3>

                  {/* Offers -> Renders No Offers Found */}
                  <Link
                    href="/offers"
                    onClick={() => setMenuOpen(false)}
                    className="px-4 py-3 rounded-2xl flex items-center justify-between bg-white/[0.03] hover:bg-white/[0.08] hover:border-[#F8B018]/30 border border-white/5 text-white/90 font-medium transition-all group cursor-pointer"
                  >
                    <div className="flex items-center gap-3.5">
                      <Tag size={18} className="text-[#F8B018]" />
                      <span className="text-sm font-medium text-white/90 group-hover:text-white transition-colors">
                        Offers & Discounts
                      </span>
                    </div>
                    <ChevronRight size={18} className="text-white/40 group-hover:text-[#F8B018] group-hover:translate-x-1 transition-transform" />
                  </Link>

                  {/* Know about Uday Travels -> About Us Page */}
                  <Link
                    href="/about"
                    onClick={() => setMenuOpen(false)}
                    className="px-4 py-3 rounded-2xl flex items-center justify-between bg-white/[0.03] hover:bg-white/[0.08] hover:border-[#F8B018]/30 border border-white/5 text-white/90 font-medium transition-all group cursor-pointer"
                  >
                    <div className="flex items-center gap-3.5">
                      <Info size={18} className="text-[#F8B018]" />
                      <span className="text-sm font-medium text-white/90 group-hover:text-white transition-colors">
                        Know about Uday Travels
                      </span>
                    </div>
                    <ChevronRight size={18} className="text-white/40 group-hover:text-[#F8B018] group-hover:translate-x-1 transition-transform" />
                  </Link>

                  {/* Help -> Help FAQ Page */}
                  <Link
                    href="/help"
                    onClick={() => setMenuOpen(false)}
                    className="px-4 py-3 rounded-2xl flex items-center justify-between bg-white/[0.03] hover:bg-white/[0.08] hover:border-[#F8B018]/30 border border-white/5 text-white/90 font-medium transition-all group cursor-pointer"
                  >
                    <div className="flex items-center gap-3.5">
                      <HelpCircle size={18} className="text-[#F8B018]" />
                      <span className="text-sm font-medium text-white/90 group-hover:text-white transition-colors">
                        Help & FAQs
                      </span>
                    </div>
                    <ChevronRight size={18} className="text-white/40 group-hover:text-[#F8B018] group-hover:translate-x-1 transition-transform" />
                  </Link>

                  {/* Cancel Ticket & Refund Status */}
                  <Link
                    href="/bookings"
                    onClick={() => setMenuOpen(false)}
                    className="px-4 py-3 rounded-2xl flex items-center justify-between bg-white/[0.03] hover:bg-white/[0.08] hover:border-[#F8B018]/30 border border-white/5 text-white/90 font-medium transition-all group cursor-pointer"
                  >
                    <div className="flex items-center gap-3.5">
                      <RotateCcw size={18} className="text-[#F8B018]" />
                      <span className="text-sm font-medium text-white/90 group-hover:text-white transition-colors">
                        Cancel Ticket & Refund Status
                      </span>
                    </div>
                    <ChevronRight size={18} className="text-white/40 group-hover:text-[#F8B018] group-hover:translate-x-1 transition-transform" />
                  </Link>
                </div>
              </div>

              {/* Bottom Footer Area */}
              <div className="pt-5 mt-5 border-t border-white/10">
                {currentUser ? (
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-[#F8B018] bg-[#F8B018]/10 hover:bg-[#F8B018]/20 border border-[#F8B018]/30 transition-all cursor-pointer"
                  >
                    <LogOut size={16} /> Logout
                  </button>
                ) : (
                  <div className="text-center text-xs text-white/50 flex items-center justify-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#F8B018]" />
                    <span className="font-bold text-white/80">Uday Travels</span>
                    <span>&bull;</span>
                    <span className="text-white/50">Pune &harr; Ahilyanagar</span>
                  </div>
                )}
              </div>
            </aside>
          </div>
        )}

        <div className="absolute inset-x-0 bottom-0 h-52 bg-gradient-to-t from-[#0B0F19] to-transparent" />

        <div className="hero-content relative mx-auto flex min-h-[820px] max-w-[1440px] items-end px-5 pb-14 pt-32 md:px-10 md:pb-20 md:pt-40 xl:min-h-[980px] xl:px-16">
          <div className="grid w-full grid-cols-1 gap-12 lg:grid-cols-12 lg:items-end">
            <div className="lg:col-span-8">
              <p className="mb-7 flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#FF9D00]"><span className="h-px w-9 bg-[#FF9D00]" /> Pune → Ahilyanagar</p>
              <h1 className="hero-title max-w-5xl font-chakra font-black text-[clamp(4.2rem,10.2vw,10.5rem)] uppercase leading-[.84] tracking-[-.03em]">
                <span className="hero-title-inner">
                  MAKE THE<br /><span className="text-[#FF9D00]">ROAD</span><br /><span className="text-[#FF9D00]">YOURS.</span>
                </span>
              </h1>
              <p className="mt-8 max-w-md text-base leading-7 text-white/70 md:text-lg">Thoughtfully timed, quietly comfortable, always moving.</p>
              <a
                href={findJourneyHref}
                onClick={handleFindJourney}
                suppressHydrationWarning
                className="relative z-20 mt-10 inline-flex h-16 items-center gap-7 rounded-none bg-[#FF9D00] hover:bg-[#FFAE26] px-8 text-base sm:text-lg font-black uppercase tracking-wider text-[#0B0F19] shadow-[0_12px_36px_rgba(255,157,0,0.35)] transition-all hover:-translate-y-1 hover:shadow-[0_16px_40px_rgba(255,157,0,0.45)] active:scale-[0.98] cursor-pointer"
                style={{ fontFamily: "'Chakra Petch', sans-serif" }}
              >
                {isPending ? (
                  <>
                    <Loader2 size={22} className="animate-spin text-[#0B0F19]" />
                    <span>Loading journey...</span>
                  </>
                ) : (
                  <>
                    <span>Find your journey</span>
                    <ArrowUpRight size={22} className="stroke-[3]" />
                  </>
                )}
              </a>
            </div>

            <div className="hidden lg:col-span-4 lg:flex flex-col justify-end items-end text-right border-l border-white/10 pl-8 pb-3">
              <div className="space-y-4">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/50 block">Next departure</span>
                  <div className="font-mono text-2xl font-black text-white mt-0.5">
                    06:40 <span className="text-xs font-normal text-white/60">AM</span>
                  </div>
                </div>
                <div className="pt-3 border-t border-white/10">
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/50 block">Travel time</span>
                  <div className="text-xs text-white/80 mt-0.5 font-medium">
                    02h 45m <span className="text-white/40">/</span> <span className="text-white/60 text-[11px]">via NH60</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="absolute bottom-8 right-5 hidden items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-white/50 md:flex xl:right-16"><CircleHelp size={14} /> Need a hand?</div>
      </section>

      {/* DARK THEME STATS SECTION - Live Network Metrics with Count-up Animation */}
      <DarkThemeStatsSection />

      {/* EDITORIAL INFORMATION SECTION - Pure White Theme with Clean Alternating Layout */}
      <section className="w-full bg-white border-t border-gray-100">
        <AlternatingInfoSection />
      </section>

      {/* FOOTER - Authentic Black Theme Footer with 4 Columns & Dot Matrix */}
      <BlackThemeFooter />
    </main>
  )
}

