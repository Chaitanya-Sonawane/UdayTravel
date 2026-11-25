'use client'

import React from 'react'
import { User } from 'lucide-react'

export type Passenger = {
  name: string
  gender: 'MALE' | 'FEMALE' | 'OTHER'
  age: number
  seatNo: string
}

export type PassengerListProps = {
  passengers: Passenger[]
}

export function PassengerList({ passengers }: PassengerListProps) {
  return (
    <section className="py-4 sm:py-5 font-jakarta">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-xs tracking-wider uppercase text-slate-400">
          PASSENGERS &amp; SEATS
        </h3>
        <span className="text-xs font-semibold text-slate-500">
          {passengers.length} {passengers.length === 1 ? 'Traveller' : 'Travellers'}
        </span>
      </div>

      <div className="space-y-2">
        {passengers.map((p, idx) => {
          const genderText = p.gender === 'FEMALE' ? 'Female' : 'Male'
          const seatDisplay = p.seatNo.toLowerCase().startsWith('seat')
            ? p.seatNo
            : `Seat ${p.seatNo}`
          return (
            <div
              key={`${p.name}-${p.seatNo}-${idx}`}
              className="flex items-center justify-between gap-3 py-2 px-1 rounded-xl transition-all"
            >
              {/* Left: Avatar with User Icon + Name and Info */}
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-full bg-amber-50/90 border border-amber-200/70 flex items-center justify-center text-[#F8B018] shrink-0">
                  <User size={18} strokeWidth={2.2} />
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-sm sm:text-base text-slate-900 leading-tight truncate">
                    {p.name}
                  </p>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    {genderText} • {p.age} yrs
                  </p>
                </div>
              </div>

              {/* Right: Signature Yellow Pill Badge */}
              <div className="text-right flex-shrink-0">
                <span className="inline-flex items-center px-3 py-1 rounded-full bg-amber-50/80 text-amber-900 border border-amber-300 text-xs font-bold shadow-2xs">
                  {seatDisplay}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

export default PassengerList
