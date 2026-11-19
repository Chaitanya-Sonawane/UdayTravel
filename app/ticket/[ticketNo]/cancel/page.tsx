'use client'

import React from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { CancellationModal } from '@/components/cancellation/CancellationModal'

export default function CancelTicketPage() {
  const params = useParams<{ ticketNo: string }>()
  const router = useRouter()
  const ticketNo = params?.ticketNo ? String(params.ticketNo) : ''

  return (
    <main className="min-h-screen bg-gray-50 py-6 sm:py-10 px-3 sm:px-4 flex flex-col justify-between">
      <div>
        <header className="max-w-lg mx-auto mb-4 flex items-center justify-between">
          <Link
            href={`/ticket/${ticketNo}`}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-700 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft size={16} /> Back to Ticket
          </Link>
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 bg-[#F8B018] text-[#0B0F19] font-black flex items-center justify-center text-[10px] rounded shadow-xs">
              UT
            </span>
            <span className="font-black text-xs tracking-wider text-gray-900">
              UDAY TRAVELS
            </span>
          </div>
        </header>

        <CancellationModal
          ticketNo={ticketNo}
          isOpen={true}
          onClose={() => router.push(`/ticket/${ticketNo}`)}
          onSuccess={() => {
            setTimeout(() => {
              router.push(`/ticket/${ticketNo}`)
            }, 1800)
          }}
          isStandalonePage={true}
        />
      </div>

      <footer className="text-center text-xs text-gray-400 py-6">
        Need assistance? Call Uday Travels Helpdesk at <a href="tel:+919890066580" className="text-gray-600 font-semibold">+91 98900 66580</a>
      </footer>
    </main>
  )
}
