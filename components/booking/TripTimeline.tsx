'use client'

import React from 'react'
import { MapPin, Clock, Zap, ExternalLink, ChevronRight } from 'lucide-react'

export type TripTimelineProps = {
  passengerCount: number
  trip: {
    seatType?: string
    departure: {
      time: string
      date: string
      place: string
      boardingPoint: string
      boardingLandmark?: string
    }
    arrival: {
      time: string
      date: string
      place: string
      dropPoint: string
      dropLandmark?: string
    }
    duration: string
  }
}

/**
 * Converts 24h ("10:00", "13:15") or 12h ("7:00 AM") time to standardized 12h ("10:00 AM", "01:15 PM").
 */
export function formatDisplayTime(timeStr?: string, defaultFallback = '06:30 AM'): string {
  if (!timeStr) return defaultFallback
  const trimmed = timeStr.trim()
  if (/am|pm/i.test(trimmed)) {
    const match = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i)
    if (match && match[1] && match[2] && match[3]) {
      const hh = String(parseInt(match[1], 10)).padStart(2, '0')
      return `${hh}:${match[2]} ${match[3].toUpperCase()}`
    }
    return trimmed
  }
  const match = trimmed.match(/^(\d{1,2}):(\d{2})$/)
  if (match && match[1] && match[2]) {
    const hours = parseInt(match[1], 10)
    const minutes = match[2]
    const period = hours >= 12 ? 'PM' : 'AM'
    const displayH = hours % 12 === 0 ? 12 : hours % 12
    return `${String(displayH).padStart(2, '0')}:${minutes} ${period}`
  }
  return trimmed
}

/**
 * Calculates 15-minute prior reporting time for both 12h and 24h inputs.
 */
export function getReportByTime(depTime: string): string {
  try {
    const match = depTime.match(/(\d+):(\d+)\s*(AM|PM)?/i)
    if (!match || !match[1] || !match[2]) return '06:15 AM'
    let hours = parseInt(match[1], 10)
    let minutes = parseInt(match[2], 10)
    let ampm = match[3] ? match[3].toUpperCase() : null

    // If no AM/PM indicator, infer from 24h format
    if (!ampm) {
      ampm = hours >= 12 ? 'PM' : 'AM'
      hours = hours % 12 === 0 ? 12 : hours % 12
    }

    minutes -= 15
    if (minutes < 0) {
      minutes += 60
      hours -= 1
      if (hours === 0) {
        hours = 12
      } else if (hours < 0) {
        hours = 11
        ampm = ampm === 'PM' ? 'AM' : 'PM'
      }
    }
    const mm = String(minutes).padStart(2, '0')
    const hh = String(hours).padStart(2, '0')
    return `${hh}:${mm} ${ampm}`
  } catch {
    return '06:15 AM'
  }
}

/**
 * Strips conflicting / stale static time suffixes (e.g. "Sangamwadi — 6:30 PM" -> "Sangamwadi", "Office · 18:30" -> "Office").
 */
export function cleanPointName(name: string): string {
  if (!name) return ''
  return name
    .replace(/[\s\u00A0]*[-—–·|:(\[]*[\s\u00A0]*\b\d{1,2}:\d{2}\b[\s\u00A0]*(?:am|pm)?[\s\u00A0]*[)\]]?/gi, '')
    .replace(/[\s\u00A0]*[-—–·|]+[\s\u00A0]*$/, '')
    .trim()
}

/**
 * Stop and city specific landmark lookup
 */
const LANDMARK_DICTIONARY: Record<string, string> = {
  // Pune landmarks
  sangamwadi: 'Sangamwadi Parking No. 1, Near Pune RTO • Gate 2 Departure Bay',
  wakadewadi: 'Wakadewadi Parking Area • Old Mumbai-Pune Highway',
  yerwada: 'Yerwada Chowk • Near Gunjan Theatre, Nagar Road',
  'four points': 'Four Points by Sheraton • Viman Nagar Airport Corner',
  'viman nagar': 'Viman Nagar Corner • Airport Road Junction',
  kharadi: 'Kharadi Bypass Chowk • Near Radisson Blu Hotel',
  'kharadi bye pass': 'Kharadi Bypass Chowk • Near Radisson Blu Hotel',
  wagholi: 'Wagholi Bus Stop • Nagar Highway Hub',
  'shastri nagar': 'Shastri Nagar Chowk • Nagar Road Junction',
  ramwadi: 'Ramwadi Naka • Near Metro Station',
  wadgaonsheri: 'Wadgaonsheri Phata • Nagar Road',
  'chandan nagar': 'Chandan Nagar Water Tank • Nagar Road',
  'tata guard room': 'Tata Guard Room • Kharadi Bypass',
  shivajinagar: 'Shivajinagar Bus Terminal • Metro Interchange',
  swargate: 'Swargate Bus Station • Jedhe Chowk',

  // Ahilyanagar (Ahmednagar) landmarks
  office: 'Uday Travels Office, Nagar-Pune Road • Near Maliwada Bus Stand',
  'uday travels office': 'Uday Travels Office, Nagar-Pune Road • Near Maliwada Bus Stand',
  maliwada: 'Near Maliwada Bus Stand • Gate 2 Departure Bay',
  'ekvira chowk': 'Ekvira Chowk Junction • Nagar-Pune Highway Bypass',
  delhigate: 'Delhigate Circle • Near City Entrance & Auto Stand',
  'swastik chowk': 'Swastik Chowk Hub • Old Bus Stand Corner',
  'nepti naka': 'Nepti Naka Chowk • Nagar Highway Corner',
  'nepti naka chowk': 'Nepti Naka Chowk • Nagar Highway Corner',
  'bhistbag chowk': 'Bhistbag Chowk • Near Pipeline Road',
  'balaji kaman': 'Balaji Kaman • Nagar City Approach',
  'sona nagar': 'Sona Nagar Chowk • Nagar Road',
  'professor chowk': 'Professor Chowk • Savedi Road',
  'premdan chowk': 'Premdan Chowk • Savedi Road',
  'zopadi canteen': 'Zopadi Canteen Chowk • Nagar City Center',
  'sarda college': 'Sarda College Road • Near City Center',
  'vinayak nagar': 'Vinayak Nagar Stop • Nagar Ring Road',
  'kinetic chowk': 'Kinetic Chowk • Nagar-Pune Highway',
  'rangoli hotel': 'Rangoli Hotel Corner • Nagar-Pune Highway',
  'ambika nagar': 'Ambika Nagar Stop • Nagar Bypass',
  'yashodha nagar': 'Yashodha Nagar Stop • Nagar City',
  'hdfc bank': 'Near HDFC Bank Branch • Nagar City',
  'vaani nagar': 'Vaani Nagar Corner • Nagar Road',
  'petrol pump': 'Highway Petrol Pump • Nagar Bypass',
}

export function resolveLandmark(
  providedLandmark: string | undefined,
  stopName: string,
  cityName: string,
  isBoarding: boolean
): string {
  if (providedLandmark && providedLandmark.trim().length > 0) {
    return providedLandmark
  }

  const cleanName = cleanPointName(stopName).toLowerCase()
  const city = (cityName || '').toLowerCase()

  for (const [key, landmark] of Object.entries(LANDMARK_DICTIONARY)) {
    if (cleanName.includes(key)) {
      return landmark
    }
  }

  const isPune = city.includes('pune')
  if (isPune) {
    return 'Central Pune Terminal • Metro & Auto Stand adjacent'
  } else {
    return isBoarding
      ? 'Near Maliwada Bus Stand • Gate 2 Departure Bay'
      : 'Ahilyanagar City Terminal • Maliwada & Auto Stand adjacent'
  }
}

export function TripTimeline({ passengerCount, trip }: TripTimelineProps) {
  const seatLabel = passengerCount === 1 ? '1 Seat' : `${passengerCount} Seats`
  const summaryLine = trip.seatType ? `${trip.seatType} · ${seatLabel}` : seatLabel

  const displayDepTime = formatDisplayTime(trip.departure.time, '06:30 AM')
  const displayArrTime = formatDisplayTime(trip.arrival.time, '09:45 AM')
  const reportTime = getReportByTime(trip.departure.time || displayDepTime)

  const rawBoarding = trip.departure.boardingPoint || 'Uday Travels Office, Nagar-Pune Road'
  const cleanBoardingTitle = cleanPointName(rawBoarding) || rawBoarding
  const boardingSubtitle = resolveLandmark(
    trip.departure.boardingLandmark,
    cleanBoardingTitle,
    trip.departure.place,
    true
  )

  const rawDrop = trip.arrival.dropPoint || 'Sangamwadi Parking No. 1, Near RTO'
  const cleanDropTitle = cleanPointName(rawDrop) || rawDrop
  const dropSubtitle = resolveLandmark(
    trip.arrival.dropLandmark,
    cleanDropTitle,
    trip.arrival.place,
    false
  )

  const boardingMapQuery = encodeURIComponent(`${cleanBoardingTitle}, ${trip.departure.place}`)
  const boardingMapUrl = `https://www.google.com/maps/search/?api=1&query=${boardingMapQuery}`

  const dropMapQuery = encodeURIComponent(`${cleanDropTitle}, ${trip.arrival.place}`)
  const dropMapUrl = `https://www.google.com/maps/search/?api=1&query=${dropMapQuery}`

  return (
    <section className="pt-1 pb-4 sm:pb-5 font-jakarta">
      {/* Route Header with NH60 Express Badge */}
      <div className="flex items-start justify-between gap-3 mb-5">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-snug flex items-center gap-2 flex-wrap">
            <span>{trip.departure.place} to {trip.arrival.place}</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
            {summaryLine}
          </p>
        </div>
        <span className="px-3 py-1 rounded-full bg-amber-50 border border-amber-300 text-amber-900 text-xs font-extrabold tracking-wide shrink-0 shadow-2xs">
          NH60 Express
        </span>
      </div>

      {/* Professional Continuous Route Track */}
      <div className="relative pl-7 sm:pl-8">
        {/* ============================================================== */}
        {/* 1. ORIGIN / DEPARTURE SECTION */}
        {/* ============================================================== */}
        <div className="relative pb-5">
          {/* Continuous Track Spine (Origin down to transit) */}
          <div 
            aria-hidden="true"
            className="absolute -left-7 sm:-left-8 top-3 bottom-0 w-[2px] translate-x-[9px] bg-gradient-to-b from-[#F8B018] via-amber-300 to-amber-300 pointer-events-none" 
          />

          {/* Top Amber Dot */}
          <div 
            aria-hidden="true"
            className="absolute -left-7 sm:-left-8 top-1 w-5 h-5 flex items-center justify-center z-10"
          >
            <div className="w-3.5 h-3.5 rounded-full bg-[#F8B018] ring-4 ring-amber-300/50 shadow-xs" />
          </div>

          {/* Departure Content */}
          <div className="min-w-0">
            {/* Time & City Header Row */}
            <div className="flex items-center justify-between gap-2 sm:gap-3 flex-wrap">
              <div className="flex items-baseline gap-2 min-w-0">
                <span className="font-mono font-black text-base sm:text-lg text-slate-900 tracking-tight whitespace-nowrap">
                  {displayDepTime}
                </span>
                <span className="font-bold text-base sm:text-lg text-slate-900 truncate">
                  {trip.departure.place}
                </span>
              </div>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-300/80 text-amber-900 text-[11px] font-bold shrink-0 shadow-2xs">
                <Clock size={12} className="text-amber-700" />
                <span>Report by {reportTime}</span>
              </span>
            </div>

            {/* Boarding Point Info Card */}
            <div className="mt-2.5 p-3.5 sm:p-4 rounded-xl bg-amber-50/60 border border-amber-200/90 shadow-2xs transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-900">
                  <span className="w-5 h-5 rounded-md bg-amber-500/20 text-amber-800 flex items-center justify-center shrink-0">
                    <MapPin size={12} className="stroke-[2.5]" />
                  </span>
                  <span className="font-extrabold text-slate-900">Boarding: {cleanBoardingTitle}</span>
                </div>
                <p className="text-[11px] sm:text-xs text-slate-600 font-medium mt-1 ml-7 leading-relaxed break-words">
                  {boardingSubtitle}
                </p>
              </div>
              <a
                href={boardingMapUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="self-start sm:self-center px-3 py-1.5 rounded-lg border border-amber-300 bg-white hover:bg-amber-100 text-amber-900 font-bold text-xs flex items-center gap-1.5 shadow-2xs shrink-0 transition-colors cursor-pointer"
              >
                <span>View Map</span>
                <ExternalLink size={12} />
              </a>
            </div>
          </div>
        </div>

        {/* ============================================================== */}
        {/* 2. MID-JOURNEY DURATION & TRANSIT BAR */}
        {/* ============================================================== */}
        <div className="relative py-2 my-1">
          {/* Continuous Track Spine (Transit through duration bar) */}
          <div 
            aria-hidden="true"
            className="absolute -left-7 sm:-left-8 top-0 bottom-0 w-[2px] translate-x-[9px] bg-gradient-to-b from-amber-300 via-slate-300 to-slate-400 pointer-events-none" 
          />

          {/* Small Transit Marker on Spine */}
          <div 
            aria-hidden="true"
            className="absolute -left-7 sm:-left-8 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center z-10"
          >
            <div className="w-2 h-2 rounded-full bg-slate-400 ring-2 ring-white shadow-xs" />
          </div>

          <div className="min-w-0">
            <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-50 border border-slate-200/90 text-slate-700 text-[11px] sm:text-xs font-bold shadow-2xs">
              <Zap size={13} className="text-amber-500 fill-amber-500 shrink-0" />
              <span>{trip.duration || '3h 15m'} · ~122 km · Non-Stop Highway Express</span>
            </span>
          </div>
        </div>

        {/* ============================================================== */}
        {/* 3. DESTINATION / ARRIVAL SECTION */}
        {/* ============================================================== */}
        <div className="relative pt-3">
          {/* Continuous Track Spine (Ending cleanly at destination dot) */}
          <div 
            aria-hidden="true"
            className="absolute -left-7 sm:-left-8 top-0 h-6 w-[2px] translate-x-[9px] bg-slate-400 pointer-events-none" 
          />

          {/* Bottom Navy Dot */}
          <div 
            aria-hidden="true"
            className="absolute -left-7 sm:-left-8 top-4 w-5 h-5 flex items-center justify-center z-10"
          >
            <div className="w-3.5 h-3.5 rounded-full bg-[#0F172A] ring-4 ring-slate-300/70 shadow-xs" />
          </div>

          {/* Arrival Content */}
          <div className="min-w-0">
            {/* Time & City Header Row */}
            <div className="flex items-center justify-between gap-2 sm:gap-3 flex-wrap">
              <div className="flex items-baseline gap-2 min-w-0">
                <span className="font-mono font-black text-base sm:text-lg text-slate-900 tracking-tight whitespace-nowrap">
                  {displayArrTime}
                </span>
                <span className="font-bold text-base sm:text-lg text-slate-900 truncate">
                  {trip.arrival.place}
                </span>
              </div>
              <span className="text-[11px] sm:text-xs text-slate-500 font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 border border-slate-200/80 shrink-0 shadow-2xs">
                Same Day
              </span>
            </div>

            {/* Drop Point Info Card */}
            <div className="mt-2.5 p-3.5 sm:p-4 rounded-xl bg-slate-50 border border-slate-200/90 shadow-2xs transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-900">
                  <span className="w-5 h-5 rounded-md bg-slate-200 text-slate-800 flex items-center justify-center shrink-0">
                    <MapPin size={12} className="stroke-[2.5]" />
                  </span>
                  <span className="font-extrabold text-slate-900">Drop: {cleanDropTitle}</span>
                </div>
                <p className="text-[11px] sm:text-xs text-slate-600 font-medium mt-1 ml-7 leading-relaxed break-words">
                  {dropSubtitle}
                </p>
              </div>
              <a
                href={dropMapUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="self-start sm:self-center px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-800 font-bold text-xs flex items-center gap-1.5 shadow-2xs shrink-0 transition-colors cursor-pointer"
              >
                <span>View Map</span>
                <ExternalLink size={12} />
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default TripTimeline
