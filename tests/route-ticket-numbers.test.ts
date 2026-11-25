import { describe, it, expect } from 'vitest'
import { TicketsRepository } from '@/lib/data/tickets.repo'
import { TicketDocSchema } from '@/lib/schemas/ticket.schema'

describe('Route-Specific Unique Ticket Number Generation', () => {
  it('correctly extracts route short codes', () => {
    expect(TicketsRepository.getRouteCode('AHM_PUN')).toBe('AP')
    expect(TicketsRepository.getRouteCode('PUN_AHM')).toBe('PA')
    expect(TicketsRepository.getRouteCode('AHM_JAM')).toBe('AJ')
    expect(TicketsRepository.getRouteCode('JAM_AHM')).toBe('JA')
    expect(TicketsRepository.getRouteCode()).toBe('EXP')
  })

  it('generates route-specific ticket numbers for Ahilyanagar -> Pune', () => {
    const tNo = TicketsRepository.generateTicketNo('AHM_PUN')
    expect(tNo).toMatch(/^UT-AP-[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{6}$/)
    expect(tNo.startsWith('UT-AP-')).toBe(true)
  })

  it('generates route-specific ticket numbers for Pune -> Ahilyanagar', () => {
    const tNo = TicketsRepository.generateTicketNo('PUN_AHM')
    expect(tNo).toMatch(/^UT-PA-[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{6}$/)
    expect(tNo.startsWith('UT-PA-')).toBe(true)
  })

  it('guarantees uniqueness across 1000 generated ticket numbers', () => {
    const set = new Set<string>()
    for (let i = 0; i < 1000; i++) {
      const route = i % 2 === 0 ? 'AHM_PUN' : 'PUN_AHM'
      const tNo = TicketsRepository.generateTicketNo(route)
      expect(set.has(tNo)).toBe(false)
      set.add(tNo)
    }
    expect(set.size).toBe(1000)
  })

  it('passes TicketDocSchema ticketNo validation', () => {
    const apTicket = TicketsRepository.generateTicketNo('AHM_PUN')
    const paTicket = TicketsRepository.generateTicketNo('PUN_AHM')

    expect(TicketDocSchema.shape.ticketNo.safeParse(apTicket).success).toBe(true)
    expect(TicketDocSchema.shape.ticketNo.safeParse(paTicket).success).toBe(true)
    // Legacy support check
    expect(TicketDocSchema.shape.ticketNo.safeParse('UTUW4KVH').success).toBe(true)
  })
})
