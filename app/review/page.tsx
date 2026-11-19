'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function ReviewPage() {
  const router = useRouter()
  useEffect(() => {
    router.replace('/booking/summary')
  }, [router])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-[#F8B018] border-t-transparent rounded-full animate-spin" />
    </div>
  )
}
