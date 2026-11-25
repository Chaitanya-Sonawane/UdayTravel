import { describe, it, expect, vi } from 'vitest'
import React from 'react'
import { renderToString } from 'react-dom/server'
import BookingSummaryPage from '@/app/booking/summary/page'
import { BookingSummary } from '@/components/booking/BookingSummary'
import { FareSection } from '@/components/booking/FareSection'
import { TripTimeline } from '@/components/booking/TripTimeline'
import { PassengerList } from '@/components/booking/PassengerList'
import { ContactSection } from '@/components/booking/ContactSection'

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
  }),
  useSearchParams: () => ({
    get: vi.fn().mockReturnValue(null),
  }),
}))

describe('Booking Summary Page UI/UX Consistency', () => {
  it('1. Renders the standardized brand header with back button and menu', () => {
    const html = renderToString(<BookingSummaryPage />)
    expect(html).toContain('account-header')
    expect(html).toContain('href="/seats"')
    expect(html).toContain('aria-label="Open menu"')
  })

  it('2. Renders the booking-progress bar highlighting up to Review step', () => {
    const html = renderToString(<BookingSummaryPage />)
    expect(html).toContain('booking-progress')
    expect(html).toContain('Bus')
    expect(html).toContain('Passengers')
    expect(html).toContain('Seats')
    expect(html).toContain('Review')
    expect(html).toContain('Payment')
  })

  it('3. Renders the luxury bus interior hero banner with BOOKING SUMMARY and hold timer pill', () => {
    const html = renderToString(<BookingSummaryPage />)
    expect(html).toContain('seats-hero')
    expect(html).toContain('seats-hero-overlay')
    expect(html).toContain('BOOKING')
    expect(html).toContain('SUMMARY.')
    expect(html).toContain('Hold expires in')
  })

  it('4. TripTimeline renders departure, arrival, duration pill, and boarding/drop details', () => {
    const trip = {
      seatType: 'Deluxe Air-Conditioned Coach',
      departure: {
        time: '07:00 AM',
        date: 'Nov 22',
        place: 'Ahilyanagar',
        boardingPoint: 'Office Bus Stand',
      },
      arrival: {
        time: '11:00 AM',
        date: 'Nov 22',
        place: 'Pune',
        dropPoint: 'Shivajinagar',
      },
      duration: '3h 30m',
    }
    const html = renderToString(<TripTimeline passengerCount={1} trip={trip} />)
    expect(html).toMatch(/Ahilyanagar.*to.*Pune/)
    expect(html).toContain('07:00 AM')
    expect(html).toContain('Office Bus Stand')
    expect(html).toContain('3h 30m')
    expect(html).toContain('11:00 AM')
    expect(html).toContain('Shivajinagar')
  })

  it('5. PassengerList renders passenger name, gender badge, age, and signature gold Seat No. tag', () => {
    const passengers = [
      { name: 'Amit Patil', gender: 'MALE' as const, age: 28, seatNo: 'A1' },
      { name: 'Sneha Deshmukh', gender: 'FEMALE' as const, age: 26, seatNo: 'A2' },
    ]
    const html = renderToString(<PassengerList passengers={passengers} />)
    expect(html).toContain('Amit Patil')
    expect(html).toContain('Sneha Deshmukh')
    expect(html).toMatch(/Seat (No\.\s*)?A1/)
    expect(html).toMatch(/Seat (No\.\s*)?A2/)
    expect(html).toMatch(/28.*(yrs|years)/)
    expect(html).toMatch(/26.*(yrs|years)/)
  })

  it('6. ContactSection renders formatted phone, email, and instant delivery guarantee', () => {
    const html = renderToString(
      <ContactSection contact={{ phone: '9890066580', email: 'care@udaytravel.in' }} />
    )
    expect(html).toContain('+91 98900 66580')
    expect(html).toContain('care@udaytravel.in')
    expect(html).toContain('SMS &amp; WhatsApp')
  })

  it('7. FareSection renders ticket fare, zero platform fees, and total payable', () => {
    const html = renderToString(
      <FareSection pricePerSeat={200} passengerCount={2} total={400} walletDiscount={50} />
    )
    expect(html.toUpperCase()).toContain('FARE BREAKDOWN')
    expect(html).toContain('2 Seats')
    expect(html).toContain('₹400')
    expect(html).toContain('0% Fee')
    expect(html).toContain('Wallet Store Credit Applied')
    expect(html).toMatch(/-.*₹50/)
    expect(html).toContain('Total Payable')
    expect(html).toContain('₹350')
  })

  it('8. Renders payment method selection with Razorpay Secure and Wallet', () => {
    const html = renderToString(<BookingSummaryPage />)
    expect(html.toUpperCase()).toContain('CHOOSE PAYMENT METHOD')
    expect(html).toContain('Razorpay Secure')
    expect(html).not.toContain('100% Secure Checkout')
    expect(html).not.toContain('256-bit SSL Encrypted')
  })

  it('9. Sticky CTA bar provides high-contrast Proceed to Pay button', () => {
    const html = renderToString(<BookingSummaryPage />)
    expect(html).toMatch(/Total Payable|Amount Payable/)
    expect(html).toMatch(/Proceed to Pay|Pay.*via Razorpay|Pay.*from Wallet/)
  })

  it('10. Renders 24/7 Helpline and link to Help Center', () => {
    const html = renderToString(<BookingSummaryPage />)
    expect(html).toContain('+91 98900 66580')
    expect(html).toContain('Help Center')
  })

  it('11. TripTimeline converts 24h times to 12h AM/PM and calculates correct Report By time', () => {
    const trip = {
      seatType: 'Deluxe Air-Conditioned Coach',
      departure: {
        time: '10:00',
        date: 'Nov 25',
        place: 'Pune',
        boardingPoint: 'Sangamwadi — 6:30 PM',
      },
      arrival: {
        time: '13:15',
        date: 'Nov 25',
        place: 'Ahilyanagar',
        dropPoint: 'Ekvira Chowk',
      },
      duration: '3h 15m',
    }
    const html = renderToString(<TripTimeline passengerCount={1} trip={trip} />)
    expect(html).toContain('10:00 AM')
    expect(html).toMatch(/Report by.*09:45 AM/)
    expect(html).toContain('01:15 PM')
    expect(html).toContain('Ahilyanagar')
  })

  it('12. TripTimeline cleans stale time suffixes and renders accurate city-aware landmarks for Pune -> Ahilyanagar', () => {
    const trip = {
      departure: {
        time: '10:00',
        date: 'Nov 25',
        place: 'Pune',
        boardingPoint: 'Sangamwadi — 6:30 PM',
      },
      arrival: {
        time: '13:15',
        date: 'Nov 25',
        place: 'Ahilyanagar',
        dropPoint: 'Ekvira Chowk',
      },
      duration: '3h 15m',
    }
    const html = renderToString(<TripTimeline passengerCount={1} trip={trip} />)
    // Boarding title should be cleaned: "Sangamwadi" without "6:30 PM"
    expect(html).toMatch(/Boarding:.*Sangamwadi/)
    expect(html).not.toContain('Sangamwadi — 6:30 PM')
    // Boarding landmark for Sangamwadi should be Pune-specific, NOT Maliwada
    expect(html).toContain('Sangamwadi Parking No. 1, Near Pune RTO')
    expect(html).not.toMatch(/Boarding:.*Sangamwadi[\s\S]*Near Maliwada/)
    // Drop landmark for Ekvira Chowk should be Ahilyanagar-specific, NOT Central Pune Terminal
    expect(html).toMatch(/Drop:.*Ekvira Chowk/)
    expect(html).toContain('Ekvira Chowk Junction • Nagar-Pune Highway Bypass')
    expect(html).not.toMatch(/Drop:.*Ekvira Chowk[\s\S]*Central Pune Terminal/)
  })

  it('13. TripTimeline provides active Google Maps search links for both boarding and drop locations', () => {
    const trip = {
      departure: {
        time: '10:00',
        date: 'Nov 25',
        place: 'Pune',
        boardingPoint: 'Sangamwadi — 6:30 PM',
      },
      arrival: {
        time: '13:15',
        date: 'Nov 25',
        place: 'Ahilyanagar',
        dropPoint: 'Ekvira Chowk',
      },
      duration: '3h 15m',
    }
    const html = renderToString(<TripTimeline passengerCount={1} trip={trip} />)
    expect(html).toContain('href="https://www.google.com/maps/search/?api=1&amp;query=Sangamwadi%2C%20Pune"')
    expect(html).toContain('href="https://www.google.com/maps/search/?api=1&amp;query=Ekvira%20Chowk%2C%20Ahilyanagar"')
    expect(html).toContain('View Map')
    expect(html).toContain('Drop Location')
  })
})
