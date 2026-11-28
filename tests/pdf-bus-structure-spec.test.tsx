import { describe, it, expect } from 'vitest'
import React from 'react'
import { renderToString } from 'react-dom/server'
import {
  BUS_55_TEMPLATE,
  BUS_44_TEMPLATE,
  BUS_33_TEMPLATE,
  getBusTemplate,
  getTemplateForBus,
} from '@/lib/domain/seats/bus-templates'
import { ManualCounterBooking } from '@/components/admin/ManualCounterBooking'
import { DailyRouteBusScheduler } from '@/components/admin/DailyRouteBusScheduler'

describe('PDF Bus Structure & Seat Chart Selection Specifications', () => {
  describe('Page 1: MH 16 DP 4951 (55 Seats, 2+3 Layout)', () => {
    it('matches exact fleet details, capacity, and header registration', () => {
      expect(BUS_55_TEMPLATE.busNumber).toBe('MH 16 DP 4951')
      expect(BUS_55_TEMPLATE.name).toBe('Uday Bus')
      expect(BUS_55_TEMPLATE.capacity).toBe(55)
      expect(BUS_55_TEMPLATE.layoutType).toBe('2+3')
    })

    it('has front row with Seat 1 on left and Seats 2, 3, 4 on right', () => {
      expect(BUS_55_TEMPLATE.frontRow).toBeDefined()
      expect(BUS_55_TEMPLATE.frontRow?.leftSeats).toEqual(['1'])
      expect(BUS_55_TEMPLATE.frontRow?.rightSeats).toEqual(['2', '3', '4'])
      expect(BUS_55_TEMPLATE.frontSeats).toEqual(['1', '2', '3', '4'])
    })

    it('has 9 rows (A to I) with 2 left and 3 right seats (45 seats)', () => {
      expect(BUS_55_TEMPLATE.rows.length).toBe(9)
      const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I']
      rows.forEach((r, idx) => {
        const row = BUS_55_TEMPLATE.rows[idx]
        expect(row?.rowLabel).toBe(r)
        expect(row?.leftSeats).toEqual([`${r}1`, `${r}2`])
        expect(row?.rightSeats).toEqual([`${r}3`, `${r}4`, `${r}5`])
      })
    })

    it('has rear bench with 6 seats (J1 to J6)', () => {
      expect(BUS_55_TEMPLATE.rearBench).toEqual(['J1', 'J2', 'J3', 'J4', 'J5', 'J6'])
      expect(BUS_55_TEMPLATE.rearBench.length).toBe(6)
    })

    it('sums up to exactly 55 seats without duplicates', () => {
      expect(BUS_55_TEMPLATE.allSeatIds.length).toBe(55)
      const unique = new Set(BUS_55_TEMPLATE.allSeatIds)
      expect(unique.size).toBe(55)
    })

    it('adheres to front row physical adjacency', () => {
      expect(BUS_55_TEMPLATE.adjacentSeatsOf('1')).toEqual([])
      expect(BUS_55_TEMPLATE.adjacentSeatsOf('2')).toEqual(['3'])
      expect(BUS_55_TEMPLATE.adjacentSeatsOf('3')).toEqual(['2', '4'])
      expect(BUS_55_TEMPLATE.adjacentSeatsOf('4')).toEqual(['3'])
    })
  })

  describe('Page 2: MH 16 DV 1003 (44 Seats, 2+2 Layout)', () => {
    it('matches exact fleet details, capacity, and header registration', () => {
      expect(BUS_44_TEMPLATE.busNumber).toBe('MH 16 DV 1003')
      expect(BUS_44_TEMPLATE.name).toBe('Uday Bus')
      expect(BUS_44_TEMPLATE.capacity).toBe(44)
      expect(BUS_44_TEMPLATE.layoutType).toBe('2+2')
    })

    it('has front row with Seat 1 on left and Seats 2, 3 on right', () => {
      expect(BUS_44_TEMPLATE.frontRow).toBeDefined()
      expect(BUS_44_TEMPLATE.frontRow?.leftSeats).toEqual(['1'])
      expect(BUS_44_TEMPLATE.frontRow?.rightSeats).toEqual(['2', '3'])
      expect(BUS_44_TEMPLATE.frontSeats).toEqual(['1', '2', '3'])
    })

    it('has 9 rows (A to I) with 2 left and 2 right seats (36 seats)', () => {
      expect(BUS_44_TEMPLATE.rows.length).toBe(9)
      const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I']
      rows.forEach((r, idx) => {
        const row = BUS_44_TEMPLATE.rows[idx]
        expect(row?.rowLabel).toBe(r)
        expect(row?.leftSeats).toEqual([`${r}1`, `${r}2`])
        expect(row?.rightSeats).toEqual([`${r}3`, `${r}4`])
      })
    })

    it('has rear bench with 5 seats (J1 to J5)', () => {
      expect(BUS_44_TEMPLATE.rearBench).toEqual(['J1', 'J2', 'J3', 'J4', 'J5'])
      expect(BUS_44_TEMPLATE.rearBench.length).toBe(5)
    })

    it('sums up to exactly 44 seats without duplicates', () => {
      expect(BUS_44_TEMPLATE.allSeatIds.length).toBe(44)
      const unique = new Set(BUS_44_TEMPLATE.allSeatIds)
      expect(unique.size).toBe(44)
    })

    it('adheres to front row physical adjacency', () => {
      expect(BUS_44_TEMPLATE.adjacentSeatsOf('1')).toEqual([])
      expect(BUS_44_TEMPLATE.adjacentSeatsOf('2')).toEqual(['3'])
      expect(BUS_44_TEMPLATE.adjacentSeatsOf('3')).toEqual(['2'])
    })
  })

  describe('Page 3: MH 16 DP 3951 (33 Seats, 2+2 Layout, Numbers 1..33)', () => {
    it('matches exact fleet details, capacity, and header registration', () => {
      expect(BUS_33_TEMPLATE.busNumber).toBe('MH 16 DP 3951')
      expect(BUS_33_TEMPLATE.name).toBe('Uday Bus')
      expect(BUS_33_TEMPLATE.capacity).toBe(33)
      expect(BUS_33_TEMPLATE.layoutType).toBe('2+2')
    })

    it('has 7 serpentine rows exactly matching PDF Page 3', () => {
      expect(BUS_33_TEMPLATE.rows.length).toBe(7)
      expect(BUS_33_TEMPLATE.rows[0]?.leftSeats).toEqual(['1', '2'])
      expect(BUS_33_TEMPLATE.rows[0]?.rightSeats).toEqual(['3', '4'])

      expect(BUS_33_TEMPLATE.rows[1]?.leftSeats).toEqual(['8', '7'])
      expect(BUS_33_TEMPLATE.rows[1]?.rightSeats).toEqual(['6', '5'])

      expect(BUS_33_TEMPLATE.rows[2]?.leftSeats).toEqual(['9', '10'])
      expect(BUS_33_TEMPLATE.rows[2]?.rightSeats).toEqual(['11', '12'])

      expect(BUS_33_TEMPLATE.rows[3]?.leftSeats).toEqual(['16', '15'])
      expect(BUS_33_TEMPLATE.rows[3]?.rightSeats).toEqual(['14', '13'])

      expect(BUS_33_TEMPLATE.rows[4]?.leftSeats).toEqual(['17', '18'])
      expect(BUS_33_TEMPLATE.rows[4]?.rightSeats).toEqual(['19', '20'])

      // Row 6 serpentine: 24, 23 | 22, 21
      expect(BUS_33_TEMPLATE.rows[5]?.leftSeats).toEqual(['24', '23'])
      expect(BUS_33_TEMPLATE.rows[5]?.rightSeats).toEqual(['22', '21'])

      expect(BUS_33_TEMPLATE.rows[6]?.leftSeats).toEqual(['25', '26'])
      expect(BUS_33_TEMPLATE.rows[6]?.rightSeats).toEqual(['27', '28'])
    })

    it('has rear bench with 5 seats (33, 32, 31, 30, 29)', () => {
      expect(BUS_33_TEMPLATE.rearBench).toEqual(['33', '32', '31', '30', '29'])
      expect(BUS_33_TEMPLATE.rearBench.length).toBe(5)
    })

    it('sums up to exactly 33 seats without duplicates', () => {
      expect(BUS_33_TEMPLATE.allSeatIds.length).toBe(33)
      const unique = new Set(BUS_33_TEMPLATE.allSeatIds)
      expect(unique.size).toBe(33)
    })

    it('verifies Row 6 physical adjacency', () => {
      expect(BUS_33_TEMPLATE.adjacentSeatsOf('24')).toEqual(['23'])
      expect(BUS_33_TEMPLATE.adjacentSeatsOf('23')).toEqual(['24'])
      expect(BUS_33_TEMPLATE.adjacentSeatsOf('22')).toEqual(['21'])
      expect(BUS_33_TEMPLATE.adjacentSeatsOf('21')).toEqual(['22'])
    })
  })

  describe('UI Coach Shell & Registration Header Matching PDF', () => {
    it('renders FRONT OF BUS, Entrance, and BACK OF BUS in DailyRouteBusScheduler', () => {
      const html = renderToString(<DailyRouteBusScheduler />)
      expect(html).toContain('FRONT OF BUS')
      expect(html).toContain('Entrance')
      expect(html).toContain('BACK OF BUS')
      expect(html).toContain('MH 16 DP 4951')
      expect(html).toContain('55 seats')
    })

    it('renders FRONT OF BUS, Entrance, and BACK OF BUS in ManualCounterBooking', () => {
      const html = renderToString(<ManualCounterBooking />)
      expect(html).toContain('FRONT OF BUS')
      expect(html).toContain('Entrance')
      expect(html).toContain('BACK OF BUS')
    })
  })
})
