'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Bus, Loader2 } from 'lucide-react'

export default function AdminLoginPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/admin')
  }, [router])

  return (
    <main className="min-h-screen bg-[#0B0F19] text-white flex items-center justify-center p-4">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="w-12 h-12 rounded-xl bg-[#FF9D00] flex items-center justify-center text-[#0B0F19] shadow-lg font-bold">
          <Bus className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-white">Direct Access to Admin Dashboard</h1>
          <p className="text-xs text-slate-400 mt-1">Redirecting you to the console...</p>
        </div>
        <Loader2 className="w-5 h-5 animate-spin text-[#FF9D00]" />
      </div>
    </main>
  )
}
