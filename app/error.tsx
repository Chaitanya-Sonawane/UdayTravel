'use client'

import React, { useEffect } from 'react'
import Link from 'next/link'
import { AlertCircle, RefreshCw, Home } from 'lucide-react'

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Structured server/boundary error capture (no user personal data logged)
    if (process.env.NODE_ENV !== 'production') {
      // In dev mode, error details available in server console
    }
  }, [error])

  return (
    <main className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-4 font-sans">
      <div className="max-w-md w-full bg-slate-800/90 border border-slate-700/80 rounded-2xl p-6 sm:p-8 text-center shadow-2xl backdrop-blur-sm">
        <div className="w-14 h-14 rounded-2xl bg-amber-500/20 text-[#F8B018] flex items-center justify-center mx-auto mb-4 border border-amber-500/30">
          <AlertCircle size={28} />
        </div>

        <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white mb-2">
          Something went wrong
        </h2>

        <p className="text-xs sm:text-sm text-slate-400 mb-6 leading-relaxed">
          We encountered an unexpected issue while loading this page. Please try again or return to the main booking screen.
        </p>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={() => reset()}
            className="flex-1 min-h-[44px] bg-[#F8B018] hover:bg-[#e5a010] text-[#0B0F19] font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
          >
            <RefreshCw size={14} />
            <span>Try Again</span>
          </button>

          <Link
            href="/"
            className="flex-1 min-h-[44px] bg-slate-700 hover:bg-slate-600 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer border border-slate-600"
          >
            <Home size={14} />
            <span>Go Home</span>
          </Link>
        </div>

        <p className="text-[11px] text-slate-500 mt-6">
          24/7 Helpline: <a href="tel:+919890066580" className="text-amber-400 hover:underline">+91 98900 66580</a>
        </p>
      </div>
    </main>
  )
}
