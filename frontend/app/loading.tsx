import React from 'react'

export default function Loading() {
  return (
    <div className="min-h-[65vh] flex flex-col items-center justify-center p-6 font-jakarta animate-in fade-in duration-300">
      <div className="relative w-16 h-16 flex items-center justify-center mb-4">
        {/* Outer glowing pulse ring */}
        <div className="absolute inset-0 rounded-2xl bg-[#F8B018]/10 animate-ping" />
        {/* Clean amber spinner ring */}
        <div className="w-14 h-14 rounded-2xl bg-white border border-amber-200 shadow-md flex items-center justify-center relative z-10">
          <div className="w-7 h-7 rounded-full border-[2.5px] border-amber-100 border-t-[#F8B018] animate-spin" />
        </div>
      </div>
      <p className="text-xs font-bold uppercase tracking-widest text-slate-700 font-mono">
        Loading...
      </p>
    </div>
  )
}
