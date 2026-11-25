'use client'

import React from 'react'
import Link from 'next/link'
import {
  X,
  List,
  UserRound,
  Wallet,
  Gift,
  Tag,
  Info,
  HelpCircle,
  RotateCcw,
  FileText,
  PhoneCall,
  LogOut,
  ChevronRight,
} from 'lucide-react'
import { User } from 'firebase/auth'

interface NavDrawerProps {
  open: boolean
  onClose: () => void
  currentUser: User | null
  userName?: string
  userPhone?: string
  onLogout: () => Promise<void> | void
  theme?: 'light' | 'dark'
}

function NavLinkItem({
  href,
  icon: Icon,
  label,
  isActive = false,
  isLight,
  onClick,
}: {
  href: string
  icon: React.ComponentType<{ size: number; className?: string }>
  label: string
  isActive?: boolean
  isLight: boolean
  onClick: () => void
}) {
  if (isActive) {
    return (
      <Link
        href={href}
        onClick={onClick}
        className={`px-4 py-3 rounded-2xl flex items-center justify-between transition-all group cursor-pointer shadow-sm ${
          isLight
            ? 'bg-amber-100/70 border border-amber-300 hover:bg-amber-100 text-amber-950 font-bold shadow-amber-200/50'
            : 'bg-[#F8B018]/15 border border-[#F8B018]/45 hover:bg-[#F8B018]/25 text-white font-bold shadow-[#F8B018]/10'
        }`}
      >
        <div className="flex items-center gap-3.5">
          <Icon size={18} className={`${isLight ? 'text-[#D97706]' : 'text-[#F8B018]'} stroke-[2.4]`} />
          <span
            className={`text-sm font-bold transition-colors ${
              isLight ? 'text-amber-950 group-hover:text-black' : 'text-white group-hover:text-[#F8B018]'
            }`}
          >
            {label}
          </span>
        </div>
        <ChevronRight
          size={18}
          className={`${isLight ? 'text-[#D97706]' : 'text-[#F8B018]'} group-hover:translate-x-1 transition-transform`}
        />
      </Link>
    )
  }

  return (
    <Link
      href={href}
      onClick={onClick}
      className={`px-4 py-3 rounded-2xl flex items-center justify-between border transition-all group cursor-pointer ${
        isLight
          ? 'bg-gray-50/80 hover:bg-amber-50/80 hover:border-amber-300 border-gray-200/90 text-gray-800 font-medium'
          : 'bg-white/[0.03] hover:bg-white/[0.08] hover:border-[#F8B018]/30 border-white/5 text-white/90 font-medium'
      }`}
    >
      <div className="flex items-center gap-3.5">
        <Icon size={18} className={isLight ? 'text-[#D97706]' : 'text-[#F8B018]'} />
        <span
          className={`text-sm font-medium transition-colors ${
            isLight ? 'text-gray-800 group-hover:text-gray-950' : 'text-white/90 group-hover:text-white'
          }`}
        >
          {label}
        </span>
      </div>
      <ChevronRight
        size={18}
        className={`transition-transform group-hover:translate-x-1 ${
          isLight ? 'text-gray-400 group-hover:text-[#D97706]' : 'text-white/40 group-hover:text-[#F8B018]'
        }`}
      />
    </Link>
  )
}

export default function NavDrawer({
  open,
  onClose,
  currentUser,
  userName = '',
  userPhone = '',
  onLogout,
  theme = 'dark',
}: NavDrawerProps) {
  const [localProfile, setLocalProfile] = React.useState<{ name?: string; phone?: string; mobile?: string } | null>(null)

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('uday_user_profile')
        if (stored) {
          const parsed = JSON.parse(stored)
          setLocalProfile(parsed)
        }
      } catch {}
    }
  }, [open])

  if (!open) return null

  const isLight = theme === 'light'
  const effectiveName = userName || currentUser?.displayName || localProfile?.name || ''
  const effectivePhone = userPhone || currentUser?.phoneNumber || localProfile?.mobile || localProfile?.phone || currentUser?.email || ''
  const isAuthUser = Boolean((currentUser && !currentUser.isAnonymous) || effectiveName || effectivePhone)

  return (
    <div
      className={`fixed inset-0 z-[100] flex justify-end animate-in fade-in duration-200 ${
        isLight ? 'bg-black/45 backdrop-blur-xs' : 'bg-black/80 backdrop-blur-sm'
      }`}
      onClick={onClose}
    >
      <aside
        className={`w-full max-w-sm sm:max-w-md h-full flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-250 p-6 sm:p-7 relative z-[101] ${
          isLight
            ? 'bg-white border-l border-amber-200/90 text-gray-900 shadow-2xl shadow-gray-400/25'
            : 'bg-[#0B0F19] border-l border-[#F8B018]/25 text-white shadow-2xl shadow-black'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div>
          {/* Clean Navigation Bar Top without duplicate logo */}
          <div className={`flex items-center justify-between pb-4 ${isLight ? 'border-b border-gray-200' : 'border-b border-white/10'}`}>
            <span className={`text-xs uppercase font-extrabold tracking-widest ${isLight ? 'text-amber-800' : 'text-[#F8B018]'} font-mono`}>
              Menu
            </span>
            <button
              type="button"
              onClick={onClose}
              className={`p-1.5 -mr-1 rounded-lg transition-colors cursor-pointer ${
                isLight ? 'text-gray-500 hover:text-gray-900 hover:bg-gray-100' : 'text-white/70 hover:text-white hover:bg-white/10'
              }`}
              aria-label="Close menu"
            >
              <X size={20} />
            </button>
          </div>

          {/* 1. Header Area: Log in to manage your bookings OR Profile */}
          {!isAuthUser ? (
            <div className="pt-4 pb-5 space-y-3">
              <h2 className={`text-xl sm:text-2xl font-black tracking-tight leading-snug ${isLight ? 'text-gray-900' : 'text-white'}`}>
                Log in to manage your bookings
              </h2>
              <Link
                href="/account"
                onClick={onClose}
                className="w-full py-3.5 rounded-none bg-[#F8B018] hover:bg-[#ffbe2e] text-black font-extrabold text-sm sm:text-base shadow-lg shadow-[#F8B018]/25 hover:shadow-[#F8B018]/40 transition-all text-center block cursor-pointer active:scale-[0.99]"
              >
                Log in
              </Link>
              <p className={`text-xs sm:text-sm ${isLight ? 'text-gray-600' : 'text-white/70'}`}>
                Don&apos;t have an account?{' '}
                <Link
                  href="/account"
                  onClick={onClose}
                  className={`font-extrabold underline transition-colors ${
                    isLight ? 'text-[#D97706] hover:text-[#B45309]' : 'text-[#F8B018] hover:text-[#ffca58]'
                  }`}
                >
                  Sign up
                </Link>
              </p>
            </div>
          ) : (
            <div className="pt-4 pb-5">
              <div
                className={`p-4 rounded-2xl flex items-center gap-3.5 ${
                  isLight
                    ? 'bg-amber-50/80 border border-amber-200/90 shadow-sm'
                    : 'bg-[#111827] border border-[#F8B018]/35 shadow-lg shadow-black/40'
                }`}
              >
                <div className="w-11 h-11 rounded-full bg-[#F8B018] text-black font-black text-base flex items-center justify-center shadow-md shadow-[#F8B018]/30 shrink-0">
                  {(effectiveName || 'P')[0]?.toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className={`font-extrabold text-sm truncate ${isLight ? 'text-gray-900' : 'text-white'}`}>
                    {effectiveName || 'Passenger'}
                  </div>
                  <div className={`text-xs font-mono font-bold tracking-wide truncate ${isLight ? 'text-[#B45309]' : 'text-[#F8B018]'}`}>
                    {effectivePhone}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 2. Section: My details */}
          <div className="space-y-1.5 pt-1">
            <h3 className={`text-xs sm:text-sm font-extrabold tracking-wider uppercase mb-2.5 ${isLight ? 'text-[#B45309]' : 'text-[#F8B018]'}`}>
              My details
            </h3>

            {/* Bookings -> Go to Availability Page */}
            <NavLinkItem
              href="/availability"
              icon={List}
              label="Bookings"
              isActive
              isLight={isLight}
              onClick={onClose}
            />

            {/* Personal information -> Profile Page */}
            <NavLinkItem
              href="/account"
              icon={UserRound}
              label="Personal information"
              isLight={isLight}
              onClick={onClose}
            />
          </div>

          {/* Divider */}
          <hr className={`my-3.5 ${isLight ? 'border-gray-200' : 'border-white/10'}`} />

          {/* 3. Section: Payments */}
          <div className="space-y-1.5">
            <h3 className={`text-xs sm:text-sm font-extrabold tracking-wider uppercase mb-2.5 ${isLight ? 'text-[#B45309]' : 'text-[#F8B018]'}`}>
              Payments
            </h3>

            {/* Uday Wallet -> Profile Page */}
            <NavLinkItem
              href="/account"
              icon={Wallet}
              label="Uday Wallet"
              isLight={isLight}
              onClick={onClose}
            />

            {/* Redeem gift card -> Renders No Gift Card Found */}
            <NavLinkItem
              href="/gift-cards"
              icon={Gift}
              label="Redeem gift card"
              isLight={isLight}
              onClick={onClose}
            />
          </div>

          {/* Divider */}
          <hr className={`my-3.5 ${isLight ? 'border-gray-200' : 'border-white/10'}`} />

          {/* 4. Section: More */}
          <div className="space-y-1.5">
            <h3 className={`text-xs sm:text-sm font-extrabold tracking-wider uppercase mb-2.5 ${isLight ? 'text-[#B45309]' : 'text-[#F8B018]'}`}>
              More
            </h3>

            {/* Offers & Discounts */}
            <NavLinkItem
              href="/offers"
              icon={Tag}
              label="Offers & Discounts"
              isLight={isLight}
              onClick={onClose}
            />

            {/* Know about Uday Travels */}
            <NavLinkItem
              href="/about"
              icon={Info}
              label="Know about Uday Travels"
              isLight={isLight}
              onClick={onClose}
            />

            {/* Help & FAQs */}
            <NavLinkItem
              href="/help"
              icon={HelpCircle}
              label="Help & FAQs"
              isLight={isLight}
              onClick={onClose}
            />

            {/* Cancel Ticket & Refund Status */}
            <NavLinkItem
              href="/bookings"
              icon={RotateCcw}
              label="Cancel Ticket & Refund Status"
              isLight={isLight}
              onClick={onClose}
            />

            {/* Policies & Rules */}
            <NavLinkItem
              href="/policies"
              icon={FileText}
              label="Policies & Rules"
              isLight={isLight}
              onClick={onClose}
            />

            {/* Contact Us */}
            <NavLinkItem
              href="/contact"
              icon={PhoneCall}
              label="Contact Us"
              isLight={isLight}
              onClick={onClose}
            />
          </div>
        </div>

        {/* Bottom Footer Area */}
        <div className={`pt-5 mt-5 border-t ${isLight ? 'border-gray-200' : 'border-white/10'}`}>
          {isAuthUser ? (
            <button
              onClick={onLogout}
              className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold border transition-all cursor-pointer ${
                isLight
                  ? 'text-red-700 bg-red-50 hover:bg-red-100/80 border-red-200'
                  : 'text-[#F8B018] bg-[#F8B018]/10 hover:bg-[#F8B018]/20 border-[#F8B018]/30'
              }`}
            >
              <LogOut size={16} /> Logout
            </button>
          ) : (
          <div className={`text-center text-xs flex items-center justify-center gap-2 ${isLight ? 'text-gray-500' : 'text-white/50'}`}>
            <span className="w-1.5 h-1.5 rounded-full bg-[#F8B018]" />
            <Link href="/" onClick={onClose} className={`font-bold hover:underline ${isLight ? 'text-gray-800' : 'text-white/80'}`}>
              UDAY TRAVELS
            </Link>
            <span>&bull;</span>
            <span>Pune &harr; Ahilyanagar</span>
          </div>
          )}
        </div>
      </aside>
    </div>
  )
}
