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

  const openModal = () => {
    const razorpay = (window as unknown as { Razorpay?: RazorpayConstructor }).Razorpay
    if (!razorpay) {
      console.error('[Razorpay] Razorpay constructor unavailable on window.')
      options.onPaymentFailed?.({
        error: {
          code: 'SDK_NOT_LOADED',
          description: 'Razorpay checkout script not ready. Please refresh the page and try again.',
          source: 'checkout_js',
          step: 'initialization',
          reason: 'script_missing',
          metadata: { order_id: options.order_id },
        },
      })
      return
    }

    const instance = new razorpay(options)

    if (options.onPaymentFailed) {
      instance.on('payment.failed', options.onPaymentFailed)
    }

    instance.open()
  }

  const existing = (window as unknown as { Razorpay?: RazorpayConstructor }).Razorpay
  if (existing) {
    openModal()
    return
  }

  // Load checkout.js dynamically if not already in document
  const existingScript = document.querySelector('script[src*="checkout.razorpay.com"]')
  if (existingScript) {
    existingScript.addEventListener('load', () => openModal(), { once: true })
    return
  }

  const script = document.createElement('script')
  script.src = 'https://checkout.razorpay.com/v1/checkout.js'
  script.async = true
  script.onload = () => openModal()
  script.onerror = () => {
    options.onPaymentFailed?.({
      error: {
        code: 'NETWORK_ERROR',
        description: 'Failed to load Razorpay checkout script from checkout.razorpay.com. Please check your internet connection.',
        source: 'network',
        step: 'loading',
        reason: 'network_blocked',
        metadata: { order_id: options.order_id },
      },
    })
  }
  document.body.appendChild(script)
}
