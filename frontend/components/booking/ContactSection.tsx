import React from 'react'

export type ContactSectionProps = {
  contact: {
    phone: string
    email?: string
  }
}

export function ContactSection({ contact }: ContactSectionProps) {
  if (!contact.phone && !contact.email) return null

  return (
    <section className="p-4 border-t border-gray-100">
      <h3 className="font-semibold text-base text-[#111] mb-2">
        Your ticket will be sent to
      </h3>

      <div className="space-y-0.5 text-sm">
        {contact.phone && (
          <p className="text-[#111] font-normal leading-normal">{contact.phone}</p>
        )}
        {contact.email && (
          <p className="text-[#6b7280] font-normal leading-normal">{contact.email}</p>
        )}
      </div>
    </section>
  )
}
