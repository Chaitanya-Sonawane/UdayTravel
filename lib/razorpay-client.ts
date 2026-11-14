export type RazorpaySuccessResponse = {
  razorpay_payment_id: string
  razorpay_order_id: string
  razorpay_signature: string
}

export type RazorpayFailureResponse = {
  error: {
    code: string
    description: string
    source: string
    step: string
    reason: string
    metadata: {
      order_id: string
      payment_id?: string
    }
  }
}

export type CheckoutOptions = {
  key: string
  order_id: string
  amount: number
  currency: string
  name: string
  description: string
  image?: string
  prefill?: {
    name?: string
    email?: string
    contact?: string
  }
  notes?: Record<string, string>
  theme?: {
    color?: string
    backdrop_color?: string
  }
  modal?: {
    ondismiss?: () => void
    escape?: boolean
    confirm_close?: boolean
  }
  handler: (response: RazorpaySuccessResponse) => void
  onPaymentFailed?: (response: RazorpayFailureResponse) => void
}

type RazorpayInstance = {
  open: () => void
  on: (event: string, callback: (response: any) => void) => void
}

type RazorpayConstructor = new (options: CheckoutOptions) => RazorpayInstance

export function openCheckout(options: CheckoutOptions): void {
  if (typeof window === 'undefined') return

  const razorpay = (window as unknown as { Razorpay?: RazorpayConstructor }).Razorpay

  if (process.env.NEXT_PUBLIC_RAZORPAY_MOCK === 'true' || !razorpay) {
    if (!razorpay && process.env.NEXT_PUBLIC_RAZORPAY_MOCK !== 'true') {
      console.warn(
        '[Razorpay] SDK script not loaded yet or window.Razorpay unavailable. If testing in development, mock fallback can be used.'
      )
    }
    // Mock fallback when testing without network/SDK
    window.setTimeout(() => {
      options.handler({
        razorpay_payment_id: 'pay_mock_' + Math.random().toString(36).slice(2, 10),
        razorpay_order_id: options.order_id,
        razorpay_signature: 'mock_signature',
      })
    }, 650)
    return
  }

  const instance = new razorpay(options)

  if (options.onPaymentFailed) {
    instance.on('payment.failed', options.onPaymentFailed)
  }

  instance.open()
}
