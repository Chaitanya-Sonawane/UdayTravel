'use client'

import React from 'react'
import { AlertTriangle, AlertCircle, Info, CheckCircle2, X, ArrowRight } from 'lucide-react'

export interface ThemedErrorBannerProps {
  title?: string
  message: string
  suggestion?: string
  variant?: 'error' | 'warning' | 'info' | 'success'
  actionLabel?: string
  onAction?: () => void
  onDismiss?: () => void
  className?: string
  compact?: boolean
}

export function ThemedErrorBanner({
  title,
  message,
  suggestion,
  variant = 'warning',
  actionLabel,
  onAction,
  onDismiss,
  className = '',
  compact = false,
}: ThemedErrorBannerProps) {
  if (!message && !title) return null

  const variantStyles = {
    warning: {
      border: 'border-amber-400 bg-amber-50/90 text-amber-900',
      iconBg: 'bg-amber-100 text-amber-700',
      btnBg: 'bg-[#F8B018] hover:bg-[#e09b0b] text-gray-950',
      icon: AlertTriangle,
    },
    error: {
      border: 'border-red-300 bg-red-50/90 text-red-950',
      iconBg: 'bg-red-100 text-red-700',
      btnBg: 'bg-red-600 hover:bg-red-700 text-white',
      icon: AlertCircle,
    },
    info: {
      border: 'border-blue-300 bg-blue-50/90 text-blue-950',
      iconBg: 'bg-blue-100 text-blue-700',
      btnBg: 'bg-blue-600 hover:bg-blue-700 text-white',
      icon: Info,
    },
    success: {
      border: 'border-emerald-300 bg-emerald-50/90 text-emerald-950',
      iconBg: 'bg-emerald-100 text-emerald-700',
      btnBg: 'bg-emerald-600 hover:bg-emerald-700 text-white',
      icon: CheckCircle2,
    },
  }[variant]

  const IconComponent = variantStyles.icon

  if (compact) {
    return (
      <div
        className={`w-full p-3 rounded-xl border ${variantStyles.border} shadow-2xs text-xs flex items-center justify-between gap-2.5 transition-all animate-in fade-in-50 duration-200 ${className}`}
        role="alert"
      >
        <div className="flex items-center gap-2 min-w-0">
          <IconComponent size={16} className="flex-shrink-0 text-[#F8B018]" />
          <span className="font-medium truncate">{message}</span>
        </div>
        {actionLabel && onAction && (
          <button
            type="button"
            onClick={onAction}
            className={`flex-shrink-0 text-[11px] font-bold px-2 py-1 rounded-md ${variantStyles.btnBg} transition-colors inline-flex items-center gap-1`}
          >
            {actionLabel} <ArrowRight size={12} />
          </button>
        )}
      </div>
    )
  }

  return (
    <div
      className={`w-full p-4 rounded-xl border ${variantStyles.border} shadow-2xs transition-all animate-in fade-in-50 duration-200 ${className}`}
      role="alert"
    >
      <div className="flex items-start gap-3">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${variantStyles.iconBg}`}>
          <IconComponent size={18} />
        </div>

        <div className="flex-1 min-w-0">
          {title && (
            <div className="flex items-center justify-between gap-2">
              <strong className="text-sm font-bold text-gray-900 tracking-tight block">
                {title}
              </strong>
              {onDismiss && (
                <button
                  type="button"
                  onClick={onDismiss}
                  className="text-gray-400 hover:text-gray-700 p-0.5 rounded transition-colors"
                  aria-label="Close alert"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          )}

          <p className="text-xs text-gray-700 mt-1 leading-relaxed">
            {message}
          </p>

          {suggestion && (
            <p className="text-[11px] text-amber-900/80 font-medium mt-1.5 flex items-center gap-1">
              <span>💡</span>
              <span>{suggestion}</span>
            </p>
          )}

          {actionLabel && onAction && (
            <div className="mt-3">
              <button
                type="button"
                onClick={onAction}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg font-bold text-xs tracking-wide shadow-xs transition-transform active:scale-[0.98] ${variantStyles.btnBg}`}
              >
                <span>{actionLabel}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
export default ThemedErrorBanner
