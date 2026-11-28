/**
 * Uday Travels Bus Layout Templates
 *
 * Defines the physical seating layout, capacities, seat ID arrays,
 * aisle configurations, and contiguous zones for all three buses in the fleet.
 */

export type BusTemplateId = 'BUS_55' | 'BUS_44' | 'BUS_33'

export interface BusSeatRow {
  rowLabel: string
  leftSeats: string[]
  rightSeats: string[]
}

export interface FrontRowLayout {
  leftSeats: string[]
  rightSeats: string[]
}

export interface BusLayoutTemplate {
  id: BusTemplateId
  name: string
  busNumber: string
  capacity: number
  layoutType: '2+3' | '2+2'
  frontRow?: FrontRowLayout
  frontSeats: string[]
  rows: BusSeatRow[]
  rearBench: string[]
  allSeatIds: string[]
  /** Maps seatId to its contiguous zone for gender-safety rules */
  zoneOf: (seatId: string) => string
  /** Returns adjacent seats that share a physical row/bench boundary without an aisle */
  adjacentSeatsOf: (seatId: string) => string[]
}

// -------------------------------------------------------------
// 1. BUS_55: 55-Seater — MH 16 DP 4951 (2+3 Layout)
// -------------------------------------------------------------
const rows55: BusSeatRow[] = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'].map((row) => ({
  rowLabel: row,
  leftSeats: [`${row}1`, `${row}2`],
  rightSeats: [`${row}3`, `${row}4`, `${row}5`],
}))

const front55Row: FrontRowLayout = {
  leftSeats: ['1'],
  rightSeats: ['2', '3', '4'],
}
const front55: string[] = ['1', '2', '3', '4']
const rear55 = ['J1', 'J2', 'J3', 'J4', 'J5', 'J6'] // 6-seat rear bench

const allSeats55 = [
  ...front55,
  ...rows55.flatMap((r) => [...r.leftSeats, ...r.rightSeats]),
  ...rear55,
]

export const BUS_55_TEMPLATE: BusLayoutTemplate = {
  id: 'BUS_55',
  name: 'Uday Bus',
  busNumber: 'MH 16 DP 4951',
  capacity: 55,
  layoutType: '2+3',
  frontRow: front55Row,
  frontSeats: front55,
  rows: rows55,
  rearBench: rear55,
  allSeatIds: allSeats55,
  zoneOf: (seatId: string) => {
    if (rear55.includes(seatId)) return 'ZONE_REAR_BENCH'
    if (seatId === '1') return 'ZONE_FRONT_LEFT'
    if (['2', '3', '4'].includes(seatId)) return 'ZONE_FRONT_RIGHT'
    const row = seatId[0]
    const col = Number(seatId.slice(1))
    return col <= 2 ? `${row}-L` : `${row}-R`
  },
  adjacentSeatsOf: (seatId: string): string[] => {
    if (rear55.includes(seatId)) {
      const idx = rear55.indexOf(seatId)
      const res: string[] = []
      if (idx > 0 && rear55[idx - 1]) res.push(rear55[idx - 1]!)
      if (idx < rear55.length - 1 && rear55[idx + 1]) res.push(rear55[idx + 1]!)
      return res
    }
    if (seatId === '1') return []
    if (seatId === '2') return ['3']
    if (seatId === '3') return ['2', '4']
    if (seatId === '4') return ['3']

    const row = seatId[0]
    const col = Number(seatId.slice(1))
    if (col === 1) return [`${row}2`]
    if (col === 2) return [`${row}1`]
    if (col === 3) return [`${row}4`]
    if (col === 4) return [`${row}3`, `${row}5`]
    if (col === 5) return [`${row}4`]
    return []
  },
}

// -------------------------------------------------------------
// 2. BUS_44: 44-Seater — MH 16 DV 1003 (2+2 Layout)
// -------------------------------------------------------------
const rows44: BusSeatRow[] = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'].map((row) => ({
  rowLabel: row,
  leftSeats: [`${row}1`, `${row}2`],
  rightSeats: [`${row}3`, `${row}4`],
}))

const front44Row: FrontRowLayout = {
  leftSeats: ['1'],
  rightSeats: ['2', '3'],
}
const front44 = ['1', '2', '3'] // Front entrance seats: 1 on left, 2, 3 on right
const rear44 = ['J1', 'J2', 'J3', 'J4', 'J5'] // 5-seat rear bench

const allSeats44 = [
  ...front44,
  ...rows44.flatMap((r) => [...r.leftSeats, ...r.rightSeats]),
  ...rear44,
]

export const BUS_44_TEMPLATE: BusLayoutTemplate = {
  id: 'BUS_44',
  name: 'Uday Bus',
  busNumber: 'MH 16 DV 1003',
  capacity: 44,
  layoutType: '2+2',
  frontRow: front44Row,
  frontSeats: front44,
  rows: rows44,
  rearBench: rear44,
  allSeatIds: allSeats44,
  zoneOf: (seatId: string) => {
    if (rear44.includes(seatId)) return 'ZONE_REAR_BENCH'
    if (seatId === '1') return 'ZONE_FRONT_LEFT'
    if (['2', '3'].includes(seatId)) return 'ZONE_FRONT_RIGHT'
    const row = seatId[0]
    const col = Number(seatId.slice(1))
    return col <= 2 ? `${row}-L` : `${row}-R`
  },
  adjacentSeatsOf: (seatId: string): string[] => {
    if (rear44.includes(seatId)) {
      const idx = rear44.indexOf(seatId)
      const res: string[] = []
      if (idx > 0 && rear44[idx - 1]) res.push(rear44[idx - 1]!)
      if (idx < rear44.length - 1 && rear44[idx + 1]) res.push(rear44[idx + 1]!)
      return res
    }
    if (seatId === '1') return []
    if (seatId === '2') return ['3']
    if (seatId === '3') return ['2']

    const row = seatId[0]
    const col = Number(seatId.slice(1))
    if (col === 1) return [`${row}2`]
    if (col === 2) return [`${row}1`]
    if (col === 3) return [`${row}4`]
    if (col === 4) return [`${row}3`]
    return []
  },
}

// -------------------------------------------------------------
// 3. BUS_33: 33-Seater — MH 16 DP 3951 (2+2 Layout, Numbers 1..33)
// -------------------------------------------------------------
const rows33: BusSeatRow[] = [
  { rowLabel: 'R1', leftSeats: ['1', '2'], rightSeats: ['3', '4'] },
  { rowLabel: 'R2', leftSeats: ['8', '7'], rightSeats: ['6', '5'] },
  { rowLabel: 'R3', leftSeats: ['9', '10'], rightSeats: ['11', '12'] },
  { rowLabel: 'R4', leftSeats: ['16', '15'], rightSeats: ['14', '13'] },
  { rowLabel: 'R5', leftSeats: ['17', '18'], rightSeats: ['19', '20'] },
  { rowLabel: 'R6', leftSeats: ['24', '23'], rightSeats: ['22', '21'] },
  { rowLabel: 'R7', leftSeats: ['25', '26'], rightSeats: ['27', '28'] },
]

const rear33 = ['33', '32', '31', '30', '29'] // 5-seat rear bench

const allSeats33 = [
  ...rows33.flatMap((r) => [...r.leftSeats, ...r.rightSeats]),
  ...rear33,
]

export const BUS_33_TEMPLATE: BusLayoutTemplate = {
  id: 'BUS_33',
  name: 'Uday Bus',
  busNumber: 'MH 16 DP 3951',
  capacity: 33,
  layoutType: '2+2',
  frontSeats: [],
  rows: rows33,
  rearBench: rear33,
  allSeatIds: allSeats33,
  zoneOf: (seatId: string) => {
    if (rear33.includes(seatId)) return 'ZONE_REAR_BENCH'
    for (const r of rows33) {
      if (r.leftSeats.includes(seatId)) return `${r.rowLabel}-L`
      if (r.rightSeats.includes(seatId)) return `${r.rowLabel}-R`
    }
    return `ZONE_${seatId}`
  },
  adjacentSeatsOf: (seatId: string): string[] => {
    if (rear33.includes(seatId)) {
      const idx = rear33.indexOf(seatId)
      const res: string[] = []
      if (idx > 0 && rear33[idx - 1]) res.push(rear33[idx - 1]!)
      if (idx < rear33.length - 1 && rear33[idx + 1]) res.push(rear33[idx + 1]!)
      return res
    }
    for (const r of rows33) {
      if (r.leftSeats[0] === seatId && r.leftSeats[1]) return [r.leftSeats[1]]
      if (r.leftSeats[1] === seatId && r.leftSeats[0]) return [r.leftSeats[0]]
      if (r.rightSeats[0] === seatId && r.rightSeats[1]) return [r.rightSeats[1]]
      if (r.rightSeats[1] === seatId && r.rightSeats[0]) return [r.rightSeats[0]]
    }
    return []
  },
}

// -------------------------------------------------------------
// Template Registry & Lookup Helpers
// -------------------------------------------------------------
export const BUS_TEMPLATES: Record<BusTemplateId, BusLayoutTemplate> = {
  BUS_55: BUS_55_TEMPLATE,
  BUS_44: BUS_44_TEMPLATE,
  BUS_33: BUS_33_TEMPLATE,
}

export function getBusTemplate(templateId?: string | null): BusLayoutTemplate {
  if (templateId && templateId in BUS_TEMPLATES) {
    return BUS_TEMPLATES[templateId as BusTemplateId]
  }
  return BUS_55_TEMPLATE
}

export function getTemplateForBus(busNumberOrId?: string | null): BusLayoutTemplate {
  if (!busNumberOrId) return BUS_55_TEMPLATE
  const norm = busNumberOrId.toUpperCase().replace(/\s+/g, '')

  if (norm.includes('1003') || norm.includes('DV1003') || norm.includes('44')) {
    return BUS_44_TEMPLATE
  }
  if (norm.includes('3951') || norm.includes('DP3951') || norm.includes('33')) {
    return BUS_33_TEMPLATE
  }
  return BUS_55_TEMPLATE
}
