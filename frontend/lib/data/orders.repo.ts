import { getAdminDb } from '../firebase/admin'
import { firestoreMeter } from '../firebase/meter'
import { OrderDoc } from '../schemas/booking.schema'

export class OrdersRepository {
  static async createOrder(order: OrderDoc): Promise<void> {
    firestoreMeter.recordWrite('orders', order.grp)
    const db = getAdminDb()
    await db.collection('orders').doc(order.grp).create(order)
  }

  static async getOrder(grp: string): Promise<OrderDoc | null> {
    firestoreMeter.recordRead('orders', grp)
    const db = getAdminDb()
    const snap = await db.collection('orders').doc(grp).get()
    if (!snap.exists) return null
    return snap.data() as OrderDoc
  }

  static async updateOrder(grp: string, updates: Partial<OrderDoc>): Promise<void> {
    firestoreMeter.recordWrite('orders', grp)
    const db = getAdminDb()
    await db.collection('orders').doc(grp).update({
      ...updates,
      updatedAt: new Date().toISOString(),
    })
  }

  static async getOrderInTx(
    t: FirebaseFirestore.Transaction,
    grp: string
  ): Promise<OrderDoc | null> {
    firestoreMeter.recordRead('orders', grp)
    const db = getAdminDb()
    const snap = await t.get(db.collection('orders').doc(grp))
    if (!snap.exists) return null
    return snap.data() as OrderDoc
  }

  static updateOrderInTx(
    t: FirebaseFirestore.Transaction,
    grp: string,
    updates: Partial<OrderDoc>
  ): void {
    firestoreMeter.recordWrite('orders', grp)
    const db = getAdminDb()
    t.update(db.collection('orders').doc(grp), {
      ...updates,
      updatedAt: new Date().toISOString(),
    })
  }
}
