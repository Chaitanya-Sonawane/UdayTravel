'use client'

import React, { useState } from 'react'
import { DailyRouteBusScheduler } from '@/components/admin/DailyRouteBusScheduler'
import { ManualCounterBooking } from '@/components/admin/ManualCounterBooking'
import { RouteWisePassengerSheet } from '@/components/admin/RouteWisePassengerSheet'
import { PassengerManifestDispatch } from '@/components/admin/PassengerManifestDispatch'
import { TicketLookupAndOverrides } from '@/components/admin/TicketLookupAndOverrides'
import { PaymentTransactionsLedger } from '@/components/admin/PaymentTransactionsLedger'
import { TicketCancellationsLedger } from '@/components/admin/TicketCancellationsLedger'
import {
  Calendar,
  Ticket,
  Armchair,
  ClipboardList,
  Search,
  ArrowRight,
  Route,
  Receipt,
  RotateCcw,
} from 'lucide-react'
import { RouteId } from '@/lib/config/routes'
import { todayIST } from '@/lib/time/ist'

type AdminTab = 'scheduler' | 'counter' | 'routesheet' | 'manifest' | 'lookup' | 'payments' | 'cancellations'

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<AdminTab>('scheduler')
  const [selectedTripForSeats, setSelectedTripForSeats] = useState<any>(null)
  const [selectedDateForSeats, setSelectedDateForSeats] = useState<string>(todayIST())
  const [selectedRouteForSeats, setSelectedRouteForSeats] = useState<RouteId>('AHM_PUN')

  const handleSelectTripForSeats = (trip: any, date: string, route: RouteId) => {
    setSelectedTripForSeats(trip)
    setSelectedDateForSeats(date)
    setSelectedRouteForSeats(route)
    setActiveTab('counter')
  }

  return (
    <main className="min-h-screen bg-[#F3F4F6] text-[#111827] selection:bg-[#F8B018] selection:text-white pb-20">
      {/* Top Header */}
      <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/95 backdrop-blur-md px-4 py-3.5 sm:px-8 shadow-xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="/" className="flex items-center gap-2.5 group" title="Uday Travels Home">
              <span
                className="h-9 w-9 bg-[#F8B018] font-black flex items-center justify-center font-sans text-sm rounded-xl shadow-xs"
                style={{ backgroundColor: '#F8B018', color: '#0B0F19', fontWeight: 900 }}
              >
                UT
              </span>
              <div className="flex items-center gap-2">
                <span className="font-extrabold tracking-wider text-base text-gray-900 leading-tight">
                  UDAY TRAVELS
                </span>
                <span className="text-[10px] text-[#92400E] bg-[#FEF3C7] px-2 py-0.5 rounded-full uppercase tracking-wider font-mono font-bold">
                  Admin
                </span>
              </div>
            </a>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Connected
            </div>
            <a
              href="/availability"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl transition-colors"
            >
              <span>Booking Portal</span>
              <ArrowRight size={12} />
            </a>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 py-5 sm:px-8 space-y-5">
        {/* Navigation Tabs Bar */}
        <nav className="bg-white border border-gray-200 rounded-2xl p-1.5 shadow-xs flex items-center overflow-x-auto gap-1.5">
          <button
            type="button"
            onClick={() => setActiveTab('scheduler')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
              activeTab === 'scheduler'
                ? 'bg-[#F8B018] text-gray-950 shadow-xs'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            <Calendar size={14} />
            <span>Scheduler</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('counter')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap shrink-0 relative ${
              activeTab === 'counter'
                ? 'bg-[#F8B018] text-gray-950 shadow-xs'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            <Armchair size={14} className={activeTab === 'counter' ? 'text-gray-950' : 'text-[#F8B018]'} />
            <span>Live Seat Map &amp; Counter</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('routesheet')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
              activeTab === 'routesheet'
                ? 'bg-[#F8B018] text-gray-950 shadow-xs'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            <Route size={14} />
            <span>Route Passengers</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('manifest')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
              activeTab === 'manifest'
                ? 'bg-[#F8B018] text-gray-950 shadow-xs'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            <ClipboardList size={14} />
            <span>Manifest &amp; Dispatch</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('lookup')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
              activeTab === 'lookup'
                ? 'bg-[#F8B018] text-gray-950 shadow-xs'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            <Search size={14} />
            <span>Ticket Lookup</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('payments')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
              activeTab === 'payments'
                ? 'bg-[#F8B018] text-gray-950 shadow-xs'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            <Receipt size={14} />
            <span>Booking Payments</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('cancellations')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
              activeTab === 'cancellations'
                ? 'bg-[#F8B018] text-gray-950 shadow-xs'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            <RotateCcw size={14} />
            <span>Cancellations &amp; Refunds</span>
          </button>
        </nav>

        {/* Tab 1: Route & Bus Scheduler */}
        {activeTab === 'scheduler' && (
          <div className="animate-in fade-in duration-200">
            <DailyRouteBusScheduler onSelectTripForSeats={handleSelectTripForSeats} />
          </div>
        )}

        {/* Tab 2: Manual Counter Booking & Live Seat Chart */}
        {activeTab === 'counter' && (
          <div className="animate-in fade-in duration-200">
            <ManualCounterBooking
              initialTrip={selectedTripForSeats}
              initialDate={selectedDateForSeats}
              initialRoute={selectedRouteForSeats}
            />
          </div>
        )}

        {/* Tab 3: Route-Wise Passenger Boarding Sheet */}
        {activeTab === 'routesheet' && (
          <div className="animate-in fade-in duration-200">
            <RouteWisePassengerSheet />
          </div>
        )}

        {/* Tab 4: Boarding Manifest & Dispatch */}
        {activeTab === 'manifest' && (
          <div className="animate-in fade-in duration-200">
            <PassengerManifestDispatch />
          </div>
        )}

        {/* Tab 5: Ticket Lookup & Overrides */}
        {activeTab === 'lookup' && (
          <div className="animate-in fade-in duration-200">
            <TicketLookupAndOverrides />
          </div>
        )}

        {/* Tab 6: Booking Payments & Time Audit */}
        {activeTab === 'payments' && (
          <div className="animate-in fade-in duration-200">
            <PaymentTransactionsLedger />
          </div>
        )}

        {/* Tab 7: Ticket Cancellations (Manual & Web App) */}
        {activeTab === 'cancellations' && (
          <div className="animate-in fade-in duration-200">
            <TicketCancellationsLedger />
          </div>
        )}
      </div>
    </main>
  )
}
