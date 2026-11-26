'use client'

import React from 'react'

export interface AdminBusSeatGraphicProps {
  seatId: string
  status?: 'available' | 'selected' | 'booked' | 'female' | 'male' | 'blocked' | 'ladies'
  gender?: 'F' | 'M' | 'female' | 'male' | null
  isSelected?: boolean
  isOccupied?: boolean
  isBlocked?: boolean
  width?: number
  height?: number
  className?: string
  showSeatNumber?: boolean
}

export function AdminBusSeatGraphic({
  seatId,
  status = 'available',
  gender,
  isSelected,
  isOccupied,
  isBlocked,
  width = 36,
  height = 42,
  className = '',
  showSeatNumber = true,
}: AdminBusSeatGraphicProps) {
  // Determine effective status
  const effectiveSelected = Boolean(isSelected || status === 'selected')
  const effectiveBlocked = Boolean(isBlocked || status === 'blocked')
  const isFemale =
    gender === 'F' ||
    gender === 'female' ||
    status === 'female' ||
    status === 'ladies'
  const isMale = gender === 'M' || gender === 'male' || status === 'male'
  const effectiveOccupied = Boolean(
    isOccupied ||
      status === 'booked' ||
      status === 'female' ||
      status === 'male' ||
      status === 'ladies'
  )

  // 1. Selected Seat: Golden Yellow (#F8B018) matching frontend
  if (effectiveSelected) {
    return (
      <svg
        width={width}
        height={height}
        viewBox="0 0 36 42"
        fill="none"
        className={`transition-all duration-150 filter drop-shadow-[0_3px_8px_rgba(248,176,24,0.4)] ${className}`}
        aria-hidden="true"
      >
        {/* Headrest & Backrest */}
        <path
          d="M7 4C7 2.89543 7.89543 2 9 2H27C28.1046 2 29 2.89543 29 4V38C29 39.1046 28.1046 40 27 40H9C7.89543 40 7 39.1046 7 38V4Z"
          fill="#F8B018"
          stroke="#0B0F19"
          strokeWidth="1.8"
        />
        {/* Cushion divider line */}
        <line x1="7" y1="29" x2="29" y2="29" stroke="#B45309" strokeWidth="1.8" />
        {/* Left Armrest */}
        <rect x="2" y="14" width="5.5" height="24" rx="2" fill="#F8B018" stroke="#0B0F19" strokeWidth="1.8" />
        {/* Right Armrest */}
        <rect x="28.5" y="14" width="5.5" height="24" rx="2" fill="#F8B018" stroke="#0B0F19" strokeWidth="1.8" />
        {/* Seat Number Stamp */}
        {showSeatNumber && (
          <text
            x="18"
            y="16"
            textAnchor="middle"
            dominantBaseline="central"
            fontSize="9"
            fontFamily="ui-monospace, monospace"
            fontWeight="900"
            fill="#0B0F19"
          >
            {seatId}
          </text>
        )}
        {/* Selected Checkmark or Dot on lower cushion */}
        <circle cx="18" cy="34.5" r="2.5" fill="#0B0F19" />
      </svg>
    )
  }

  // 2. Booked by Female / Ladies Reserved matching frontend (#FCE7F3 + #E879F9 + #A855F7)
  if (effectiveOccupied && isFemale) {
    return (
      <svg
        width={width}
        height={height}
        viewBox="0 0 36 42"
        fill="none"
        className={`transition-all duration-150 ${className}`}
        aria-hidden="true"
      >
        {/* Backrest: Soft pink */}
        <path
          d="M7 4C7 2.89543 7.89543 2 9 2H27C28.1046 2 29 2.89543 29 4V29H7V4Z"
          fill="#FCE7F3"
          stroke="#5A6474"
          strokeWidth="1.6"
        />
        {/* Front Band / Cushion: Vibrant Pink/Purple */}
        <rect x="7" y="29" width="22" height="11" rx="1" fill="#E879F9" stroke="#A855F7" strokeWidth="1.6" />
        {/* Left Armrest */}
        <rect x="2" y="14" width="5.5" height="25" rx="2" fill="#E879F9" stroke="#A855F7" strokeWidth="1.6" />
        {/* Right Armrest */}
        <rect x="28.5" y="14" width="5.5" height="25" rx="2" fill="#E879F9" stroke="#A855F7" strokeWidth="1.6" />
        {/* Seat Number Stamp */}
        {showSeatNumber && (
          <text
            x="18"
            y="16"
            textAnchor="middle"
            dominantBaseline="central"
            fontSize="9"
            fontFamily="ui-monospace, monospace"
            fontWeight="900"
            fill="#831843"
          >
            {seatId}
          </text>
        )}
        {/* Female Tag Symbol */}
        <text
          x="18"
          y="34.5"
          textAnchor="middle"
          dominantBaseline="central"
          fontSize="7.5"
          fontFamily="ui-monospace, monospace"
          fontWeight="900"
          fill="#FFFFFF"
        >
          F
        </text>
      </svg>
    )
  }

  // 3. Booked Seat: Slate grey upholstery matching frontend (#D8DAE0 + #5A6474)
  if (effectiveOccupied) {
    return (
      <svg
        width={width}
        height={height}
        viewBox="0 0 36 42"
        fill="none"
        className={`transition-all duration-150 ${className}`}
        aria-hidden="true"
      >
        <path
          d="M7 4C7 2.89543 7.89543 2 9 2H27C28.1046 2 29 2.89543 29 4V38C29 39.1046 28.1046 40 27 40H9C7.89543 40 7 39.1046 7 38V4Z"
          fill="#D8DAE0"
          stroke="#5A6474"
          strokeWidth="1.6"
        />
        <line x1="7" y1="29" x2="29" y2="29" stroke="#5A6474" strokeWidth="1.6" />
        <rect x="2" y="14" width="5.5" height="24" rx="2" fill="#D8DAE0" stroke="#5A6474" strokeWidth="1.6" />
        <rect x="28.5" y="14" width="5.5" height="24" rx="2" fill="#D8DAE0" stroke="#5A6474" strokeWidth="1.6" />
        {showSeatNumber && (
          <text
            x="18"
            y="16"
            textAnchor="middle"
            dominantBaseline="central"
            fontSize="9"
            fontFamily="ui-monospace, monospace"
            fontWeight="900"
            fill="#1E293B"
          >
            {seatId}
          </text>
        )}
        {isMale && (
          <text
            x="18"
            y="34.5"
            textAnchor="middle"
            dominantBaseline="central"
            fontSize="7.5"
            fontFamily="ui-monospace, monospace"
            fontWeight="900"
            fill="#475569"
          >
            M
          </text>
        )}
      </svg>
    )
  }

  // 4. Blocked / Out of Service
  if (effectiveBlocked) {
    return (
      <svg
        width={width}
        height={height}
        viewBox="0 0 36 42"
        fill="none"
        className={`transition-all duration-150 opacity-55 ${className}`}
        aria-hidden="true"
      >
        <path
          d="M7 4C7 2.89543 7.89543 2 9 2H27C28.1046 2 29 2.89543 29 4V38C29 39.1046 28.1046 40 27 40H9C7.89543 40 7 39.1046 7 38V4Z"
          fill="#FEF3C7"
          stroke="#D97706"
          strokeWidth="1.6"
        />
        <line x1="7" y1="29" x2="29" y2="29" stroke="#D97706" strokeWidth="1.6" />
        <rect x="2" y="14" width="5.5" height="24" rx="2" fill="#FEF3C7" stroke="#D97706" strokeWidth="1.6" />
        <rect x="28.5" y="14" width="5.5" height="24" rx="2" fill="#FEF3C7" stroke="#D97706" strokeWidth="1.6" />
        {showSeatNumber && (
          <text
            x="18"
            y="16"
            textAnchor="middle"
            dominantBaseline="central"
            fontSize="9"
            fontFamily="ui-monospace, monospace"
            fontWeight="900"
            fill="#92400E"
          >
            {seatId}
          </text>
        )}
        <text
          x="18"
          y="34.5"
          textAnchor="middle"
          dominantBaseline="central"
          fontSize="7"
          fontFamily="ui-monospace, monospace"
          fontWeight="900"
          fill="#B45309"
        >
          ✕
        </text>
      </svg>
    )
  }

  // 5. Available Seat: Pristine Clean White with Sleek Slate Outline matching frontend
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 36 42"
      fill="none"
      className={`transition-all duration-150 ${className}`}
      aria-hidden="true"
    >
      <path
        d="M7 4C7 2.89543 7.89543 2 9 2H27C28.1046 2 29 2.89543 29 4V38C29 39.1046 28.1046 40 27 40H9C7.89543 40 7 39.1046 7 38V4Z"
        fill="#FFFFFF"
        stroke="#5A6474"
        strokeWidth="1.6"
      />
      <line x1="7" y1="29" x2="29" y2="29" stroke="#5A6474" strokeWidth="1.6" />
      <rect x="2" y="14" width="5.5" height="24" rx="2" fill="#FFFFFF" stroke="#5A6474" strokeWidth="1.6" />
      <rect x="28.5" y="14" width="5.5" height="24" rx="2" fill="#FFFFFF" stroke="#5A6474" strokeWidth="1.6" />
      {showSeatNumber && (
        <text
          x="18"
          y="16"
          textAnchor="middle"
          dominantBaseline="central"
          fontSize="9"
          fontFamily="ui-monospace, monospace"
          fontWeight="900"
          fill="#1E293B"
        >
          {seatId}
        </text>
      )}
    </svg>
  )
}
