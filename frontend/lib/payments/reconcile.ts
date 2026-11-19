import { getAdminDb } from '../firebase/admin'
import { OrdersRepository } from '../data/orders.repo'
import { RefundsRepository } from '../data/refunds.repo'
import { confirmBooking } from './confirm'
import { issueRefund } from './refund'
import { OrderDoc } from '../schemas/booking.schema'
import { RefundDoc } from '../schemas/ticket.schema'

export interface ReconcileResult {
  ordersChecked: number
  ordersRecovered: number
  ordersExpired: number
  refundsChecked: number
  refundsRecovered: number
  errors: string[]
}

export async function runReconciliation(maxBatch = 50): Promise<ReconcileResult> {
  const db = getAdminDb()
  const result: ReconcileResult = {
    ordersChecked: 0,
    ordersRecovered: 0,
    ordersExpired: 0,
    refundsChecked: 0,
    refundsRecovered: 0,
    errors: [],
  }

  const now = Date.now()
  const tenMinutesAgo = new Date(now - 10 * 60 * 1000).toISOString()

  // 1. Reconcile stuck CREATED orders
  try {
    const ordersSnap = await db.collection('orders').get()
    const stuckOrders: OrderDoc[] = []

    ordersSnap.forEach((doc) => {
      const order = doc.data() as OrderDoc
      if (order.status === 'CREATED' && order.createdAt < tenMinutesAgo) {
        stuckOrders.push(order)
      }
    })

    const batchOrders = stuckOrders.slice(0, maxBatch)
    result.ordersChecked = batchOrders.length

    for (const order of batchOrders) {
      try {
        if (order.razorpayPaymentId) {
          // Attempt confirmation if payment was captured
          await confirmBooking({
            grp: order.grp,
            paymentId: order.razorpayPaymentId,
            source: 'VERIFY_API',
          })
          result.ordersRecovered++
        } else if (order.holdExpiresAt < now) {
          // Mark expired
          await OrdersRepository.updateOrder(order.grp, { status: 'EXPIRED' })
          result.ordersExpired++
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err)
        result.errors.push(`Order ${order.grp} reconcile error: ${msg}`)
      }
    }
  } catch (err: unknown) {
    result.errors.push(`Orders collection scan failed: ${err}`)
  }

  // 2. Reconcile stuck PENDING or FAILED refunds
  try {
    const refundsSnap = await db.collection('refunds').get()
    const pendingRefunds: RefundDoc[] = []

    refundsSnap.forEach((doc) => {
      const ref = doc.data() as RefundDoc
      if (ref.status === 'PENDING' || ref.status === 'FAILED') {
        pendingRefunds.push(ref)
      }
    })

    const batchRefunds = pendingRefunds.slice(0, maxBatch)
    result.refundsChecked = batchRefunds.length

    for (const ref of batchRefunds) {
      try {
        await issueRefund(ref.ticketNo)
        result.refundsRecovered++
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err)
        result.errors.push(`Refund ${ref.ticketNo} retry error: ${msg}`)
      }
    }
  } catch (err: unknown) {
    result.errors.push(`Refunds collection scan failed: ${err}`)
  }

  return result
}
