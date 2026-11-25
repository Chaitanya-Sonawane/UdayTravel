'use client'

import React from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  Phone,
  Mail,
  MapPin,
  ChevronRight,
  ArrowUpRight,
} from 'lucide-react'
import DotMatrixFooter from './DotMatrixFooter'

export default function BlackThemeFooter() {
  const policyLinks = [
    { label: 'Terms & Conditions', href: '/policies' },
    { label: 'Cancellation Policy', href: '/policies#cancellation' },
    { label: 'Privacy Policy', href: '/policies#privacy' },
    { label: 'Travel Policy', href: '/policies#travel-policy' },
  ]

  return (
    <footer className="border-t border-white/10 bg-[#0B0F19] text-white font-jakarta selection:bg-[#F8B018] selection:text-black">
      <div className="mx-auto w-full max-w-[1440px] px-5 sm:px-8 md:px-12 xl:px-16 pt-9 pb-6 sm:pt-11 sm:pb-7">
        {/* 3-Column Grid Section: Brand/Socials, Policies, Contact Us (Quick Links Removed) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-7 sm:gap-8 lg:gap-0">
          
          {/* Column 1: Brand, Tagline, Socials (5 cols) */}
          <div className="sm:col-span-2 lg:col-span-5 lg:pr-10 lg:border-r lg:border-white/10 flex flex-col justify-between">
            <div>
              {/* Yellow Speeding Bus Logo (Clean crop, no text artifacts) */}
              <div className="inline-block">
                <Image
                  src="/images/sections/footer-bus-logo.png"
                  alt="Uday Travels Express Bus"
                  width={180}
                  height={74}
                  className="h-14 sm:h-16 w-auto object-contain"
                  priority
                />
              </div>

              {/* Brand Title */}
              <h3 className="text-xl sm:text-2xl font-black tracking-tight text-white mt-2">
                Uday Travels
              </h3>

              {/* Optimistic Tagline */}
              <p className="text-slate-400 text-xs sm:text-sm leading-relaxed mt-2 max-w-sm font-normal">
                Your trusted travel partner for safe, comfortable, and affordable daily express journeys between Ahilyanagar and Pune.
              </p>
            </div>

            {/* Social Media Circular Pills */}
            <div className="flex items-center gap-2.5 mt-4 sm:mt-5">
              {/* WhatsApp */}
              <a
                href="https://wa.me/919890066580"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-full bg-white/5 border border-white/10 text-slate-300 hover:text-[#F8B018] hover:border-[#F8B018]/50 hover:bg-[#F8B018]/10 transition-all flex items-center justify-center shadow-xs group"
                aria-label="WhatsApp Support"
              >
                <svg className="w-4 h-4 fill-current group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
                  <path d="M12.031 0C5.396 0 .029 5.367.029 12.002c0 2.122.554 4.195 1.611 6.023L0 24l6.164-1.617c1.76 1.01 3.774 1.543 5.867 1.543 6.634 0 12.001-5.367 12.001-12.002 0-6.634-5.367-12.002-12.001-12.002zm0 21.94c-1.802 0-3.567-.484-5.115-1.401l-.367-.218-3.801.997 1.015-3.705-.239-.38a9.92 9.92 0 0 1-1.524-5.231c0-5.488 4.467-9.955 9.955-9.955 5.488 0 9.955 4.467 9.955 9.955 0 5.488-4.467 9.955-9.955 9.955zm5.457-7.447c-.299-.15-1.77-.873-2.044-.972-.274-.1-.473-.15-.672.15-.199.299-.772.972-.947 1.171-.174.199-.349.224-.648.075-.299-.15-1.263-.465-2.406-1.485-.89-.793-1.49-1.773-1.665-2.072-.174-.299-.019-.461.131-.61.135-.134.299-.349.449-.523.15-.175.199-.299.299-.498.1-.2.05-.374-.025-.523-.075-.15-.672-1.62-.921-2.218-.243-.583-.49-.504-.672-.513-.174-.009-.374-.011-.573-.011-.199 0-.523.075-.797.374-.274.299-1.046 1.022-1.046 2.493 0 1.471 1.071 2.891 1.221 3.09.15.199 2.107 3.218 5.105 4.512.713.308 1.27.493 1.704.63.716.228 1.368.196 1.883.119.575-.086 1.77-.723 2.019-1.42.249-.698.249-1.296.174-1.42-.075-.124-.274-.199-.573-.348z" />
                </svg>
              </a>

              {/* Instagram */}
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-full bg-white/5 border border-white/10 text-slate-300 hover:text-[#F8B018] hover:border-[#F8B018]/50 hover:bg-[#F8B018]/10 transition-all flex items-center justify-center shadow-xs group"
                aria-label="Instagram Profile"
              >
                <svg className="w-4 h-4 fill-current group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                </svg>
              </a>

              {/* YouTube */}
              <a
                href="https://youtube.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-full bg-white/5 border border-white/10 text-slate-300 hover:text-[#F8B018] hover:border-[#F8B018]/50 hover:bg-[#F8B018]/10 transition-all flex items-center justify-center shadow-xs group"
                aria-label="YouTube Channel"
              >
                <svg className="w-4 h-4 fill-current group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                </svg>
              </a>

              {/* Maps Location */}
              <a
                href="https://maps.google.com/?q=Shop+No.+13,+Santachaya+Apartment,+Opposite+Kohinoor+Maangal+Karyalaya,+Gulmohar+Road,+Savedi,+Ahilyanagar,+Maharashtra"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-full bg-white/5 border border-white/10 text-slate-300 hover:text-[#F8B018] hover:border-[#F8B018]/50 hover:bg-[#F8B018]/10 transition-all flex items-center justify-center shadow-xs group"
                aria-label="Google Maps Office Location"
              >
                <MapPin size={17} className="group-hover:scale-110 transition-transform" />
              </a>
            </div>
          </div>

          {/* Column 2: Policies (3 cols) */}
          <div className="lg:col-span-3 lg:px-8 lg:border-r lg:border-white/10">
            <h4 className="text-white font-extrabold text-sm sm:text-base tracking-tight mb-3">
              Policies
            </h4>
            <ul className="space-y-0.5">
              {policyLinks.map((item) => (
                <li key={item.label}>
                  <Link
                    href={item.href}
                    className="flex items-center justify-between py-1.5 text-xs sm:text-sm text-slate-300 hover:text-[#F8B018] transition-colors group"
                  >
                    <span className="font-medium group-hover:translate-x-0.5 transition-transform">
                      {item.label}
                    </span>
                    <ChevronRight
                      size={14}
                      className="text-slate-500 group-hover:text-[#F8B018] group-hover:translate-x-1 transition-all"
                    />
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3: Contact Us (4 cols) */}
          <div className="sm:col-span-2 lg:col-span-4 lg:pl-8 flex flex-col justify-between">
            <div>
              <h4 className="text-white font-extrabold text-sm sm:text-base tracking-tight mb-3">
                Contact Us
              </h4>
              <ul className="space-y-3">
                {/* Phone */}
                <li>
                  <a
                    href="tel:+919890066580"
                    className="flex items-center gap-3 text-slate-300 hover:text-[#F8B018] transition-colors group"
                  >
                    <div className="w-9 h-9 rounded-full bg-[#F8B018]/15 border border-[#F8B018]/30 text-[#F8B018] flex items-center justify-center shrink-0 group-hover:scale-105 group-hover:bg-[#F8B018]/25 transition-all">
                      <Phone size={15} />
                    </div>
                    <div>
                      <div className="text-xs sm:text-sm font-bold text-white group-hover:text-[#F8B018] transition-colors">
                        +91 98900 66580
                      </div>
                      <div className="text-[11px] text-slate-400 font-medium">
                        +91 98765 43210
                      </div>
                    </div>
                  </a>
                </li>

                {/* Email */}
                <li>
                  <a
                    href="mailto:support@udaytravels.in"
                    className="flex items-center gap-3 text-slate-300 hover:text-[#F8B018] transition-colors group"
                  >
                    <div className="w-9 h-9 rounded-full bg-[#F8B018]/15 border border-[#F8B018]/30 text-[#F8B018] flex items-center justify-center shrink-0 group-hover:scale-105 group-hover:bg-[#F8B018]/25 transition-all">
                      <Mail size={15} />
                    </div>
                    <div>
                      <div className="text-xs sm:text-sm font-bold text-white group-hover:text-[#F8B018] transition-colors break-all">
                        support@udaytravels.in
                      </div>
                      <div className="text-[11px] text-slate-400 font-medium">
                        udaytravels6787@gmail.com
                      </div>
                    </div>
                  </a>
                </li>

                {/* Office Location */}
                <li>
                  <a
                    href="https://maps.google.com/?q=Shop+No.+13,+Santachaya+Apartment,+Opposite+Kohinoor+Maangal+Karyalaya,+Gulmohar+Road,+Savedi,+Ahilyanagar,+Maharashtra"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-start gap-3 text-slate-300 hover:text-[#F8B018] transition-colors group"
                  >
                    <div className="w-9 h-9 rounded-full bg-[#F8B018]/15 border border-[#F8B018]/30 text-[#F8B018] flex items-center justify-center shrink-0 mt-0.5 group-hover:scale-105 group-hover:bg-[#F8B018]/25 transition-all">
                      <MapPin size={15} />
                    </div>
                    <div>
                      <div className="text-xs sm:text-sm font-bold text-white group-hover:text-[#F8B018] transition-colors">
                        Ahilyanagar, Maharashtra
                      </div>
                      <div className="text-[11px] text-slate-400 font-medium leading-snug mt-0.5">
                        Shop 13, Savedi (5:00 AM – 10:30 PM)
                      </div>
                    </div>
                  </a>
                </li>
              </ul>
            </div>
          </div>

        </div>

        {/* Divider above Copyright Bar */}
        <div className="border-t border-white/10 my-6" />

        {/* Bottom Copyright & Back to Top */}
        <div className="flex flex-col sm:flex-row items-center justify-between text-xs text-neutral-400 gap-3">
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 bg-[#F8B018] text-[#0B0F19] font-black rounded flex items-center justify-center text-[10px]">
              UT
            </span>
            <span>© 2026 Uday Travels. All rights reserved.</span>
          </div>
          <a
            href="#top"
            className="text-neutral-300 hover:text-[#F8B018] font-semibold flex items-center gap-1 transition-colors"
          >
            Back to top <ArrowUpRight size={13} />
          </a>
        </div>
      </div>

      {/* DIRECT AT THE VERY LAST - LED DOT MATRIX FOOTER ("UDAY TRAVELS") */}
      <DotMatrixFooter />
    </footer>
  )
}
