'use client'

import React, { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Menu, UserRound, ChevronDown } from 'lucide-react'
import { CancellationModal } from '@/components/cancellation/CancellationModal'
import { subscribeToAuth, signOutUser, fetchCurrentProfile } from '@/lib/auth/client-auth'
import { User } from 'firebase/auth'
import NavDrawer from '@/components/navigation/NavDrawer'

export default function CancelTicketPage() {
  const params = useParams<{ ticketNo: string }>()
  const router = useRouter()
  const ticketNo = params?.ticketNo ? String(params.ticketNo) : ''

  const [sheet, setSheet] = useState(false)
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [userName, setUserName] = useState<string>('')

  useEffect(() => {
    const unsub = subscribeToAuth(async (user) => {
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
    return () => unsub()
  }, [])

  const handleLogout = async () => {
    await signOutUser()
    setCurrentUser(null)
    setUserName('')
    setSheet(false)
  }

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col justify-between font-jakarta">
      <div>
        {/* Availability Header */}
        <header className="availability-header sticky top-0 z-50 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between shadow-xs font-jakarta">
          <div className="flex items-center gap-3">
            <Link
              href={`/ticket/${ticketNo}`}
              aria-label="Back to ticket"
              className="ticket-header-back p-2 text-gray-700 hover:text-[#D97706] hover:bg-amber-50 rounded-xl transition-colors cursor-pointer"
              title="Back to ticket"
            >
              <ArrowLeft size={18} />
            </Link>
          </div>

          <div className="flex items-center gap-4">
            <nav className="hidden items-center gap-6 text-xs uppercase tracking-[0.14em] text-gray-700 md:flex">
              <Link href="/availability" className="font-bold text-[#D97706] hover:text-[#B45309]">
                Book a seat
              </Link>
              <Link href="/about" className="hover:text-[#D97706] transition-colors">
                About Us
              </Link>
              <Link href="/policies" className="hover:text-[#D97706] transition-colors">
                Policies
              </Link>
              <Link href="/contact" className="hover:text-[#D97706] transition-colors">
                Contact Us
              </Link>
              <button
                type="button"
                onClick={() => setSheet(true)}
                className="!flex items-center gap-2 px-3.5 py-1.5 rounded-none bg-amber-50 border border-[#F8B018]/50 text-[#B45309] hover:bg-[#F8B018] hover:text-black font-semibold text-xs tracking-wider transition-all duration-200 shadow-sm cursor-pointer !w-auto !h-9"
              >
                <UserRound size={14} className="stroke-[2.2]" />
                <span>{currentUser ? (userName || 'My Account') : 'Account'}</span>
                <ChevronDown size={13} className="opacity-75" />
              </button>
            </nav>
            <button
              onClick={() => setSheet(true)}
              aria-label="Open menu"
              className="p-2 text-gray-700 hover:text-[#D97706] hover:bg-amber-50 rounded-xl cursor-pointer bg-transparent border-0 transition-colors"
            >
              <Menu size={24} />
            </button>
          </div>
        </header>

        <div className="max-w-2xl mx-auto py-6 sm:py-8 px-3 sm:px-6">
          <CancellationModal
            ticketNo={ticketNo}
            isOpen={true}
            onClose={() => router.push(`/ticket/${ticketNo}`)}
            onSuccess={() => {
              setTimeout(() => {
                router.push(`/ticket/${ticketNo}`)
              }, 1800)
            }}
            isStandalonePage={true}
          />
        </div>
      </div>

      <footer className="text-center text-xs text-gray-400 py-6">
        Need assistance? Call Uday Travels Helpdesk at <a href="tel:+919890066580" className="text-gray-600 font-semibold">+91 98900 66580</a>
      </footer>

      <NavDrawer
        open={sheet}
        onClose={() => setSheet(false)}
        currentUser={currentUser}
        userName={userName}
        userPhone={currentUser?.phoneNumber || ''}
        onLogout={handleLogout}
        theme="light"
      />
    </main>
  )
}
