'use client'

import React from 'react'
import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'

export default function AlternatingInfoSection() {
  return (
    <div
      className="w-full bg-white text-gray-900 selection:bg-[#F8B018] selection:text-black font-jakarta"
      style={{ fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}
    >
      <div className="max-w-[1560px] xl:max-w-[1680px] 2xl:max-w-[1800px] mx-auto px-5 sm:px-8 md:px-12 lg:px-16 py-20 sm:py-28 md:py-36 space-y-28 sm:space-y-36 md:space-y-44">

        {/* ======================================================== */}
        {/* ROW 1: ABOUT US (Header Inside Text Col Left, Image Right)*/}
        {/* ======================================================== */}
        <section id="about-us" className="w-full">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-10 md:gap-14 lg:gap-20 items-center">
            {/* Text Left (6 cols on Desktop) */}
            <div className="md:col-span-6 space-y-6">
              {/* Big Header inside text column */}
              <h2
                className="font-chakra font-black uppercase text-3xl sm:text-4xl md:text-5xl lg:text-[52px] xl:text-[58px] leading-[1.08] tracking-[-0.03em] text-left"
                style={{ fontFamily: "'Chakra Petch', sans-serif" }}
              >
                <span className="text-[#8E9BAE] mr-2.5 sm:mr-3.5 inline">ABOUT</span>
                <span className="text-[#0B0F19] inline">UDAY TRAVELS</span>
              </h2>

              <div className="text-gray-700 text-sm sm:text-base lg:text-[17px] leading-relaxed space-y-4 font-normal">
                <p>
                  Uday Travels is a reliable bus transportation service connecting <strong className="font-bold text-gray-900">Ahilyanagar and Pune</strong>. We provide affordable, punctual, and comfortable travel for students, professionals, families, and daily commuters.
                </p>
                <p>
                  Our services operate with a simple and transparent <strong className="font-bold text-gray-900">flat fare of ₹200 per seat</strong>. We use a modern <strong className="font-bold text-gray-900">digital booking and travel management platform</strong> to simplify the entire journey.
                </p>
                <p>
                  Passengers can select seats, book tickets, make secure online payments, and receive <strong className="font-bold text-gray-900">QR tickets via WhatsApp and SMS</strong>. Our system also manages family seating and passenger safety preferences during booking.
                </p>
                <p>
                  With <strong className="font-bold text-gray-900">real-time GPS bus tracking</strong>, passengers can monitor their bus location and journey progress. By combining reliable transportation with smart digital solutions, Uday Travels delivers a <strong className="font-bold text-gray-900">safer, simpler, and more convenient travel experience</strong>.
                </p>
              </div>

              <ul className="list-disc pl-5 space-y-2.5 text-gray-700 text-sm sm:text-[15px] lg:text-base pt-1">
                <li><strong className="font-bold text-gray-900">Corridor:</strong> Direct daily highway express connectivity between Ahilyanagar and Pune via NH60.</li>
                <li><strong className="font-bold text-gray-900">Fixed Fare:</strong> Flat ₹200 per seat with no surge pricing, hidden fees, or festival markups.</li>
                <li><strong className="font-bold text-gray-900">Boarding &amp; Drops:</strong> 20 convenient pick-up points across Ahilyanagar and 12 drop-off stops across Pune.</li>
                <li><strong className="font-bold text-gray-900">Instant Ticketing:</strong> Paperless verified QR pass delivered directly to your WhatsApp and SMS.</li>
              </ul>

              {/* Action Yellow Button */}
              <div className="pt-3">
                <Link
                  href="/availability"
                  className="inline-flex items-center gap-2.5 px-8 py-4 rounded-none bg-[#F8B018] hover:bg-[#E5A010] text-[#0B0F19] font-black text-sm sm:text-base shadow-sm hover:shadow-md active:scale-95 transition-all cursor-pointer group"
                >
                  <span>Check bus availability &amp; schedules</span>
                  <ArrowUpRight size={18} className="stroke-[2.5] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </Link>
              </div>
            </div>

            {/* Image Right (6 cols on Desktop) - Big in height, width and length */}
            <div className="md:col-span-6 flex items-center justify-center">
              <div className="w-full max-w-[760px] xl:max-w-[840px] flex items-center justify-center overflow-visible p-2 sm:p-4">
                <img
                  src="/images/sections/about-bus-white-theme.png"
                  alt="Uday Travels bus with city skyline"
                  className="w-full h-auto min-h-[340px] sm:min-h-[420px] md:min-h-[480px] lg:min-h-[540px] max-h-[760px] object-contain scale-110 sm:scale-115 md:scale-120 transition-transform duration-500 ease-out hover:scale-125 animate-float-gentle drop-shadow-md"
                />
              </div>
            </div>
          </div>
        </section>

        {/* ======================================================== */}
        {/* ROW 2: DEDICATED TRAVELLER SUPPORT (Image Left, Header Right) */}
        {/* ======================================================== */}
        <section id="support" className="w-full pt-20 sm:pt-28 border-t border-gray-100">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-10 md:gap-14 lg:gap-20 items-center">
            {/* Image Left (6 cols on Desktop) - Big in height, width and length */}
            <div className="md:col-span-6 order-2 md:order-1 flex items-center justify-center">
              <div className="w-full max-w-[760px] xl:max-w-[840px] flex items-center justify-center overflow-visible p-2 sm:p-4">
                <img
                  src="/images/sections/support-passenger-white-theme.png"
                  alt="Traveller happy with Uday Travels service"
                  className="w-full h-auto min-h-[340px] sm:min-h-[420px] md:min-h-[480px] lg:min-h-[540px] max-h-[760px] object-contain scale-110 sm:scale-115 md:scale-120 transition-transform duration-500 ease-out hover:scale-125 animate-float-gentle-delayed drop-shadow-md"
                />
              </div>
            </div>

            {/* Text Right (6 cols on Desktop) - Dedicated Traveller Support */}
            <div className="md:col-span-6 order-1 md:order-2 space-y-6">
              {/* Big Header inside text column */}
              <h2
                className="font-chakra font-black uppercase text-2xl sm:text-3xl md:text-4xl lg:text-[44px] xl:text-[50px] leading-[1.08] tracking-[-0.03em] text-left"
                style={{ fontFamily: "'Chakra Petch', sans-serif" }}
              >
                <span className="text-[#8E9BAE] mr-2.5 sm:mr-3.5 inline">DEDICATED</span>
                <span className="text-[#0B0F19] inline">TRAVELLER SUPPORT</span>
              </h2>

              <div className="text-gray-700 text-sm sm:text-base lg:text-[17px] leading-relaxed space-y-4 font-normal">
                <p>
                  Uday Travels is a reliable bus transportation service connecting <strong className="font-bold text-gray-900">Ahilyanagar and Pune</strong>, providing affordable, punctual, and comfortable travel for students, professionals, families, and daily commuters.
                </p>
                <p>
                  With a transparent <strong className="font-bold text-gray-900">flat fare of ₹200 per seat</strong>, we combine dependable bus services with a modern digital booking and travel management platform.
                </p>
                <p>
                  Passengers can select seats, book tickets, make secure online payments, and receive <strong className="font-bold text-gray-900">QR tickets through WhatsApp and SMS</strong>. Our system also supports family seating, passenger safety preferences, and <strong className="font-bold text-gray-900">real-time GPS bus tracking</strong>, making it easier for passengers to monitor their journey.
                </p>
                <p>
                  By combining reliable transportation with smart digital solutions, Uday Travels aims to deliver a <strong className="font-bold text-gray-900">safer, simpler, and more convenient travel experience</strong>.
                </p>
              </div>

              <ul className="list-disc pl-5 space-y-2.5 text-gray-700 text-sm sm:text-[15px] lg:text-base pt-1">
                <li>
                  <strong className="font-bold text-gray-900">Helpline:</strong>{' '}
                  <a href="tel:+919890066580" className="text-gray-900 hover:text-black underline font-bold transition-colors">
                    +91 98900 66580
                  </a>{' '}
                  — Immediate telephone assistance for schedule updates and pickup coordination.
                </li>
                <li>
                  <strong className="font-bold text-gray-900">Email Assistance:</strong>{' '}
                  <a href="mailto:udaytravels6787@gmail.com" className="text-gray-900 hover:text-black underline font-bold transition-colors">
                    udaytravels6787@gmail.com
                  </a>{' '}
                  for formal invoices, corporate inquiries, and feedback.
                </li>
                <li>
                  <strong className="font-bold text-gray-900">Live GPS Tracking:</strong> Real-time tracking link active from 60 minutes prior to departure.
                </li>
              </ul>

              {/* Action Yellow Button */}
              <div className="pt-3">
                <Link
                  href="/help"
                  className="inline-flex items-center gap-2.5 px-8 py-4 rounded-none bg-[#F8B018] hover:bg-[#E5A010] text-[#0B0F19] font-black text-sm sm:text-base shadow-sm hover:shadow-md active:scale-95 transition-all cursor-pointer group"
                >
                  <span>Visit Help Center &amp; FAQs</span>
                  <ArrowUpRight size={18} className="stroke-[2.5] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ======================================================== */}
        {/* ROW 3: TRAVEL POLICY (Header Inside Text Col Left, Image Right) */}
        {/* ======================================================== */}
        <section id="policy" className="w-full pt-20 sm:pt-28 border-t border-gray-100">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-10 md:gap-14 lg:gap-20 items-center">
            {/* Text Left (6 cols on Desktop) */}
            <div className="md:col-span-6 space-y-6">
              {/* Big Header inside text column */}
              <h2
                className="font-chakra font-black uppercase text-2xl sm:text-3xl md:text-4xl lg:text-[40px] xl:text-[46px] leading-[1.08] tracking-[-0.03em] text-left"
                style={{ fontFamily: "'Chakra Petch', sans-serif" }}
              >
                <span className="text-[#8E9BAE] mr-2.5 sm:mr-3.5 inline">FAIR TRAVEL &amp;</span>
                <span className="text-[#0B0F19] inline">CANCELLATION POLICY</span>
              </h2>

              <div className="text-gray-700 text-sm sm:text-base lg:text-[17px] leading-relaxed space-y-4 font-normal">
                <p>
                  Uday Travels allows ticket cancellations up to <strong className="font-bold text-gray-900">2 hours before the scheduled departure</strong>. For eligible cancellations, <strong className="font-bold text-gray-900">25% of the refund is returned to the original payment method within 3–5 business days</strong>, while the remaining <strong className="font-bold text-gray-900">75% is credited instantly to the Uday Travels Wallet</strong> with no expiry.
                </p>
                <p>
                  A <strong className="font-bold text-gray-900">₹50 per-seat cancellation charge</strong> may apply. Cancellations made within 2 hours of departure or after the bus has departed are non-refundable.
                </p>
                <p>
                  Passengers should report at least <strong className="font-bold text-gray-900">15 minutes before departure</strong>, carry a valid government-approved photo ID and digital QR ticket, and may carry up to <strong className="font-bold text-gray-900">15 kg of personal luggage</strong>.
                </p>
                <p>
                  Our seating system also supports passenger safety by <strong className="font-bold text-gray-900">restricting unrelated mixed-gender seating</strong>, while verified families and groups can sit together.
                </p>
              </div>

              <ul className="list-disc pl-5 space-y-2.5 text-gray-700 text-sm sm:text-[15px] lg:text-base pt-1">
                <li><strong className="font-bold text-gray-900">25% Payment Source:</strong> Directly refunded to your bank or UPI account in 3–5 banking days.</li>
                <li><strong className="font-bold text-gray-900">75% Instant Wallet:</strong> Stored safely in your account with zero deductions and zero expiry.</li>
                <li><strong className="font-bold text-gray-900">Luggage Allowance:</strong> Up to 15 kg personal luggage per passenger; hazardous items strictly prohibited.</li>
                <li><strong className="font-bold text-gray-900">Gender Protection:</strong> Women traveling alone will never be assigned adjacent seats next to unrelated male passengers.</li>
              </ul>

              {/* Action Yellow Button */}
              <div className="pt-3">
                <Link
                  href="/policies"
                  className="inline-flex items-center gap-2.5 px-8 py-4 rounded-none bg-[#F8B018] hover:bg-[#E5A010] text-[#0B0F19] font-black text-sm sm:text-base shadow-sm hover:shadow-md active:scale-95 transition-all cursor-pointer group"
                >
                  <span>Read comprehensive policy details</span>
                  <ArrowUpRight size={18} className="stroke-[2.5] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </Link>
              </div>
            </div>

            {/* Image Right (6 cols on Desktop) - Big in height, width and length */}
            <div className="md:col-span-6 flex items-center justify-center">
              <div className="w-full max-w-[760px] xl:max-w-[840px] flex items-center justify-center overflow-visible p-2 sm:p-4">
                <img
                  src="/images/sections/policy-refund-white-theme.png"
                  alt="Traveller celebrating refund receipt"
                  className="w-full h-auto min-h-[340px] sm:min-h-[420px] md:min-h-[480px] lg:min-h-[540px] max-h-[760px] object-contain scale-110 sm:scale-115 md:scale-120 transition-transform duration-500 ease-out hover:scale-125 animate-float-gentle drop-shadow-md"
                />
              </div>
            </div>
          </div>
        </section>

        {/* ======================================================== */}
        {/* ROW 4: GET IN TOUCH WITH UDAY TRAVELS (Image Left, Header Right) */}
        {/* ======================================================== */}
        <section id="contact" className="w-full pt-20 sm:pt-28 border-t border-gray-100">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-10 md:gap-14 lg:gap-20 items-center">
            {/* Image Left (6 cols on Desktop) - Big in height, width and length */}
            <div className="md:col-span-6 order-2 md:order-1 flex items-center justify-center">
              <div className="w-full max-w-[760px] xl:max-w-[840px] flex items-center justify-center overflow-visible p-2 sm:p-4">
                <img
                  src="/images/sections/contact-office-white-theme.png"
                  alt="Customer booking online from home"
                  className="w-full h-auto min-h-[340px] sm:min-h-[420px] md:min-h-[480px] lg:min-h-[540px] max-h-[760px] object-contain scale-110 sm:scale-115 md:scale-120 transition-transform duration-500 ease-out hover:scale-125 animate-float-gentle-delayed drop-shadow-md"
                />
              </div>
            </div>

            {/* Text Right (6 cols on Desktop) - Get In Touch With Uday Travels */}
            <div className="md:col-span-6 order-1 md:order-2 space-y-6">
              {/* Big Header inside text column */}
              <h2
                className="font-chakra font-black uppercase text-2xl sm:text-3xl md:text-4xl lg:text-[42px] xl:text-[48px] leading-[1.08] tracking-[-0.03em] text-left"
                style={{ fontFamily: "'Chakra Petch', sans-serif" }}
              >
                <span className="text-[#8E9BAE] mr-2.5 sm:mr-3.5 inline">GET IN TOUCH</span>
                <span className="text-[#0B0F19] inline">WITH UDAY TRAVELS</span>
              </h2>

              <p className="text-gray-700 text-sm sm:text-base lg:text-[17px] leading-relaxed font-normal">
                We’re here to help with your bookings, travel queries, ticket support, and other assistance. You can reach the Uday Travels team through phone, email, or by visiting our booking counter.
              </p>

              <ul className="list-disc pl-5 space-y-2.5 text-gray-700 text-sm sm:text-[15px] lg:text-base pt-1">
                <li>
                  <strong className="font-bold text-gray-900">Head Office &amp; Booking Counter:</strong>{' '}
                  Shop No. 13, Santachaya Apartment, Opposite Kohinoor Maangal Karyalaya, Gulmohar Road, Savedi, Ahilyanagar, Maharashtra – 414003.
                </li>
                <li>
                  <strong className="font-bold text-gray-900">Working Hours:</strong>{' '}
                  Open daily from 5:00 AM to 10:30 PM.
                </li>
                <li>
                  <strong className="font-bold text-gray-900">Phone Support:</strong>{' '}
                  <a href="tel:+919890066580" className="text-gray-900 hover:text-black underline font-bold transition-colors">
                    +91 98900 66580
                  </a>{' '}
                  — Call us for assistance, booking help, and ticket-related queries.
                </li>
                <li>
                  <strong className="font-bold text-gray-900">Email Support:</strong>{' '}
                  <a href="mailto:udaytravels6787@gmail.com" className="text-gray-900 hover:text-black underline font-bold transition-colors">
                    udaytravels6787@gmail.com
                  </a>{' '}
                  — Contact us for support, feedback, and corporate enquiries.
                </li>
              </ul>

              {/* Action Row: Yellow Theme Square Box Button for Google Maps */}
              <div className="pt-3 flex flex-wrap items-center gap-4">
                <a
                  href="https://www.google.com/maps/search/?api=1&query=Shop+no.+13%2C+Santachaya+Apartment%2C+Gulmohar+Road%2C+Savedi%2C+Ahilyanagar%2C+Maharashtra+414003"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2.5 px-8 py-4 rounded-none bg-[#F8B018] hover:bg-[#E5A010] text-[#0B0F19] font-black text-sm sm:text-base shadow-sm hover:shadow-md active:scale-95 transition-all cursor-pointer group"
                >
                  <span>Find Our Office on Google Maps</span>
                  <ArrowUpRight size={18} className="stroke-[2.5] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </a>
              </div>
            </div>
          </div>
        </section>

      </div>
    </div>
  )
}
