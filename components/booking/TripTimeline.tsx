import React from 'react'

export type TripTimelineProps = {
  passengerCount: number
  trip: {
    seatType?: string
    departure: {
      time: string
      date: string
      place: string
      boardingPoint: string
    }
    arrival: {
      time: string
      date: string
      place: string
      dropPoint: string
    }
    duration: string
  }
}

export function TripTimeline({ passengerCount, trip }: TripTimelineProps) {
  const seatLabel = passengerCount === 1 ? '1 Seat' : `${passengerCount} Seats`
  const summaryLine = trip.seatType ? `${seatLabel} · ${trip.seatType}` : seatLabel

  return (
    <section className="p-4 border-t border-gray-100">
      {/* Line 1: {n} Seat · {seatType} */}
      <p className="text-xs text-[#6b7280] mb-4">{summaryLine}</p>

      {/* Vertical Timeline */}
      <div className="flex gap-3.5 min-h-[148px]">
        {/* Left Column: Departure time + date / Duration / Arrival time + date */}
        <div className="w-16 sm:w-20 flex-shrink-0 flex flex-col justify-between text-left">
          {/* Departure */}
          <div>
            <span className="block font-bold text-sm sm:text-base text-[#111] leading-tight">
              {trip.departure.time}
            </span>
            <span className="block text-xs text-[#6b7280] mt-0.5">
              {trip.departure.date}
            </span>
          </div>

          {/* Duration in the middle */}
          <div className="my-auto py-2">
            <span className="text-[11px] font-semibold text-[#B45309] bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200/60 inline-block">
              {trip.duration}
            </span>
          </div>

          {/* Arrival */}
          <div>
            <span className="block font-bold text-sm sm:text-base text-[#111] leading-tight">
              {trip.arrival.time}
            </span>
            <span className="block text-xs text-[#6b7280] mt-0.5">
              {trip.arrival.date}
            </span>
          </div>
        </div>

        {/* Center Column: Top dot, thick light-gray vertical line, Bottom dot with Yellow theme */}
        <div className="flex flex-col items-center justify-between py-1 flex-shrink-0 w-3">
          {/* Top Dot */}
          <div className="w-2.5 h-2.5 rounded-full bg-[#F8B018] ring-2 ring-[#F8B018]/30 flex-shrink-0" />

          {/* Thick Light-Gray Vertical Line */}
          <div className="w-[2px] bg-gradient-to-b from-[#F8B018]/40 via-gray-200 to-[#F8B018]/40 flex-1 my-1" />

          {/* Bottom Dot */}
          <div className="w-2.5 h-2.5 rounded-full bg-[#F8B018] ring-2 ring-[#F8B018]/30 flex-shrink-0" />
        </div>

        {/* Right Column: Departure place + boarding point / Arrival place + drop point */}
        <div className="flex-1 flex flex-col justify-between text-left min-w-0">
          {/* Departure Place & Boarding Point */}
          <div>
            <span className="block font-bold text-sm sm:text-base text-[#111] leading-tight truncate">
              {trip.departure.place}
            </span>
            <span className="block text-xs text-[#6b7280] mt-0.5 truncate">
              {trip.departure.boardingPoint}
            </span>
          </div>

          {/* Spacer aligning with duration */}
          <div className="my-auto py-2" aria-hidden="true" />

          {/* Arrival Place & Drop Point */}
          <div>
            <span className="block font-bold text-sm sm:text-base text-[#111] leading-tight truncate">
              {trip.arrival.place}
            </span>
            <span className="block text-xs text-[#6b7280] mt-0.5 truncate">
              {trip.arrival.dropPoint}
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}
