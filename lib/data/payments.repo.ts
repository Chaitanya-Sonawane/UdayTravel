import { getAdminDb } from '../firebase/admin'
import { firestoreMeter } from '../firebase/meter'
import { PaymentDoc } from '../schemas/payment.schema'

export class PaymentsRepository {
  static async createPayment(payment: PaymentDoc): Promise<void> {
    firestoreMeter.recordWrite('payments', payment.razorpayPaymentId)
    const db = getAdminDb()
    await db.collection('payments').doc(payment.razorpayPaymentId).set(payment)
  }

  static createPaymentInTx(t: FirebaseFirestore.Transaction, payment: PaymentDoc): void {
    firestoreMeter.recordWrite('payments', payment.razorpayPaymentId)
    const db = getAdminDb()
    t.set(db.collection('payments').doc(payment.razorpayPaymentId), payment)
  }

  static async getPayment(paymentId: string): Promise<PaymentDoc | null> {
    firestoreMeter.recordRead('payments', paymentId)
    const db = getAdminDb()
    const snap = await db.collection('payments').doc(paymentId).get()
    if (!snap.exists) return null
    return snap.data() as PaymentDoc
  }

  static async listRecentPayments(limitCount = 50): Promise<PaymentDoc[]> {
    firestoreMeter.recordRead('payments', 'list')
    const db = getAdminDb()
    const snap = await db.collection('payments').get()
    const payments: PaymentDoc[] = []
    snap.forEach((doc) => {
      payments.push(doc.data() as PaymentDoc)
    })
    return payments
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limitCount)
  }
}
