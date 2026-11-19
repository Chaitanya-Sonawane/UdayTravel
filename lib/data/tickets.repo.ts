import { randomBytes } from 'node:crypto'
import { getAdminDb } from '../firebase/admin'
import { firestoreMeter } from '../firebase/meter'
import { TicketDoc } from '../schemas/ticket.schema'

export class TicketsRepository {
  /**
   * Generates a collision-resistant ticket number: "UT" followed by 6 random alphanumeric characters.
   */
  static generateTicketNo(): string {
    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ' // Base32 unambiguous
    const bytes = randomBytes(6)
    let code = ''
    for (let i = 0; i < 6; i++) {
      const b = bytes[i] ?? 0
      code += chars[b % chars.length]
    }
    return `UT${code}`
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
