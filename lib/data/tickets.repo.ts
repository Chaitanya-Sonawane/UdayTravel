import { randomBytes } from 'node:crypto'
import { getAdminDb } from '../firebase/admin'
import { firestoreMeter } from '../firebase/meter'
import { TicketDoc } from '../schemas/ticket.schema'

export class TicketsRepository {
  /**
   * Returns short 2-character route code, e.g. "AP" for Ahilyanagar->Pune, "PA" for Pune->Ahilyanagar.
   */
  static getRouteCode(routeId?: string): string {
    if (!routeId) return 'EXP'
    if (routeId.startsWith('AHM_PUN') || routeId === 'ahilyanagar_to_pune') return 'AP'
    if (routeId.startsWith('PUN_AHM') || routeId === 'pune_to_ahilyanagar') return 'PA'
    if (routeId.startsWith('AHM_JAM')) return 'AJ'
    if (routeId.startsWith('JAM_AHM')) return 'JA'
    const parts = routeId.split('_')
    if (parts.length >= 2 && parts[0] && parts[1]) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    }
    return 'EXP'
  }

  /**
   * Generates a collision-resistant ticket number: prefix followed by 6 random alphanumeric characters.
   * e.g. "UT-AP-ABCDEF" or "UT-PA-ABCDEF"
   */
  static generateTicketNo(routeId?: string): string {
    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ' // Base32 unambiguous
    const bytes = randomBytes(6)
    let code = ''
    for (let i = 0; i < 6; i++) {
      const b = bytes[i] ?? 0
      code += chars[b % chars.length]
    }
    const routeCode = this.getRouteCode(routeId)
    return `UT-${routeCode}-${code}`
  }

  static createTicketInTx(t: FirebaseFirestore.Transaction, ticket: TicketDoc): void {
    firestoreMeter.recordWrite('tickets', ticket.ticketNo)
    const db = getAdminDb()
    t.create(db.collection('tickets').doc(ticket.ticketNo), ticket)
  }

  static async getTicket(ticketNo: string): Promise<TicketDoc | null> {
    firestoreMeter.recordRead('tickets', ticketNo)
    const db = getAdminDb()
    const snap = await db.collection('tickets').doc(ticketNo).get()
    if (!snap.exists) return null
    return snap.data() as TicketDoc
  }

  static async getTicketInTx(
    t: FirebaseFirestore.Transaction,
    ticketNo: string
  ): Promise<TicketDoc | null> {
    firestoreMeter.recordRead('tickets', ticketNo)
    const db = getAdminDb()
    const snap = await t.get(db.collection('tickets').doc(ticketNo))
    if (!snap.exists) return null
    return snap.data() as TicketDoc
  }

  static updateTicketInTx(
    t: FirebaseFirestore.Transaction,
    ticketNo: string,
    updates: Partial<TicketDoc>
  ): void {
    firestoreMeter.recordWrite('tickets', ticketNo)
    const db = getAdminDb()
    t.update(db.collection('tickets').doc(ticketNo), {
      ...updates,
      updatedAt: new Date().toISOString(),
    })
  }

  static async listUserTickets(uid: string): Promise<TicketDoc[]> {
    firestoreMeter.recordRead('tickets', `uid_${uid}`)
    const db = getAdminDb()
    const snap = await db.collection('tickets').get()
    const list: TicketDoc[] = []
    snap.forEach((doc) => {
      const data = doc.data() as TicketDoc
      if (data.uid === uid) {
        list.push(data)
      }
    })
    return list.sort(
      (a, b) => new Date(b.bookedAt).getTime() - new Date(a.bookedAt).getTime()
    )
  }

  /**
   * Retrieves all confirmed or active tickets for a specific trip and travel date.
   */
  static async listTicketsForTrip(tripId: string, travelDate: string): Promise<TicketDoc[]> {
    firestoreMeter.recordRead('tickets', `trip_${tripId}_${travelDate}`)
    const db = getAdminDb()
    const snap = await db.collection('tickets').get()
    const list: TicketDoc[] = []
    snap.forEach((doc) => {
      const data = doc.data() as TicketDoc
      if (data.tripId === tripId && data.travelDate === travelDate) {
        list.push(data)
      }
    })
    return list.sort(
      (a, b) => new Date(b.bookedAt).getTime() - new Date(a.bookedAt).getTime()
    )
  }

  /**
   * Retrieves all confirmed tickets for a given route and travel date.
   */
  static async listTicketsForRoute(routeId: string, travelDate: string): Promise<TicketDoc[]> {
    firestoreMeter.recordRead('tickets', `route_${routeId}_${travelDate}`)
    const db = getAdminDb()
    const snap = await db.collection('tickets').get()
    const list: TicketDoc[] = []

    const isAhmPun = routeId === 'AHM_PUN' || routeId === 'ahilyanagar_to_pune'

    snap.forEach((doc) => {
      const data = doc.data() as TicketDoc
      const docRouteId = data.route?.routeId || ''
      const docIsAhmPun =
        docRouteId === 'AHM_PUN' ||
        docRouteId === 'ahilyanagar_to_pune' ||
        (data.tripId && data.tripId.startsWith('AHM_PUN'))

      const matchesRoute = isAhmPun
        ? docIsAhmPun
        : !docIsAhmPun &&
          (docRouteId === 'PUN_AHM' ||
            docRouteId === 'pune_to_ahilyanagar' ||
            (data.tripId && data.tripId.startsWith('PUN_AHM')))

      if (matchesRoute && data.travelDate === travelDate) {
        list.push(data)
      }
    })

    return list.sort(
      (a, b) => new Date(b.bookedAt).getTime() - new Date(a.bookedAt).getTime()
    )
  }

  /**
   * Retrieves all tickets with optional date, route, or limit filter, sorted by latest bookedAt descending.
   */
  static async listAllTickets(options?: {
    date?: string
    routeId?: string
    limit?: number
  }): Promise<TicketDoc[]> {
    firestoreMeter.recordRead('tickets', `all_${options?.date || 'any'}`)
    const db = getAdminDb()
    const snap = await db.collection('tickets').get()
    let list: TicketDoc[] = []

    snap.forEach((doc) => {
      const data = doc.data() as TicketDoc
      if (options?.date && options.date !== 'ALL' && data.travelDate !== options.date) {
        return
      }
      if (options?.routeId && options.routeId !== 'ALL') {
        const isAhmPun = options.routeId === 'AHM_PUN' || options.routeId === 'ahilyanagar_to_pune'
        const docRouteId = data.route?.routeId || ''
        const docIsAhmPun =
          docRouteId === 'AHM_PUN' ||
          docRouteId === 'ahilyanagar_to_pune' ||
          (data.tripId && data.tripId.startsWith('AHM_PUN'))
        const matchesRoute = isAhmPun
          ? docIsAhmPun
          : !docIsAhmPun &&
            (docRouteId === 'PUN_AHM' ||
              docRouteId === 'pune_to_ahilyanagar' ||
              (data.tripId && data.tripId.startsWith('PUN_AHM')))
        if (!matchesRoute) return
      }
      list.push(data)
    })

    list.sort(
      (a, b) => new Date(b.bookedAt || 0).getTime() - new Date(a.bookedAt || 0).getTime()
    )

    if (options?.limit && options.limit > 0) {
      list = list.slice(0, options.limit)
    }

    return list
  }

  /**
   * Searches tickets by Ticket No / PNR, passenger mobile, or passenger name.
   */
  static async searchTickets(query: string): Promise<TicketDoc[]> {
    firestoreMeter.recordRead('tickets', `search_${query}`)
    const db = getAdminDb()
    const snap = await db.collection('tickets').get()
    const list: TicketDoc[] = []
    const cleanQ = query.trim().toUpperCase()
    if (!cleanQ) return []

    snap.forEach((doc) => {
      const data = doc.data() as TicketDoc
      const matchesTicket = data.ticketNo?.toUpperCase().includes(cleanQ)
      const matchesPhone = data.contactMobile?.includes(cleanQ)
      const matchesPassenger = data.passengers?.some((p) =>
        p.name?.toUpperCase().includes(cleanQ)
      )
      if (matchesTicket || matchesPhone || matchesPassenger) {
        list.push(data)
      }
    })
    return list.sort(
      (a, b) => new Date(b.bookedAt).getTime() - new Date(a.bookedAt).getTime()
    )
  }
}
