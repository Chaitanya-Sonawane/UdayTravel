import { getAdminDb } from '../firebase/admin'
import { firestoreMeter } from '../firebase/meter'
import { RefundDoc } from '../schemas/ticket.schema'

export class RefundsRepository {
  static createRefundInTx(t: FirebaseFirestore.Transaction, refund: RefundDoc): void {
    firestoreMeter.recordWrite('refunds', refund.ticketNo)
    const db = getAdminDb()
    t.create(db.collection('refunds').doc(refund.ticketNo), refund)
  }

  static async getRefund(ticketNo: string): Promise<RefundDoc | null> {
    firestoreMeter.recordRead('refunds', ticketNo)
    const db = getAdminDb()
    const snap = await db.collection('refunds').doc(ticketNo).get()
    if (!snap.exists) return null
    return snap.data() as RefundDoc
  }

  static async updateRefund(
    ticketNo: string,
    updates: Partial<RefundDoc>
  ): Promise<void> {
    firestoreMeter.recordWrite('refunds', ticketNo)
    const db = getAdminDb()
    await db.collection('refunds').doc(ticketNo).update({
      ...updates,
      updatedAt: new Date().toISOString(),
    })
  }

  static async listRefunds(limitCount = 50): Promise<RefundDoc[]> {
    firestoreMeter.recordRead('refunds', 'list')
    const db = getAdminDb()
    const snap = await db.collection('refunds').get()
    const list: RefundDoc[] = []
    snap.forEach((doc) => {
      list.push(doc.data() as RefundDoc)
    })
    return list
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limitCount)
  }
}
