import React from 'react'
import Link from 'next/link'
import { Bus, Home, Compass } from 'lucide-react'

export default function NotFound() {
  return (
    <main className="min-h-screen bg-[#F8F9FA] text-[#0F172A] flex items-center justify-center p-4 font-jakarta">
      <div className="max-w-md w-full bg-white border border-slate-200/90 rounded-3xl p-8 text-center shadow-lg">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 text-[#B45309] flex items-center justify-center mx-auto mb-4 shadow-2xs">
          <Bus size={32} />
        </div>

        <span className="text-4xl font-black font-chakra text-slate-900 block mb-1">
          404
        </span>

        <h1 className="text-xl font-black text-slate-900 tracking-tight mb-2">
          Route Not Found
        </h1>

        <p className="text-xs sm:text-sm text-slate-500 mb-6 leading-relaxed">
          The page or route you are looking for has moved, expired, or does not exist. Check our upcoming daily schedules or head back home.
        </p>

        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            href="/availability"
            className="flex-1 min-h-[46px] bg-[#F8B018] hover:bg-[#e5a010] text-[#0B0F19] font-black text-xs rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all"
          >
            <Compass size={15} />
            <span>View Buses</span>
          </Link>

          <Link
            href="/"
            className="flex-1 min-h-[46px] bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl flex items-center justify-center gap-2 border border-slate-200 transition-all"
          >
            <Home size={15} />
            <span>Go Home</span>
          </Link>
        </div>

        <p className="text-[11px] text-slate-400 mt-6">
          Need help? Call Uday Travels Helpdesk: <a href="tel:+919890066580" className="text-amber-700 font-bold hover:underline">+91 98900 66580</a>
        </p>
      </div>
    </main>
  )
}
