'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  X,
  Check,
  Sparkles,
  MapPin,
  Clock,
} from 'lucide-react'

export interface ThemedDatePickerModalProps {
  isOpen: boolean
  onClose: () => void
  selectedDate: string | null
  onSelectDate: (date: string) => void
  minDate?: string // YYYY-MM-DD
  maxDate?: string // YYYY-MM-DD
  title?: string
  routeContext?: string
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

const WEEKDAY_NAMES = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

function formatToYYYYMMDD(d: Date): string {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function parseYYYYMMDD(str: string): Date {
  const parts = str.split('-').map(Number)
  const year = parts[0] ?? new Date().getFullYear()
  const month = parts[1] ?? 1
  const day = parts[2] ?? 1
  return new Date(year, month - 1, day)
}

function formatDisplayDate(dateStr: string): string {
  try {
    const d = parseYYYYMMDD(dateStr)
    return d.toLocaleDateString('en-IN', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return dateStr
  }
}

export function ThemedDatePickerModal({
  isOpen,
  onClose,
  selectedDate,
  onSelectDate,
  minDate,
  maxDate,
  title = 'Choose Travel Date',
  routeContext,
}: ThemedDatePickerModalProps) {
  // Current real date (today in local time)
  const todayStr = useMemo(() => formatToYYYYMMDD(new Date()), [])
  const effectiveMin = minDate || todayStr

  // Maximum allowed date: 60 days ahead by default if not passed
  const effectiveMax = useMemo(() => {
    if (maxDate) return maxDate
    const d = new Date()
    d.setDate(d.getDate() + 60)
    return formatToYYYYMMDD(d)
  }, [maxDate])

  // Local draft date when picking inside the modal
  const [draftDate, setDraftDate] = useState<string>(selectedDate || todayStr)

  // Current calendar month view (year & month index 0-11)
  const [viewYear, setViewYear] = useState<number>(() => {
    const initial = selectedDate ? parseYYYYMMDD(selectedDate) : new Date()
    return initial.getFullYear()
  })

  const [viewMonth, setViewMonth] = useState<number>(() => {
    const initial = selectedDate ? parseYYYYMMDD(selectedDate) : new Date()
    return initial.getMonth()
  })

  // Sync draftDate and view when modal opens or selectedDate changes
  useEffect(() => {
    if (isOpen) {
      const active = selectedDate || todayStr
      setDraftDate(active)
      const d = parseYYYYMMDD(active)
      setViewYear(d.getFullYear())
      setViewMonth(d.getMonth())
    }
  }, [isOpen, selectedDate, todayStr])

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  // Month navigation
  const canGoPrev = useMemo(() => {
    const minD = parseYYYYMMDD(effectiveMin)
    const minYear = minD.getFullYear()
    const minMonth = minD.getMonth()
    return viewYear > minYear || (viewYear === minYear && viewMonth > minMonth)
  }, [viewYear, viewMonth, effectiveMin])

  const canGoNext = useMemo(() => {
    const maxD = parseYYYYMMDD(effectiveMax)
    const maxYear = maxD.getFullYear()
    const maxMonth = maxD.getMonth()
    return viewYear < maxYear || (viewYear === maxYear && viewMonth < maxMonth)
  }, [viewYear, viewMonth, effectiveMax])

  const handlePrevMonth = () => {
    if (!canGoPrev) return
    if (viewMonth === 0) {
      setViewMonth(11)
      setViewYear((prev) => prev - 1)
    } else {
      setViewMonth((prev) => prev - 1)
    }
  }

  const handleNextMonth = () => {
    if (!canGoNext) return
    if (viewMonth === 11) {
      setViewMonth(0)
      setViewYear((prev) => prev + 1)
    } else {
      setViewMonth((prev) => prev + 1)
    }
  }

  // Days in current view month
  const calendarDays = useMemo(() => {
    const firstDayIndex = new Date(viewYear, viewMonth, 1).getDay() // 0 = Sunday
    const totalDays = new Date(viewYear, viewMonth + 1, 0).getDate()

    const days: Array<{
      dateStr: string
      dayNum: number
      isCurrentMonth: boolean
      isDisabled: boolean
      isToday: boolean
      isSelected: boolean
    }> = []

    // Padding for previous month days
    const prevMonthDays = new Date(viewYear, viewMonth, 0).getDate()
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const d = prevMonthDays - i
      const prevMonth = viewMonth === 0 ? 11 : viewMonth - 1
      const prevYear = viewMonth === 0 ? viewYear - 1 : viewYear
      const dateStr = `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      days.push({
        dateStr,
        dayNum: d,
        isCurrentMonth: false,
        isDisabled: true,
        isToday: false,
        isSelected: false,
      })
    }

    // Current month days
    for (let d = 1; d <= totalDays; d++) {
      const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      const isDisabled = dateStr < effectiveMin || dateStr > effectiveMax
      days.push({
        dateStr,
        dayNum: d,
        isCurrentMonth: true,
        isDisabled,
        isToday: dateStr === todayStr,
        isSelected: dateStr === draftDate,
      })
    }

    // Padding for next month days to complete 7-day grid rows (35 or 42 cells total)
    const remaining = 7 - (days.length % 7)
    if (remaining > 0 && remaining < 7) {
      for (let d = 1; d <= remaining; d++) {
        const nextMonth = viewMonth === 11 ? 0 : viewMonth + 1
        const nextYear = viewMonth === 11 ? viewYear + 1 : viewYear
        const dateStr = `${nextYear}-${String(nextMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
        days.push({
          dateStr,
          dayNum: d,
          isCurrentMonth: false,
          isDisabled: true,
          isToday: false,
          isSelected: false,
        })
      }
    }

    return days
  }, [viewYear, viewMonth, effectiveMin, effectiveMax, todayStr, draftDate])

  // Quick preset shortcuts
  const tomorrowStr = useMemo(() => {
    const d = new Date()
    d.setDate(d.getDate() + 1)
    return formatToYYYYMMDD(d)
  }, [])

  const in2DaysStr = useMemo(() => {
    const d = new Date()
    d.setDate(d.getDate() + 2)
    return formatToYYYYMMDD(d)
  }, [])

  const nextWeekendStr = useMemo(() => {
    const d = new Date()
    // Find next Saturday (day 6)
    const day = d.getDay()
    const diff = (6 - day + 7) % 7 || 7
    d.setDate(d.getDate() + diff)
    return formatToYYYYMMDD(d)
  }, [])

  const handleSelectChip = (val: string) => {
    setDraftDate(val)
    const d = parseYYYYMMDD(val)
    setViewYear(d.getFullYear())
    setViewMonth(d.getMonth())
  }

  const handleConfirm = useCallback(() => {
    if (draftDate) {
      onSelectDate(draftDate)
      onClose()
    }
  }, [draftDate, onSelectDate, onClose])

  if (!isOpen) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-sm sm:max-w-md bg-white rounded-3xl border border-amber-200/80 shadow-2xl shadow-amber-950/20 overflow-hidden animate-in zoom-in-95 duration-200 text-gray-900 select-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header with Webapp Gold Accent Ribbon */}
        <div className="bg-gradient-to-r from-amber-500 via-[#F8B018] to-amber-400 px-5 py-4 text-[#0B0F19] relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-xl bg-[#0B0F19] text-[#F8B018] font-black flex items-center justify-center text-xs tracking-wider shadow-sm">
                UT
              </span>
              <div>
                <h3 className="font-extrabold text-sm sm:text-base tracking-tight leading-tight">
                  {title}
                </h3>
                <p className="text-[11px] font-bold text-amber-950/80 leading-none mt-0.5">
                  {routeContext || 'Uday Travels · Daily Ahilyanagar ⇄ Pune'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close calendar"
              className="w-8 h-8 rounded-full bg-black/10 hover:bg-black/20 text-[#0B0F19] flex items-center justify-center transition-colors cursor-pointer"
            >
              <X size={17} />
            </button>
          </div>

          {/* Quick Date Shortcuts (Chips) */}
          <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-amber-600/20 overflow-x-auto pb-0.5 scrollbar-none">
            <button
              type="button"
              onClick={() => handleSelectChip(todayStr)}
              className={`px-3 py-1 rounded-full text-xs font-black transition-all shrink-0 cursor-pointer ${
                draftDate === todayStr
                  ? 'bg-[#0B0F19] text-[#F8B018] shadow-xs'
                  : 'bg-white/80 hover:bg-white text-amber-950 border border-amber-600/30'
              }`}
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => handleSelectChip(tomorrowStr)}
              className={`px-3 py-1 rounded-full text-xs font-black transition-all shrink-0 cursor-pointer ${
                draftDate === tomorrowStr
                  ? 'bg-[#0B0F19] text-[#F8B018] shadow-xs'
                  : 'bg-white/80 hover:bg-white text-amber-950 border border-amber-600/30'
              }`}
            >
              Tomorrow
            </button>
            <button
              type="button"
              onClick={() => handleSelectChip(in2DaysStr)}
              className={`px-3 py-1 rounded-full text-xs font-black transition-all shrink-0 cursor-pointer ${
                draftDate === in2DaysStr
                  ? 'bg-[#0B0F19] text-[#F8B018] shadow-xs'
                  : 'bg-white/80 hover:bg-white text-amber-950 border border-amber-600/30'
              }`}
            >
              In 2 Days
            </button>
            <button
              type="button"
              onClick={() => handleSelectChip(nextWeekendStr)}
              className={`px-3 py-1 rounded-full text-xs font-black transition-all shrink-0 cursor-pointer ${
                draftDate === nextWeekendStr
                  ? 'bg-[#0B0F19] text-[#F8B018] shadow-xs'
                  : 'bg-white/80 hover:bg-white text-amber-950 border border-amber-600/30'
              }`}
            >
              Weekend
            </button>
          </div>
        </div>

        {/* Calendar Body */}
        <div className="p-4 sm:p-5">
          {/* Month / Year Navigator */}
          <div className="flex items-center justify-between mb-4 px-1">
            <h4 className="font-extrabold text-base sm:text-lg text-gray-950 flex items-center gap-1.5">
              <span>{MONTH_NAMES[viewMonth]}</span>
              <span className="text-amber-600 font-black">{viewYear}</span>
            </h4>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handlePrevMonth}
                disabled={!canGoPrev}
                aria-label="Previous month"
                className="w-8 h-8 rounded-xl border border-gray-200 hover:border-amber-400 hover:bg-amber-50 text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-all cursor-pointer"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                type="button"
                onClick={handleNextMonth}
                disabled={!canGoNext}
                aria-label="Next month"
                className="w-8 h-8 rounded-xl border border-gray-200 hover:border-amber-400 hover:bg-amber-50 text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-all cursor-pointer"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          {/* Weekday Row */}
          <div className="grid grid-cols-7 gap-1 text-center mb-2">
            {WEEKDAY_NAMES.map((w, idx) => (
              <span
                key={w}
                className={`text-[11px] font-black uppercase tracking-wider py-1 ${
                  idx === 0 ? 'text-amber-600' : 'text-gray-500'
                }`}
              >
                {w}
              </span>
            ))}
          </div>

          {/* Calendar 7-Column Days Grid */}
          <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
            {calendarDays.map((cell, idx) => {
              if (!cell.isCurrentMonth) {
                return (
                  <div
                    key={`empty-${idx}`}
                    className="aspect-square flex items-center justify-center text-xs text-gray-300 font-medium select-none pointer-events-none"
                  >
                    {cell.dayNum}
                  </div>
                )
              }

              const isDraft = cell.dateStr === draftDate

              return (
                <button
                  key={cell.dateStr}
                  type="button"
                  disabled={cell.isDisabled}
                  onClick={() => setDraftDate(cell.dateStr)}
                  className={`aspect-square rounded-xl sm:rounded-2xl font-black text-xs sm:text-sm flex flex-col items-center justify-center transition-all relative cursor-pointer ${
                    isDraft
                      ? 'bg-[#F8B018] text-[#0B0F19] shadow-md shadow-[#F8B018]/30 scale-105 font-black ring-2 ring-[#0B0F19]'
                      : cell.isDisabled
                      ? 'text-gray-300 bg-gray-50 cursor-not-allowed line-through opacity-60'
                      : 'text-gray-800 hover:bg-amber-100/70 hover:text-amber-950 bg-white border border-gray-100 hover:border-amber-300'
                  }`}
                  title={formatDisplayDate(cell.dateStr)}
                >
                  <span>{cell.dayNum}</span>

                  {/* Tiny Today Indicator Dot */}
                  {cell.isToday && !isDraft && (
                    <span className="w-1.5 h-1.5 rounded-full bg-[#F8B018] mt-0.5 animate-pulse" />
                  )}
                  {cell.isToday && isDraft && (
                    <span className="text-[8px] font-black uppercase tracking-tighter leading-none mt-0.5 opacity-90">
                      Today
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          {/* Service Guarantee Banner */}
          <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-600 px-1">
            <span className="flex items-center gap-1.5 text-emerald-700 font-bold">
              <Check size={14} className="text-emerald-600 stroke-[2.5]" /> Flat ₹200 / Seat
            </span>
            <span className="text-[11px] font-semibold text-gray-500">
              NH60 Highway Express
            </span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="bg-gray-50 border-t border-gray-200/80 px-4 py-3.5 sm:px-5 flex items-center justify-between gap-3">
          <div className="flex flex-col text-left">
            <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">
              Selected Travel Date
            </span>
            <strong className="text-xs sm:text-sm font-black text-gray-950">
              {formatDisplayDate(draftDate)}
            </strong>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl text-xs font-bold text-gray-600 hover:text-gray-900 hover:bg-gray-200 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="px-5 py-2.5 rounded-xl bg-[#F8B018] hover:bg-[#ffb020] text-[#0B0F19] text-xs font-black shadow-md shadow-[#F8B018]/25 transition-all transform active:scale-95 cursor-pointer flex items-center gap-1.5"
            >
              <Check size={14} strokeWidth={3} />
              <span>Confirm Date</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ThemedDatePickerModal
