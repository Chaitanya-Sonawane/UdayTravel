'use client'

import React from 'react'
import { Phone, Mail, CheckCircle2, Send } from 'lucide-react'

export type ContactSectionProps = {
  contact: {
    phone: string
    email?: string
  }
}

export function ContactSection({ contact }: ContactSectionProps) {
  if (!contact.phone && !contact.email) return null

  // Format mobile to +91 XXXXX XXXXX if 10 digits
  const formatPhone = (raw: string) => {
    const digits = raw.replace(/\D/g, '')
    if (digits.length === 10) {
      return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`
    }
    if (digits.length === 12 && digits.startsWith('91')) {
      return `+91 ${digits.slice(2, 7)} ${digits.slice(7)}`
    }
    return raw
  }

  return (
    <section className="p-4 sm:p-5">
      <div className="flex items-center justify-between mb-3.5">
        <h3 className="font-extrabold text-sm sm:text-base text-gray-950 flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-amber-500/10 text-amber-700 flex items-center justify-center">
            <Send size={14} />
          </div>
          <span>Ticket Delivery &amp; Updates</span>
        </h3>
        <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
          <CheckCircle2 size={12} /> SMS &amp; WhatsApp
        </span>
      </div>

      <div className="p-3.5 rounded-xl border border-gray-100 bg-gray-50/60 space-y-2">
        {contact.phone && (
          <div className="flex items-center justify-between text-xs sm:text-sm">
            <span className="text-gray-500 flex items-center gap-2">
              <Phone size={14} className="text-amber-600" /> Mobile Number
            </span>
            <strong className="font-mono text-gray-950 font-bold">
              {formatPhone(contact.phone)}
            </strong>
          </div>
        )}

        {contact.email && (
          <div className="flex items-center justify-between text-xs sm:text-sm pt-1 border-t border-gray-100">
            <span className="text-gray-500 flex items-center gap-2">
              <Mail size={14} className="text-amber-600" /> Email ID
            </span>
            <span className="font-mono text-gray-800 font-semibold truncate max-w-[200px]">
              {contact.email}
            </span>
          </div>
        )}

        <p className="text-[11px] text-gray-500 font-medium pt-1.5 border-t border-gray-100">
          E-ticket PDF with confirmed PNR and real-time live bus GPS tracking link will be sent upon payment confirmation.
        </p>
      </div>
    </section>
  )
}

export default ContactSection
