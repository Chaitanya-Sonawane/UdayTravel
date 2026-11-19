'use client'

import React from 'react'
import {
  ShieldCheck,
  Lock,
  Key,
  Users,
  Bus,
  Ticket,
  ClipboardList,
  AlertTriangle,
  Wallet,
  CheckCircle2,
  FileText,
  Clock,
  ArrowRight,
  Database,
  DollarSign,
  Activity,
} from 'lucide-react'

export function AdminAuthorityOverview({ onNavigateTab }: { onNavigateTab?: (tab: string) => void }) {
  const capabilities = [
    {
      title: 'Manual Counter & Phone Booking',
      tag: 'AUTHORIZED',
      color: 'amber',
      icon: Ticket,
      description:
        'Issue confirmed passenger tickets on behalf of walk-in counter customers or phone callers. Accept Cash or Counter UPI, choose seats directly on visual bus map, and generate instant PNR with printable ticket receipts.',
      actionTab: 'counter',
      actionLabel: 'Open Counter Booking',
    },
    {
      title: 'Live Boarding Manifest & Dispatch',
      tag: 'AUTHORIZED',
      color: 'emerald',
      icon: ClipboardList,
      description:
        'View the full trip passenger list sorted by seat number. Toggle passenger boarding check-in in real-time, view passenger ages & genders, call passengers or send WhatsApp departure reminders with one click.',
      actionTab: 'manifest',
      actionLabel: 'Open Boarding Console',
    },
    {
      title: 'Fleet & Daily Route Scheduling',
      tag: 'AUTHORIZED',
      color: 'blue',
      icon: Bus,
      description:
        'Schedule daily departures across active routes. Assign registered buses (MH 16 DP 4951, MH 16 DV 1003, MH 16 DP 3951), switch seat layouts between 55, 44, and 33 seaters, and set custom ticket pricing per trip.',
      actionTab: 'scheduler',
      actionLabel: 'Open Scheduler',
    },
    {
      title: 'Ticket Search & Emergency Overrides',
      tag: 'SUPERVISORY',
      color: 'purple',
      icon: ShieldCheck,
      description:
        'Supervisory authority to look up any ticket in the system by PNR or phone number. Execute emergency cancellations bypassing customer cutoffs, automatically refunding the customer and freeing seats for resale.',
      actionTab: 'lookup',
      actionLabel: 'Open Ticket Lookup',
    },
    {
      title: 'Fair Wallet & Financial Governance',
      tag: 'PROTECTED',
      color: 'teal',
      icon: Wallet,
      description:
        'Oversight of user wallet balances. All wallet transactions are backed by an immutable ledger (wallets_ledger) with zero floating-point math, strict integer paise arithmetic, and 100% fair cancellation refund splits (25% bank source, 75% wallet credit).',
      actionTab: null,
      actionLabel: 'Immutable Ledger Enforced',
    },
  ]

  const guardrails = [
    {
      label: 'Zero Double-Booking Guarantee',
      desc: 'ACID database transactions ensure that counter bookings and online user bookings never overlap on the same seat.',
    },
    {
      label: 'Immutable Audit Trail',
      desc: 'Tickets and transactions cannot be permanently erased. Every manual booking, cancellation override, and status change is timestamped.',
    },
    {
      label: 'No Malpractice Wallet Policy',
      desc: 'Wallet balances cannot be arbitrarily manipulated without an atomic transaction record in the ledger.',
    },
    {
      label: 'Exact Integer Paise Math',
      desc: 'All fares, refunds, and credits use integer paise (₹1 = 100 paise) preventing rounding leakages or discrepancies.',
    },
  ]

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <section className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 text-white rounded-3xl p-6 sm:p-8 shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/20 text-[#F8B018] text-xs font-black uppercase tracking-widest border border-amber-400/30">
              <ShieldCheck size={14} />
              <span>Administrative Scope &amp; Governance Matrix</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Uday Travels Operator &amp; Dispatch Authority
            </h2>
            <p className="text-xs sm:text-sm text-gray-300 leading-relaxed">
              This console provides operational access for fleet scheduling, counter walk-in ticketing, live passenger manifest dispatching, and authorized customer support overrides.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 shrink-0">
            <div className="p-3 bg-white/5 border border-white/10 rounded-2xl text-center">
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Role</span>
              <strong className="text-sm font-black text-white">Master Dispatcher</strong>
            </div>
            <div className="p-3 bg-white/5 border border-white/10 rounded-2xl text-center">
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Security</span>
              <strong className="text-sm font-black text-emerald-400">ACID Enforced</strong>
            </div>
          </div>
        </div>
      </section>

      {/* Authority Matrix Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {capabilities.map((c) => {
          const Icon = c.icon
          return (
            <div
              key={c.title}
              className="bg-white border border-gray-200 rounded-3xl p-5 shadow-xs flex flex-col justify-between space-y-4 hover:border-amber-400 transition-colors"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-[#F8B018]/30 flex items-center justify-center text-amber-700 font-bold">
                    <Icon size={20} />
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-gray-100 text-gray-800 border border-gray-200">
                    {c.tag}
                  </span>
                </div>

                <div>
                  <h3 className="text-sm font-black text-gray-900">{c.title}</h3>
                  <p className="text-xs text-gray-600 mt-1 leading-relaxed">{c.description}</p>
                </div>
              </div>

              {c.actionTab && onNavigateTab ? (
                <button
                  type="button"
                  onClick={() => onNavigateTab(c.actionTab!)}
                  className="w-full py-2.5 px-3 rounded-xl bg-gray-100 hover:bg-[#F8B018] text-gray-900 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-xs"
                >
                  <span>{c.actionLabel}</span>
                  <ArrowRight size={13} />
                </button>
              ) : (
                <div className="py-2 px-3 rounded-xl bg-emerald-50 text-emerald-800 text-[11px] font-bold text-center border border-emerald-100">
                  {c.actionLabel}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Guardrails & Operational Restrictions */}
      <section className="bg-white border border-gray-200 rounded-3xl p-5 md:p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2.5">
          <Lock size={18} className="text-amber-600" />
          <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider">
            Built-In Safety Guardrails &amp; Anti-Malpractice Controls
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {guardrails.map((g) => (
            <div key={g.label} className="p-4 rounded-2xl bg-gray-50 border border-gray-100 space-y-1">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                <strong className="text-xs font-bold text-gray-900">{g.label}</strong>
              </div>
              <p className="text-xs text-gray-600 pl-6 leading-relaxed">{g.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Fleet & System Status Overview */}
      <section className="bg-white border border-gray-200 rounded-3xl p-5 md:p-6 shadow-xs">
        <h3 className="text-xs font-black uppercase tracking-wider text-gray-400 mb-3">
          Active Fleet &amp; Route Configuration
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3.5 bg-gray-50 rounded-2xl border border-gray-100 space-y-1">
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Bus 1 (55 Seats)</span>
            <strong className="text-gray-900 font-mono block">MH 16 DP 4951</strong>
            <span className="text-gray-500 text-[11px]">3+2 Coach Layout · 55 Passenger Capacity</span>
          </div>

          <div className="p-3.5 bg-gray-50 rounded-2xl border border-gray-100 space-y-1">
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Bus 2 (44 Seats)</span>
            <strong className="text-gray-900 font-mono block">MH 16 DV 1003</strong>
            <span className="text-gray-500 text-[11px]">2+2 Coach Layout · 44 Passenger Capacity</span>
          </div>

          <div className="p-3.5 bg-gray-50 rounded-2xl border border-gray-100 space-y-1">
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Bus 3 (33 Seats)</span>
            <strong className="text-gray-900 font-mono block">MH 16 DP 3951</strong>
            <span className="text-gray-500 text-[11px]">2+2 Compact Layout · 33 Passenger Capacity</span>
          </div>
        </div>
      </section>
    </div>
  )
}
