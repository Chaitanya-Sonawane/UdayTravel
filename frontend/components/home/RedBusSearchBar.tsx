'use client'

import React, { useState, useTransition, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  BusFront,
  ArrowLeftRight,
  CalendarDays,
  Search,
  Sparkles,
  ShieldCheck,
  Info,
  X,
  ChevronDown,
  Check,
  Heart,
  Loader2,
} from 'lucide-react'
import { todayIST, getNextDate } from '@/lib/time/ist'
import { ThemedDatePickerModal } from '@/components/ui/ThemedDatePickerModal'
import { hasDeviceAccount, isUserLoggedIn } from '@/lib/auth/client-auth'

export type CityStop = {
  city: string
  subtext: string
  routeCode: 'AHM_PUN' | 'PUN_AHM'
  points: string[]
}

const CITIES: Record<string, CityStop> = {
  Ahilyanagar: {
    city: 'Ahilyanagar',
    subtext: 'Savedi / Swastik / Premdan / Delhigate',
    routeCode: 'AHM_PUN',
    points: ['Office Savedi', 'Swastik Chowk', 'Premdan Chowk', 'Delhigate', 'Maliwada'],
  },
  Pune: {
    city: 'Pune',
    subtext: 'Shivajinagar / Wagholi / Viman Nagar',
    routeCode: 'PUN_AHM',
    points: ['Shivajinagar Bus Stand', 'Wagholi Bypass', 'Viman Nagar', 'Kharadi Bypass', 'Yerwada'],
  },
}

function formatDateDisplay(dateStr: string, todayStr: string, tomorrowStr: string): { main: string; badge: string } {
  try {
    const parts = dateStr.split('-').map(Number)
    const y = parts[0] ?? 2026
    const m = parts[1] ?? 1
    const d = parts[2] ?? 1
    const dateObj = new Date(y, m - 1, d)
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    
    const formattedDate = `${d} ${monthNames[dateObj.getMonth()] ?? ''}, ${y}`
    let badge: string = dayNames[dateObj.getDay()] ?? ''
    if (dateStr === todayStr) badge = '(Today)'
    else if (dateStr === tomorrowStr) badge = '(Tomorrow)'
    return { main: formattedDate, badge }
  } catch {
    return { main: dateStr, badge: '' }
  }
}

export function RedBusSearchBar() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // Origin & Destination state
  const [fromCity, setFromCity] = useState<'Ahilyanagar' | 'Pune'>('Ahilyanagar')
  const [toCity, setToCity] = useState<'Ahilyanagar' | 'Pune'>('Pune')
  const [isRotated, setIsRotated] = useState(false)
  const [showFromDropdown, setShowFromDropdown] = useState(false)
  const [showToDropdown, setShowToDropdown] = useState(false)

  // Date state
  const todayStr = useMemo(() => todayIST(), [])
  const tomorrowStr = useMemo(() => getNextDate(todayStr, 1), [todayStr])
  const [selectedDate, setSelectedDate] = useState<string>(todayStr)
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false)

  // Booking for Women state
  const [bookingForWomen, setBookingForWomen] = useState(false)
  const [showWomenModal, setShowWomenModal] = useState(false)

  // Swap From & To
  const handleSwap = () => {
    setIsRotated((prev) => !prev)
    setFromCity((prev) => (prev === 'Ahilyanagar' ? 'Pune' : 'Ahilyanagar'))
    setToCity((prev) => (prev === 'Pune' ? 'Ahilyanagar' : 'Pune'))
  }

  // Handle Search Submission
  const handleSearch = () => {
    const route = fromCity === 'Ahilyanagar' ? 'AHM_PUN' : 'PUN_AHM'
    const targetUrl = `/availability?route=${route}&date=${selectedDate}${bookingForWomen ? '&women=true' : ''}`

    startTransition(() => {
      // If user is already logged in, navigate directly
      if (hasDeviceAccount() || isUserLoggedIn(null)) {
        router.push(targetUrl)
      } else {
        router.push(`/account?mode=register&redirect=${encodeURIComponent(targetUrl)}`)
      }
    })
  }

  const { main: dateMain, badge: dateBadge } = formatDateDisplay(selectedDate, todayStr, tomorrowStr)

  return (
    <div className="relative w-full max-w-6xl mx-auto px-3 sm:px-4">
      {/* ------------------------------------------------------------- */}
      {/* REDBUS STYLE MULTI-COLUMN SEARCH CONTAINER                   */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-white rounded-3xl border border-gray-200/90 shadow-[0_16px_48px_rgba(15,23,42,0.14)] p-2 sm:p-2.5 relative">
        <div className="grid grid-cols-1 md:grid-cols-12 items-center gap-1 md:gap-0 divide-y md:divide-y-0 md:divide-x divide-gray-100">
          
          {/* ----------------------------------------------------------- */}
          {/* COLUMN 1: FROM (ORIGIN) + SWAP BUTTON                      */}
          {/* ----------------------------------------------------------- */}
          <div className="md:col-span-4 p-3 sm:p-3.5 relative flex items-center justify-between group rounded-2xl hover:bg-slate-50/80 transition-colors">
            <div className="flex items-center gap-3.5 min-w-0 flex-1">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-200/60 flex items-center justify-center text-gray-800 shrink-0 group-hover:bg-[#F8B018] group-hover:text-black transition-all">
                <BusFront size={20} className="stroke-[2.2]" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[11px] font-black uppercase tracking-wider text-gray-400 block">
                  From
                </span>
                <button
                  type="button"
                  onClick={() => setShowFromDropdown((v) => !v)}
                  className="font-extrabold text-base sm:text-lg text-gray-900 tracking-tight text-left flex items-center gap-1.5 outline-none cursor-pointer w-full"
                >
                  <span className="truncate">{fromCity}</span>
                  <ChevronDown size={14} className="text-gray-400 shrink-0" />
                </button>
                <span className="text-[11px] text-gray-500 font-medium truncate block">
                  {CITIES[fromCity]?.subtext ?? ''}
                </span>
              </div>
            </div>

            {/* Circular Swap Button matching RedBus */}
            <button
              type="button"
              onClick={handleSwap}
              aria-label="Swap From and To destinations"
              className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-slate-900 hover:bg-black active:scale-90 text-white shadow-md flex items-center justify-center transition-transform duration-300 shrink-0 cursor-pointer ${
                isRotated ? 'rotate-180' : 'rotate-0'
              }`}
              title="Click to swap Origin & Destination"
            >
              <ArrowLeftRight size={15} className="stroke-[2.5]" />
            </button>

            {/* Quick From Points Dropdown */}
            {showFromDropdown && (
              <div className="absolute left-0 top-full mt-2 w-72 bg-white rounded-2xl border border-gray-200 shadow-xl p-2.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="text-[10px] font-black uppercase tracking-wider text-gray-400 px-2 py-1">
                  Select Boarding City
                </div>
                {['Ahilyanagar', 'Pune'].map((city) => (
                  <button
                    key={city}
                    type="button"
                    onClick={() => {
                      setFromCity(city as any)
                      setToCity(city === 'Ahilyanagar' ? 'Pune' : 'Ahilyanagar')
                      setShowFromDropdown(false)
                    }}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-between cursor-pointer transition-colors ${
                      fromCity === city ? 'bg-amber-50 text-amber-900' : 'hover:bg-gray-100 text-gray-700'
                    }`}
                  >
                    <span>{city}</span>
                    {fromCity === city && <Check size={14} className="text-amber-600" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ----------------------------------------------------------- */}
          {/* COLUMN 2: TO (DESTINATION)                                  */}
          {/* ----------------------------------------------------------- */}
          <div className="md:col-span-3 p-3 sm:p-3.5 relative flex items-center justify-between group rounded-2xl hover:bg-slate-50/80 transition-colors">
            <div className="flex items-center gap-3.5 min-w-0 flex-1">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-200/60 flex items-center justify-center text-gray-800 shrink-0 group-hover:bg-[#F8B018] group-hover:text-black transition-all">
                <BusFront size={20} className="stroke-[2.2]" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[11px] font-black uppercase tracking-wider text-gray-400 block">
                  To
                </span>
                <button
                  type="button"
                  onClick={() => setShowToDropdown((v) => !v)}
                  className="font-extrabold text-base sm:text-lg text-gray-900 tracking-tight text-left flex items-center gap-1.5 outline-none cursor-pointer w-full"
                >
                  <span className="truncate">{toCity}</span>
                  <ChevronDown size={14} className="text-gray-400 shrink-0" />
                </button>
                <span className="text-[11px] text-gray-500 font-medium truncate block">
                  {CITIES[toCity]?.subtext ?? ''}
                </span>
              </div>
            </div>

            {/* Quick To Points Dropdown */}
            {showToDropdown && (
              <div className="absolute left-0 top-full mt-2 w-72 bg-white rounded-2xl border border-gray-200 shadow-xl p-2.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="text-[10px] font-black uppercase tracking-wider text-gray-400 px-2 py-1">
                  Select Destination City
                </div>
                {['Pune', 'Ahilyanagar'].map((city) => (
                  <button
                    key={city}
                    type="button"
                    onClick={() => {
                      setToCity(city as any)
                      setFromCity(city === 'Pune' ? 'Ahilyanagar' : 'Pune')
                      setShowToDropdown(false)
                    }}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-between cursor-pointer transition-colors ${
                      toCity === city ? 'bg-amber-50 text-amber-900' : 'hover:bg-gray-100 text-gray-700'
                    }`}
                  >
                    <span>{city}</span>
                    {toCity === city && <Check size={14} className="text-amber-600" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ----------------------------------------------------------- */}
          {/* COLUMN 3: DATE OF JOURNEY (WITH TODAY / TOMORROW PILLS)     */}
          {/* ----------------------------------------------------------- */}
          <div className="md:col-span-3 p-3 sm:p-3.5 relative flex items-center justify-between group rounded-2xl hover:bg-slate-50/80 transition-colors">
            <div
              onClick={() => setIsDatePickerOpen(true)}
              className="flex items-center gap-3.5 min-w-0 flex-1 cursor-pointer"
            >
              <div className="w-10 h-10 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 shrink-0 group-hover:bg-[#F8B018] group-hover:text-black transition-all">
                <CalendarDays size={20} className="stroke-[2.2]" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[11px] font-black uppercase tracking-wider text-gray-400 block">
                  Date of Journey
                </span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-extrabold text-sm sm:text-base text-gray-900 tracking-tight">
                    {dateMain}
                  </span>
                  {dateBadge && (
                    <span className="text-[11px] font-semibold text-gray-500">
                      {dateBadge}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Today / Tomorrow Shortcuts matching RedBus */}
            <div className="flex items-center gap-1 shrink-0 ml-1">
              <button
                type="button"
                onClick={() => setSelectedDate(todayStr)}
                className={`text-[11px] px-2.5 py-1 rounded-full font-bold transition-all cursor-pointer ${
                  selectedDate === todayStr
                    ? 'bg-amber-100 text-amber-900 border border-amber-300 font-black'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => setSelectedDate(tomorrowStr)}
                className={`text-[11px] px-2.5 py-1 rounded-full font-bold transition-all cursor-pointer ${
                  selectedDate === tomorrowStr
                    ? 'bg-amber-100 text-amber-900 border border-amber-300 font-black'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Tomorrow
              </button>
            </div>
          </div>

          {/* ----------------------------------------------------------- */}
          {/* COLUMN 4: BOOKING FOR WOMEN                                */}
          {/* ----------------------------------------------------------- */}
          <div className="md:col-span-2 p-3 sm:p-3.5 relative flex items-center justify-between group rounded-2xl hover:bg-pink-50/50 transition-colors">
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              {/* Woman Avatar Icon matching RedBus illustration */}
              <div className="w-10 h-10 rounded-2xl bg-pink-100/90 border border-pink-200 flex items-center justify-center text-pink-600 shrink-0 shadow-2xs">
                <span className="text-xl select-none" role="img" aria-label="Woman passenger">
                  👩
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-xs sm:text-sm font-extrabold text-gray-900 block leading-tight truncate">
                  Booking for women
                </span>
                <button
                  type="button"
                  onClick={() => setShowWomenModal(true)}
                  className="text-[11px] text-pink-600 font-bold hover:underline cursor-pointer flex items-center gap-0.5 mt-0.5"
                >
                  <span>Know more</span>
                  <Info size={11} />
                </button>
              </div>
            </div>

            {/* Toggle Switch matching RedBus */}
            <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-2">
              <input
                type="checkbox"
                checked={bookingForWomen}
                onChange={(e) => setBookingForWomen(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-pink-600 shadow-inner"></div>
            </label>
          </div>

        </div>

        {/* ----------------------------------------------------------- */}
        {/* REDBUS STYLE SEARCH BUSES BUTTON (CENTERED & OVERLAPPING)   */}
        {/* ----------------------------------------------------------- */}
        <div className="absolute left-1/2 -bottom-6 -translate-x-1/2 z-20">
          <button
            type="button"
            onClick={handleSearch}
            disabled={isPending}
            className="inline-flex items-center justify-center gap-2 px-8 sm:px-10 py-3.5 rounded-full bg-[#D81A2A] hover:bg-[#b81220] active:scale-95 text-white font-black text-sm sm:text-base uppercase tracking-wider shadow-[0_10px_25px_rgba(216,26,42,0.45)] hover:shadow-[0_12px_32px_rgba(216,26,42,0.6)] transition-all cursor-pointer whitespace-nowrap"
          >
            {isPending ? (
              <>
                <Loader2 size={18} className="animate-spin text-white" />
                <span>Searching...</span>
              </>
            ) : (
              <>
                <Search size={18} className="stroke-[3]" />
                <span>Search buses</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* THEMED DATE PICKER MODAL                                      */}
      {/* ------------------------------------------------------------- */}
      <ThemedDatePickerModal
        isOpen={isDatePickerOpen}
        onClose={() => setIsDatePickerOpen(false)}
        selectedDate={selectedDate}
        onSelectDate={(newDate) => {
          setSelectedDate(newDate)
          setIsDatePickerOpen(false)
        }}
        minDate={todayStr}
        title="Select Date of Journey"
        routeContext={`${fromCity} → ${toCity}`}
      />

      {/* ------------------------------------------------------------- */}
      {/* WOMEN SAFETY INFORMATION MODAL                                */}
      {/* ------------------------------------------------------------- */}
      {showWomenModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-pink-100 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-pink-100 flex items-center justify-center text-pink-600 font-bold">
                  👩
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-gray-900">
                    Booking for Women
                  </h3>
                  <p className="text-xs text-pink-600 font-bold">
                    Safe &amp; Verified Travel Guarantee
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowWomenModal(false)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center cursor-pointer transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3 text-xs text-gray-600">
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-pink-50 border border-pink-200 flex items-center justify-center text-pink-600 font-black shrink-0 text-[10px]">
                  ✓
                </span>
                <p>
                  <strong className="text-gray-900">Adjacent Female Seating:</strong> Single female travellers are only paired with other women passengers.
                </p>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-pink-50 border border-pink-200 flex items-center justify-center text-pink-600 font-black shrink-0 text-[10px]">
                  ✓
                </span>
                <p>
                  <strong className="text-gray-900">3-Seat Row Bench Harmony:</strong> For 3-seat rows, entire bench clusters are kept for the same gender.
                </p>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-pink-50 border border-pink-200 flex items-center justify-center text-pink-600 font-black shrink-0 text-[10px]">
                  ✓
                </span>
                <p>
                  <strong className="text-gray-900">Front Row Priority:</strong> Front cabin rows are safeguarded for families and ladies.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setBookingForWomen(true)
                setShowWomenModal(false)
              }}
              className="w-full py-3 rounded-2xl bg-pink-600 hover:bg-pink-700 text-white font-extrabold text-xs uppercase tracking-wider transition-colors cursor-pointer shadow-md"
            >
              Enable Women Booking &amp; Continue
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default RedBusSearchBar
