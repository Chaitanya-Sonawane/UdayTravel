'use client'

import React from 'react'
import { Users, User } from 'lucide-react'

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
    <section className="p-4 sm:p-5">
      <div className="flex items-center justify-between mb-3.5">
        <h3 className="font-extrabold text-sm sm:text-base text-gray-950 flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-amber-500/10 text-amber-700 flex items-center justify-center">
            <Users size={14} />
          </div>
          <span>Passengers &amp; Seats</span>
        </h3>
        <span className="text-xs font-bold text-gray-500">
          {passengers.length} {passengers.length === 1 ? 'Traveller' : 'Travellers'}
        </span>
      </div>

      <div className="space-y-2.5">
        {passengers.map((p, idx) => {
          const isFemale = p.gender === 'FEMALE'
          return (
            <div
              key={`${p.name}-${p.seatNo}-${idx}`}
              className="flex items-center justify-between gap-3 p-3 rounded-xl border border-gray-100 bg-gray-50/60 hover:bg-white hover:border-amber-200/80 transition-all"
            >
              {/* Left: Avatar + Name and gender/age pill */}
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    isFemale
                      ? 'bg-rose-100 text-rose-700'
                      : 'bg-amber-100 text-amber-900'
                  }`}
                >
                  <User size={15} />
                </div>
                <div className="min-w-0">
                  <p className="font-black text-sm text-gray-950 leading-tight truncate">
                    {p.name}
                  </p>
                  <div className="flex items-center gap-1.5 mt-1 text-xs text-gray-500">
                    <span
                      className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md border tracking-wider ${
                        isFemale
                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                          : 'bg-amber-50 text-amber-950 border-amber-300'
                      }`}
                    >
                      {p.gender}
                    </span>
                    <span className="text-[11px] font-semibold text-gray-500">
                      {p.age} years
                    </span>
                  </div>
                </div>
              </div>

              {/* Right: Gold Signature Seat Badge */}
              <div className="text-right flex-shrink-0">
                <span className="inline-flex items-center px-3 py-1 rounded-xl bg-[#F8B018] text-[#0B0F19] text-xs font-black shadow-xs border border-amber-400">
                  Seat No. {p.seatNo}
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
