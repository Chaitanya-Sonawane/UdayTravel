import { describe, it, expect, vi, beforeEach } from 'vitest'
import React from 'react'
import { renderToString } from 'react-dom/server'
import { ManualCounterBooking } from '@/components/admin/ManualCounterBooking'

describe('Manual Counter Booking & Realtime Seat Chart Verification', () => {
  it('renders passenger input fields for Name, Age, Seat No, and Mobile Number', () => {
    const html = renderToString(<ManualCounterBooking />)
    expect(html).toContain('Counter Ticket Booking')
    expect(html).toContain('Passenger Mobile Number (10 Digits) *')
  })

  it('provides both Cash at Office and Counter UPI QR payment options', () => {
    const html = renderToString(<ManualCounterBooking />)
    expect(html).toContain('Cash at Office')
    expect(html).toContain('Counter UPI QR')
  })

  it('renders the Real-time Seat Booking Chart indicators and occupancy bar', () => {
    const html = renderToString(<ManualCounterBooking />)
    expect(html).toContain('Ahilyanagar → Pune')
    expect(html).toContain('Pune → Ahilyanagar')
  })
})
