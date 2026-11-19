'use client'

import React, { useState } from 'react'
import { DailyRouteBusScheduler } from '@/components/admin/DailyRouteBusScheduler'
import { ManualCounterBooking } from '@/components/admin/ManualCounterBooking'
import { PassengerManifestDispatch } from '@/components/admin/PassengerManifestDispatch'
import { TicketLookupAndOverrides } from '@/components/admin/TicketLookupAndOverrides'
import { AdminAuthorityOverview } from '@/components/admin/AdminAuthorityOverview'
import {
  Calendar,
  Ticket,
  ClipboardList,
  Search,
  ShieldCheck,
  ArrowRight,
  Bus,
} from 'lucide-react'

type AdminTab = 'scheduler' | 'counter' | 'manifest' | 'lookup' | 'authority'

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<AdminTab>('scheduler')

  return (
    <main className="min-h-screen bg-[#F3F4F6] text-[#111827] selection:bg-[#F8B018] selection:text-white pb-20">
      {/* Top Header matching Webapp theme */}
      <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/95 backdrop-blur-md px-4 py-3.5 sm:px-8 shadow-xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="/" className="flex items-center gap-2.5 group">
              <span className="h-10 w-10 bg-[#F8B018] text-gray-950 font-black flex items-center justify-center font-sans text-xl rounded-2xl shadow-xs">
                UT
              </span>
              <div>
                <span className="font-extrabold tracking-wider text-base text-gray-900 block leading-tight">
                  UDAY TRAVELS
                </span>
                <span className="text-[10px] text-[#92400E] bg-[#FEF3C7] px-2 py-0.5 rounded-full uppercase tracking-widest font-mono font-bold">
                  Admin Dispatch &amp; Operations
                </span>
              </div>
            </a>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Realtime Database Connected
            </div>
            <a
              href="/availability"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl transition-colors"
            >
              <span>User Booking Portal</span>
              <ArrowRight size={12} />
            </a>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 py-6 sm:px-8 space-y-6">
        {/* Navigation Tabs Bar */}
        <nav className="bg-white border border-gray-200 rounded-2xl p-1.5 sm:p-2 shadow-xs flex items-center overflow-x-auto gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('scheduler')}
            className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
              activeTab === 'scheduler'
                ? 'bg-[#F8B018] text-gray-950 shadow-xs'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            <Calendar size={15} />
            <span>Route &amp; Bus Scheduler</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('counter')}
            className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
              activeTab === 'counter'
                ? 'bg-[#F8B018] text-gray-950 shadow-xs'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            <Ticket size={15} />
            <span>Manual Counter Booking</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('manifest')}
            className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
              activeTab === 'manifest'
                ? 'bg-[#F8B018] text-gray-950 shadow-xs'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            <ClipboardList size={15} />
            <span>Boarding Manifest &amp; Dispatch</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('lookup')}
            className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
              activeTab === 'lookup'
                ? 'bg-[#F8B018] text-gray-950 shadow-xs'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            <Search size={15} />
            <span>Ticket Lookup &amp; Overrides</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('authority')}
            className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap shrink-0 ml-auto ${
              activeTab === 'authority'
                ? 'bg-gray-900 text-white shadow-xs'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            <ShieldCheck size={15} />
            <span>Admin Authority &amp; Scope</span>
          </button>
        </nav>

        {/* Tab 1: Route & Bus Scheduler */}
        {activeTab === 'scheduler' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center justify-between bg-white border border-gray-200 rounded-2xl p-4 shadow-xs">
              <div className="flex items-center gap-3">
                <span className="px-2.5 py-1 rounded-xl bg-amber-100 text-amber-950 text-xs font-black uppercase tracking-wider">
                  Scheduler
                </span>
                <span className="text-sm font-extrabold text-gray-900">
                  Daily Route &amp; Bus Schedule Creator (55 / 44 / 33 Seater Layout Selection)
                </span>
              </div>
              <span className="text-xs text-gray-400 font-medium hidden sm:inline">
                Live RTDB Sync
              </span>
            </div>
            <DailyRouteBusScheduler />
          </div>
        )}

        {/* Tab 2: Manual Counter Booking */}
        {activeTab === 'counter' && (
          <div className="animate-in fade-in duration-200">
            <ManualCounterBooking />
          </div>
        )}

        {/* Tab 3: Boarding Manifest & Dispatch */}
        {activeTab === 'manifest' && (
          <div className="animate-in fade-in duration-200">
            <PassengerManifestDispatch />
          </div>
        )}

        {/* Tab 4: Ticket Lookup & Overrides */}
        {activeTab === 'lookup' && (
          <div className="animate-in fade-in duration-200">
            <TicketLookupAndOverrides />
          </div>
        )}

        {/* Tab 5: Admin Authority & Scope */}
        {activeTab === 'authority' && (
          <div className="animate-in fade-in duration-200">
            <AdminAuthorityOverview onNavigateTab={(tab) => setActiveTab(tab as AdminTab)} />
          </div>
        )}
      </div>
    </main>
  )
}
