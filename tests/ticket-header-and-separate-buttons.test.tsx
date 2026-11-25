import { describe, it, expect, vi } from 'vitest'
import React from 'react'
import { renderToString } from 'react-dom/server'

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useParams: () => ({ ticketNo: 'UT-AP-QCS2UE' }),
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
}))

// Mock mock-tickets
vi.mock('@/lib/mock-tickets', () => ({
  getTicket: (ticketNo: string) => ({
    ticketNo,
    pnr: ticketNo,
    qrToken: 'sample-qr-token',
    status: 'CONFIRMED',
    route: { from: 'Ahilyanagar', to: 'Pune' },
    travelDate: '2026-11-26',
    busNumber: 'MH 16 DP 4951',
    busType: '3+2 Seater',
    busName: 'Uday Express',
    pickup: { name: 'Ekvira Chowk', time: '06:30' },
    drop: { name: 'Four Points', time: '09:30' },
    passengers: [
      { name: 'Chaitanya Sonawane', age: 22, gender: 'male', seat: 'A3' },
      { name: 'ShreeNidhi', age: 5, gender: 'female', seat: 'B3' },
    ],
    fare: { perSeat: 200, total: 400 },
  }),
}))

// Mock client-auth & firebase
vi.mock('@/lib/auth/client-auth', () => ({
  subscribeToAuth: (cb: any) => {
    cb({ uid: 'test-user', isAnonymous: false })
    return () => {}
  },
  signOutUser: vi.fn(),
  fetchCurrentProfile: async () => ({ profile: { name: 'Test User' } }),
}))

vi.mock('@/lib/firebase/client', () => ({
  getApiAuthHeaders: async () => ({}),
}))

import TicketPage from '@/app/ticket/[ticketNo]/page'
import CancelTicketPage from '@/app/ticket/[ticketNo]/cancel/page'

describe('Ticket Page Header & Separate Buttons', () => {
  it('renders availability-style header on the ticket page with navigation links and clean header', () => {
    const html = renderToString(<TicketPage />)

    // Navigation bar does NOT contain the logo/return link per user specification
    expect(html).toContain('ticket-header-back')
    expect(html).not.toContain('availability-logo')

    // Check desktop navigation links matching Availability page
    expect(html).toContain('Book a seat')
    expect(html).toContain('/availability')
    expect(html).toContain('About Us')
    expect(html).toContain('/about')
    expect(html).toContain('Policies')
    expect(html).toContain('/policies')
    expect(html).toContain('Contact Us')
    expect(html).toContain('/contact')

    // Check mobile menu trigger & Account button
    expect(html).toContain('aria-label="Open menu"')
    expect(html).toContain('Account')
  })

  it('renders Go to Wallet button linking to /account', () => {
    const html = renderToString(<TicketPage />)
    expect(html).toContain('Go to Wallet')
    expect(html).toContain('href="/account"')
  })

  it('renders View all bookings and Cancel booking as two separate buttons', () => {
    const html = renderToString(<TicketPage />)

    // View all bookings link
    expect(html).toContain('View all bookings')
    expect(html).toContain('href="/bookings"')

    // Cancel booking button
    expect(html).toContain('Cancel booking')
    expect(html).toContain('<button type="button"')

    // Ensures it's not the old combined inline bullet text link
    expect(html).not.toContain('View all bookings • Cancel booking')
  })

  it('renders prominent ticket download options for PDF generation', () => {
    const html = renderToString(<TicketPage />)

    // PDF download link in actions card
    expect(html).toContain('Download Ticket (PDF)')
    expect(html).toContain('href="/api/tickets/UT-AP-QCS2UE/pdf"')
    expect(html).toContain('download="UdayTravels-UT-AP-QCS2UE.pdf"')

    // Responsive desktop layout without huge side gutters
    expect(html).toContain('lg:max-w-6xl')
    expect(html).toContain('lg:grid lg:grid-cols-12')
  })

  it('renders availability-style header on the cancel ticket page', () => {
    const html = renderToString(<CancelTicketPage />)

    // Check back button and policy content
    expect(html).toContain('ticket-header-back')
    expect(html).toContain('Cancel Booking')
    expect(html).toContain('Uday Travels Policy')

    // Check navigation links
    expect(html).toContain('Book a seat')
    expect(html).toContain('/availability')
    expect(html).toContain('About Us')
    expect(html).toContain('/about')
    expect(html).toContain('Policies')
    expect(html).toContain('/policies')
    expect(html).toContain('Contact Us')
    expect(html).toContain('/contact')
    expect(html).toContain('aria-label="Open menu"')
  })
})
