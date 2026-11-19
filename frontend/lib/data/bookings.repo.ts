import { getAdminDb } from '../firebase/admin'
import { firestoreMeter } from '../firebase/meter'

export type BookingStatus = 'pending' | 'confirmed' | 'cancelled'

export interface BookingPassenger {
  name: string
  age: number
  gender: string
  seat: string
}

export interface BookingDocument {
  id: string
  bookingId: string
  userId: string
  tripId: string
  routeId: string
  busId: string
  travelDate: string
  departureTime: string
  pickupPoint: {
    name: string
    time?: string
  }
  dropPoint: {
    name: string
    time?: string
  }
  seats: string[]
  passengers: BookingPassenger[]
  fare: {
    perSeat: number
    seats: number
    total: number
  }
  totalAmount: number
  status: BookingStatus
  paymentId?: string
  ticketId?: string
  ticketNo?: string
  createdAt: string
  updatedAt: string
}

export class BookingsRepository {
  private static collectionName = 'bookings'

  static async createBooking(booking: BookingDocument): Promise<void> {
    firestoreMeter.recordWrite(this.collectionName, booking.bookingId)
    const db = getAdminDb()
    const now = new Date().toISOString()
    const payload: BookingDocument = {
      ...booking,
      id: booking.bookingId,
      createdAt: booking.createdAt || now,
      updatedAt: now,
    }
    await db.collection(this.collectionName).doc(booking.bookingId).set(payload, { merge: true })
  }

  static async getBooking(bookingId: string): Promise<BookingDocument | null> {
    firestoreMeter.recordRead(this.collectionName, bookingId)
    const db = getAdminDb()
    const doc = await db.collection(this.collectionName).doc(bookingId).get()
    if (!doc.exists) return null
    return doc.data() as BookingDocument
  }

  static async getBookingsByUser(userId: string): Promise<BookingDocument[]> {
    firestoreMeter.recordRead(this.collectionName, `user_${userId}`)
    const db = getAdminDb()
    try {
      const snap = await db
        .collection(this.collectionName)
        .where('userId', '==', userId)
        .orderBy('createdAt', 'desc')
        .get()
      return snap.docs.map((d) => d.data() as BookingDocument)
    } catch {
      // Fallback without orderBy if index is still building
      const snap = await db.collection(this.collectionName).where('userId', '==', userId).get()
      const list = snap.docs.map((d) => d.data() as BookingDocument)
      return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    }
  }

  static async getAllBookings(limitCount = 50): Promise<BookingDocument[]> {
    firestoreMeter.recordRead(this.collectionName, 'all')
    const db = getAdminDb()
    try {
      const snap = await db
        .collection(this.collectionName)
        .orderBy('createdAt', 'desc')
        .limit(limitCount)
        .get()
      return snap.docs.map((d) => d.data() as BookingDocument)
    } catch {
      const snap = await db.collection(this.collectionName).limit(limitCount).get()
      const list = snap.docs.map((d) => d.data() as BookingDocument)
      return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    }
  }

  static async updateBookingStatus(
    bookingId: string,
    status: BookingStatus,
    extra?: Partial<BookingDocument>
  ): Promise<void> {
    firestoreMeter.recordWrite(this.collectionName, bookingId)
    const db = getAdminDb()
    const now = new Date().toISOString()
    await db.collection(this.collectionName).doc(bookingId).set(
      {
        status,
        ...extra,
        updatedAt: now,
      },
      { merge: true }
    )
  }
}
