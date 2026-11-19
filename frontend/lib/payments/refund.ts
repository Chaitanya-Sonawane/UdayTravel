import { AppError, ErrorCodes } from '../errors/app-error'
import { RefundsRepository } from '../data/refunds.repo'
import { TicketsRepository } from '../data/tickets.repo'
import { issueRazorpayRefund } from './razorpay'

export async function issueRefund(ticketNo: string): Promise<{
  ticketNo: string
  razorpayRefundId?: string
  status: 'PROCESSED' | 'FAILED'
}> {
  const refundDoc = await RefundsRepository.getRefund(ticketNo)
  if (!refundDoc) {
    throw new AppError(ErrorCodes.NOT_FOUND, `No refund record found for ticket ${ticketNo}`)
  }

  if (refundDoc.status === 'PROCESSED' && refundDoc.razorpayRefundId) {
    return {
      ticketNo,
      razorpayRefundId: refundDoc.razorpayRefundId,
      status: 'PROCESSED',
    }
  }

  const ticket = await TicketsRepository.getTicket(ticketNo)
  if (!ticket) {
    throw new AppError(ErrorCodes.NOT_FOUND, `Ticket ${ticketNo} not found for refund processing`)
  }

  const paymentId = ticket.payment.razorpayPaymentId
  if (!paymentId) {
    throw new AppError(
      ErrorCodes.PAYMENT_NOT_FOUND,
      `No Razorpay payment ID found on ticket ${ticketNo}`
    )
  }

  try {
    const result = await issueRazorpayRefund({
      paymentId,
      amountPaise: refundDoc.sourceRefundPaise,
      notes: {
        ticketNo,
        grp: ticket.grp,
      },
    })

    await RefundsRepository.updateRefund(ticketNo, {
      status: 'PROCESSED',
      razorpayRefundId: result.id,
      failureReason: undefined,
    })

    return {
      ticketNo,
      razorpayRefundId: result.id,
      status: 'PROCESSED',
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown refund error'
    await RefundsRepository.updateRefund(ticketNo, {
      status: 'FAILED',
      failureReason: message,
    })
    throw new AppError(
      ErrorCodes.REFUND_FAILED,
      `Razorpay refund failed for ticket ${ticketNo}: ${message}`
    )
  }
}
