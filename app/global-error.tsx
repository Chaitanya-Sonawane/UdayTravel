'use client'

import React from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#0B0F19] text-white flex items-center justify-center p-4 font-sans">
        <div className="max-w-md w-full bg-slate-900 border border-amber-500/30 rounded-2xl p-8 text-center shadow-2xl">
          <div className="w-12 h-12 rounded-xl bg-[#F8B018] text-[#0B0F19] font-black flex items-center justify-center mx-auto mb-4 text-base">
            UT
          </div>
          <h2 className="text-xl font-bold mb-2">Application Error</h2>
          <p className="text-xs text-slate-400 mb-6">
            An unexpected error interrupted the application. Please reload or contact Uday Travels support.
          </p>
          <button
            type="button"
            onClick={() => reset()}
            className="w-full min-h-[44px] bg-[#F8B018] hover:bg-[#e5a010] text-[#0B0F19] font-bold text-xs rounded-xl flex items-center justify-center transition-all cursor-pointer"
          >
            Reload Application
          </button>
        </div>
      </body>
    </html>
  )
}
