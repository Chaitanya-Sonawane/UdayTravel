'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ArrowUpRight, Bus, CheckCircle2, Shield, Users } from 'lucide-react'
import { subscribeToAuth } from '@/lib/auth/client-auth'
import { User } from 'firebase/auth'

export default function AboutPage() {
  const router = useRouter()
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
  return (
    <main className="min-h-screen bg-[#0B0F19] text-white">
      <header className="border-b border-white/10 px-5 py-5 md:px-10 flex items-center justify-between">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-white/70 hover:text-white transition-colors">
          <ArrowLeft size={18} /> Back to home
        </Link>
        <span className="font-bold tracking-widest text-[#F8B018]">ABOUT UDAY TRAVELS</span>
      </header>

      <section className="max-w-3xl mx-auto px-5 py-12 md:py-16 space-y-10">
        <div>
          <span className="text-xs uppercase tracking-widest text-[#F8B018] font-semibold">Reliable Intercity Travel</span>
          <h1 className="text-3xl md:text-5xl font-black uppercase mt-2">Connecting Ahilyanagar & Pune</h1>
          <p className="text-white/60 mt-3 text-sm md:text-base leading-relaxed">
            Thoughtfully timed, quietly comfortable, and always moving. Uday Travels is Maharashtra&apos;s trusted coach service between Ahilyanagar and Pune.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="border border-white/10 rounded-lg p-5 bg-white/[0.02]">
            <Bus className="text-[#F8B018] mb-3" size={26} />
            <h3 className="font-bold text-white text-base">Modern Fleet</h3>
            <p className="text-xs text-white/60 mt-1 leading-relaxed">
              Air-cushioned 3+2 pushback coaches designed for optimal comfort on highway journeys.
            </p>
          </div>

          <div className="border border-white/10 rounded-lg p-5 bg-white/[0.02]">
            <Shield className="text-[#F8B018] mb-3" size={26} />
            <h3 className="font-bold text-white text-base">Gender Protection</h3>
            <p className="text-xs text-white/60 mt-1 leading-relaxed">
              Guaranteed women-only adjacent seating and safe family booking options built into our core platform.
            </p>
          </div>

          <div className="border border-white/10 rounded-lg p-5 bg-white/[0.02]">
            <Users className="text-[#F8B018] mb-3" size={26} />
            <h3 className="font-bold text-white text-base">20+ Stops Connected</h3>
            <p className="text-xs text-white/60 mt-1 leading-relaxed">
              Connecting 20 pick-up locations across Ahilyanagar with 12 prime hubs across Pune.
            </p>
          </div>
        </div>

        <article className="border border-white/10 rounded-lg p-6 bg-white/[0.02] space-y-4 text-sm text-white/70 leading-relaxed">
          <h2 className="text-xl font-bold uppercase text-white">Our Commitment</h2>
          <p>
            Whether you are a student travelling between colleges, a professional commuting for work, or a family visiting relatives, Uday Travels ensures punctual departures, clean interiors, and straightforward transparent pricing without hidden surcharges.
          </p>
          <p>
            With digital seat reservations, live Firestore seat synchronization, and instant WhatsApp boarding passes, our mission is to make road travel across Maharashtra hassle-free and dependable.
          </p>
        </article>

        <div className="pt-6 border-t border-white/10 flex items-center justify-between">
          <span className="text-xs text-white/40">Uday Travels © 2026</span>
          <button
            type="button"
            onClick={handleFindJourney}
            className="inline-flex items-center gap-2 bg-[#F8B018] text-[#0B0F19] text-xs font-bold px-5 py-3 hover:bg-[#ffb020] transition-colors cursor-pointer"
          >
            Find your journey <ArrowUpRight size={15} />
          </button>
        </div>
      </section>
    </main>
  )
}
