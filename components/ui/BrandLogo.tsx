'use client'

import React from 'react'
import Link from 'next/link'

interface BrandLogoProps {
  theme?: 'dark' | 'light'
  size?: 'sm' | 'md' | 'lg'
  href?: string
  className?: string
  showText?: boolean
}

export function BrandLogo({
  theme = 'light',
  size = 'md',
  href = '/',
  className = '',
  showText = true,
}: BrandLogoProps) {
  const isDark = theme === 'dark'

  const markSize =
    size === 'sm'
      ? 'w-7 h-7 text-[11px] rounded-lg'
      : size === 'lg'
      ? 'w-10 h-10 text-sm rounded-xl'
      : 'w-8 h-8 sm:w-9 sm:h-9 text-xs sm:text-sm rounded-xl'

  const textSize =
    size === 'sm'
      ? 'text-xs'
      : size === 'lg'
      ? 'text-sm sm:text-base'
      : 'text-xs sm:text-sm'

  const content = (
    <span className={`inline-flex items-center gap-2 group cursor-pointer select-none ${className}`}>
      {/* Solid Golden Yellow Mark with High-Contrast Deep Black 'UT' */}
      <span
        className={`brand-logo-mark ${markSize} bg-[#F8B018] text-[#0B0F19] font-black flex items-center justify-center font-sans tracking-tight shadow-xs transition-transform group-hover:scale-105 shrink-0`}
        aria-hidden="true"
        style={{
          backgroundColor: '#F8B018',
          color: '#0B0F19',
          fontWeight: 900,
        }}
      >
        UT
      </span>
      {showText && (
        <span
          className={`brand-logo-name ${textSize} font-black uppercase tracking-[0.16em] font-sans transition-colors ${
            isDark
              ? 'text-white group-hover:text-[#F8B018]'
              : 'text-gray-950 group-hover:text-[#D97706]'
          }`}
        >
          UDAY TRAVELS
        </span>
      )}
    </span>
  )

  if (href) {
    return (
      <Link href={href} aria-label="Uday Travels Home" className="inline-flex items-center text-inherit no-underline">
        {content}
      </Link>
    )
  }

  return content
}

export default BrandLogo
