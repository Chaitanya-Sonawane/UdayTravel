import React from 'react'

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
    <section className="p-4 border-t border-gray-100">
      <h3 className="font-semibold text-base text-[#111] mb-3">Passengers</h3>

      <div className="space-y-3">
        {passengers.map((p, idx) => (
          <div
            key={`${p.name}-${p.seatNo}-${idx}`}
            className="flex items-center justify-between gap-2"
          >
            {/* Left: Name and {GENDER} {age} years */}
            <div className="min-w-0">
              <p className="font-medium text-sm text-[#111] leading-tight truncate">
                {p.name}
              </p>
              <p className="text-xs text-[#6b7280] mt-0.5">
                {p.gender} {p.age} years
              </p>
            </div>

            {/* Right: Small muted-bold "Seat No. {seat}" with warm amber badge */}
            <div className="text-right flex-shrink-0">
              <span className="text-xs font-bold text-amber-900 bg-amber-50 px-2 py-0.5 rounded border border-amber-200/60">
                Seat No. {p.seatNo}
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
