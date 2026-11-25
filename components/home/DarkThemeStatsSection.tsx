'use client'

import React, { useEffect, useRef, useState } from 'react'

interface StatItem {
  id: string
  endValue: number
  decimals?: number
  prefix?: string
  suffix: string
  label: string
  sublabel: string
}

const STATS: StatItem[] = [
  {
    id: 'passengers',
    endValue: 400,
    decimals: 0,
    suffix: '+',
    label: 'Passengers per month',
    sublabel: 'Safe, punctual journeys between Ahilyanagar & Pune',
  },
  {
    id: 'ontime',
    endValue: 98.2,
    decimals: 1,
    suffix: '%',
    label: 'On-time departure rate',
    sublabel: 'Highway transit tracked via real-time GPS',
  },
  {
    id: 'buses',
    endValue: 4,
    decimals: 0,
    suffix: '+',
    label: 'Buses in daily operation',
    sublabel: 'Modern 44 & 55-seater air-conditioned coaches',
  },
  {
    id: 'reviews',
    endValue: 4.9,
    decimals: 1,
    suffix: '★',
    label: 'Customer review rating',
    sublabel: 'Over 10,000+ verified passenger reviews',
  },
]

function AnimatedCounter({
  endValue,
  decimals = 0,
  prefix = '',
  suffix = '',
  started = false,
  duration = 2000,
}: {
  endValue: number
  decimals?: number
  prefix?: string
  suffix?: string
  started: boolean
  duration?: number
}) {
  const [displayValue, setDisplayValue] = useState<number>(0)

  useEffect(() => {
    if (!started) {
      setDisplayValue(0)
      return
    }

    let startTime: number | null = null
    let animationFrameId: number

    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp
      const elapsed = timestamp - startTime
      const progress = Math.min(elapsed / duration, 1)

      // Ease-out cubic for smooth deceleration
      const easeProgress = 1 - Math.pow(1 - progress, 3)
      const current = easeProgress * endValue

      setDisplayValue(current)

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(step)
      } else {
        setDisplayValue(endValue)
      }
    }

    animationFrameId = requestAnimationFrame(step)
    return () => cancelAnimationFrame(animationFrameId)
  }, [started, endValue, duration])

  const formattedNumber =
    decimals > 0
      ? displayValue.toFixed(decimals)
      : Math.floor(displayValue).toLocaleString('en-IN')

  return (
    <span className="inline-flex items-baseline">
      {prefix && <span>{prefix}</span>}
      <span>{formattedNumber}</span>
      {suffix && (
        <span className="text-[#F8B018] ml-0.5 font-sans font-black select-none">
          {suffix}
        </span>
      )}
    </span>
  )
}

export default function DarkThemeStatsSection() {
  const [hasStarted, setHasStarted] = useState(false)
  const sectionRef = useRef<HTMLElement>(null)

  useEffect(() => {
    // Scroll-triggered counter: starts from 0 initial up to the number when scrolled into view
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        if (entry && entry.isIntersecting) {
          setHasStarted(true)
        } else {
          // Reset to 0 when out of view, so scrolling to it again restarts the animation from 0
          setHasStarted(false)
        }
      },
      { threshold: 0.18, rootMargin: '0px 0px -40px 0px' }
    )

    if (sectionRef.current) {
      observer.observe(sectionRef.current)
    }

    return () => {
      observer.disconnect()
    }
  }, [])

  return (
    <section
      ref={sectionRef}
      id="live-stats"
      className="w-full bg-[#0B0F19] text-white border-t border-b border-white/10 relative overflow-hidden font-chakra"
      style={{ fontFamily: "'Chakra Petch', sans-serif" }}
    >
      {/* Background Subtle Gradient & Grid Accent */}
      <div className="absolute inset-0 bg-radial-at-t from-[#F8B018]/5 via-transparent to-transparent pointer-events-none" />
      <div className="absolute inset-0 opacity-[0.03] bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none" />

      <div className="max-w-[1360px] mx-auto px-5 sm:px-8 md:px-12 py-14 sm:py-16 md:py-20 relative z-10">
        {/* Subtle Brand Tag Header */}
        <div className="flex items-center gap-2.5 mb-8 sm:mb-10 text-white/70">
          <span
            className="brand-logo-mark w-7 h-7 rounded-lg bg-[#F8B018] text-[#0B0F19] font-black flex items-center justify-center font-sans tracking-tight text-xs shadow-xs shrink-0"
            style={{ backgroundColor: '#F8B018', color: '#0B0F19', fontWeight: 900 }}
          >
            UT
          </span>
          <span className="text-xs uppercase tracking-[0.2em] font-extrabold text-[#F8B018] font-sans">
            UDAY TRAVELS PERFORMANCE METRICS
          </span>
        </div>

        {/* Vertical Stat Cards in responsive 4-column grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 sm:gap-10 lg:gap-12 items-start">
          {STATS.map((stat, idx) => (
            <div
              key={stat.id}
              className={`flex flex-col justify-between h-full group ${
                idx !== STATS.length - 1 ? 'lg:border-r lg:border-white/10 lg:pr-10' : ''
              }`}
            >
              {/* Big Animated Number */}
              <div className="text-5xl sm:text-6xl md:text-7xl lg:text-[76px] font-extrabold tracking-[-0.03em] leading-none text-white transition-transform duration-300 group-hover:translate-x-1">
                <AnimatedCounter
                  endValue={stat.endValue}
                  decimals={stat.decimals}
                  prefix={stat.prefix}
                  suffix={stat.suffix}
                  started={hasStarted}
                  duration={1800 + idx * 150}
                />
              </div>

              {/* Label in Vertical Stack */}
              <div className="mt-4 pt-3 border-t border-white/10 space-y-1.5">
                <h4 className="text-base sm:text-lg font-bold text-white tracking-tight leading-snug">
                  {stat.label}
                </h4>
                <p className="text-xs sm:text-[13px] text-white/50 leading-relaxed font-sans font-normal">
                  {stat.sublabel}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
