import { NextResponse } from 'next/server'

export const ErrorCodes = {
  UNAUTHENTICATED: 'UNAUTHENTICATED',
  APP_CHECK_FAILED: 'APP_CHECK_FAILED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  INVALID_INPUT: 'INVALID_INPUT',
  INVALID_SIGNATURE: 'INVALID_SIGNATURE',
  INVALID_WEBHOOK: 'INVALID_WEBHOOK',
  AMOUNT_MISMATCH: 'AMOUNT_MISMATCH',
  HOLD_EXPIRED: 'HOLD_EXPIRED',
  SEAT_UNAVAILABLE: 'SEAT_UNAVAILABLE',
  SEAT_OWNERSHIP_FAILED: 'SEAT_OWNERSHIP_FAILED',
  ORDER_NOT_FOUND: 'ORDER_NOT_FOUND',
  ORDER_ALREADY_CONFIRMED: 'ORDER_ALREADY_CONFIRMED',
  PAYMENT_NOT_FOUND: 'PAYMENT_NOT_FOUND',
  PAYMENT_NOT_CAPTURED: 'PAYMENT_NOT_CAPTURED',
  PAYMENT_AMOUNT_MISMATCH: 'PAYMENT_AMOUNT_MISMATCH',
  INSUFFICIENT_WALLET: 'INSUFFICIENT_WALLET',
  WALLET_HOLD_FAILED: 'WALLET_HOLD_FAILED',
  ACCOUNT_LINK_REQUIRED: 'ACCOUNT_LINK_REQUIRED',
  CANCELLATION_WINDOW_CLOSED: 'CANCELLATION_WINDOW_CLOSED',
  ALREADY_CANCELLED: 'ALREADY_CANCELLED',
  INVALID_TICKET_STATE: 'INVALID_TICKET_STATE',
  REFUND_FAILED: 'REFUND_FAILED',
  REFUND_PENDING: 'REFUND_PENDING',
  CONFLICT: 'CONFLICT',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const

export type AppErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes]

const StatusCodeMap: Record<AppErrorCode, number> = {
  UNAUTHENTICATED: 401,
  APP_CHECK_FAILED: 403,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INVALID_INPUT: 400,
  INVALID_SIGNATURE: 400,
  INVALID_WEBHOOK: 400,
  AMOUNT_MISMATCH: 400,
  HOLD_EXPIRED: 410,
  SEAT_UNAVAILABLE: 409,
  SEAT_OWNERSHIP_FAILED: 403,
  ORDER_NOT_FOUND: 404,
  ORDER_ALREADY_CONFIRMED: 409,
  PAYMENT_NOT_FOUND: 404,
  PAYMENT_NOT_CAPTURED: 400,
  PAYMENT_AMOUNT_MISMATCH: 400,
  INSUFFICIENT_WALLET: 400,
  WALLET_HOLD_FAILED: 400,
  ACCOUNT_LINK_REQUIRED: 403,
  CANCELLATION_WINDOW_CLOSED: 400,
  ALREADY_CANCELLED: 409,
  INVALID_TICKET_STATE: 400,
  REFUND_FAILED: 502,
  REFUND_PENDING: 202,
  CONFLICT: 409,
  INTERNAL_ERROR: 500,
}

export class AppError extends Error {
  public readonly code: AppErrorCode
  public readonly statusCode: number
  public readonly details?: Record<string, unknown>

  constructor(
    code: AppErrorCode,
    message: string,
    details?: Record<string, unknown>,
    overrideStatus?: number
  ) {
    super(message)
    this.name = 'AppError'
    this.code = code
    this.statusCode = overrideStatus ?? StatusCodeMap[code] ?? 500
    this.details = details
    Object.setPrototypeOf(this, AppError.prototype)
  }

  toResponse(): NextResponse {
    return NextResponse.json(
      {
        error: {
          code: this.code,
          message: this.message,
          ...(this.details ? { details: this.details } : {}),
        },
      },
      { status: this.statusCode }
    )
  }

  static fromUnknown(err: unknown): AppError {
    if (err instanceof AppError) {
      return err
    }
    const message = err instanceof Error ? err.message : 'An unexpected internal error occurred'
    return new AppError(ErrorCodes.INTERNAL_ERROR, message)
  }
}
