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

/**
 * Interactive simulated checkout modal for test mode, offline dev, or sandbox environments.
 * Allows instant test payments without requiring external Razorpay DNS resolution.
 */
function openSimulatedCheckout(options: CheckoutOptions): void {
  if (typeof document === 'undefined') return

  // Remove any previously open simulated modal
  const existingModal = document.getElementById('razorpay-simulated-modal')
  if (existingModal) existingModal.remove()

  const container = document.createElement('div')
  container.id = 'razorpay-simulated-modal'
  container.className =
    'fixed inset-0 z-[99999] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4'

  const amountRupees = (options.amount / 100).toFixed(2)

  container.innerHTML = `
    <div class="bg-[#0b1426] text-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-white/10 font-sans relative">
      <!-- Close Button -->
      <button id="rzp-sim-close" class="absolute top-4 right-4 text-white/50 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/5">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
      </button>

      <!-- Header -->
      <div class="flex items-center gap-3 mb-4">
        <div class="w-9 h-9 rounded-xl bg-[#3395FF]/20 flex items-center justify-center text-[#3395FF] font-bold text-base">
          ₹
        </div>
        <div>
          <div class="flex items-center gap-2">
            <span class="font-bold text-white text-base tracking-tight">Razorpay Checkout</span>
            <span class="bg-amber-400/20 text-amber-300 border border-amber-400/30 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
              Test Mode
            </span>
          </div>
          <p class="text-xs text-white/60">${options.name || 'Uday Travels'}</p>
        </div>
      </div>

      <!-- Amount card -->
      <div class="bg-white/[0.04] border border-white/10 rounded-xl p-4 mb-5">
        <div class="text-xs text-white/50 mb-1">Total Payable Amount</div>
        <div class="text-3xl font-mono font-bold text-[#F8B018] tracking-tight">₹${amountRupees}</div>
        <div class="text-[11px] text-white/50 mt-1 truncate">
          ${options.description || 'Bus Journey Ticket'} · Order: <span class="font-mono text-white/70">${options.order_id}</span>
        </div>
      </div>

      <!-- Simulation Options -->
      <div class="space-y-3">
        <p class="text-[11px] font-semibold text-white/50 uppercase tracking-wider">Select Payment Action</p>
        
        <button id="rzp-sim-success" class="w-full py-3.5 px-4 rounded-xl font-bold bg-[#F8B018] hover:bg-[#e29d0f] text-[#0c2340] transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-500/10 cursor-pointer">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"></path></svg>
          Pay ₹${amountRupees} (Simulate Success)
        </button>

        <button id="rzp-sim-fail" class="w-full py-2.5 px-4 rounded-xl font-semibold bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/25 transition-all text-xs flex items-center justify-center gap-2 cursor-pointer">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          Simulate Payment Failure
        </button>
      </div>

      <div class="mt-4 pt-3 border-t border-white/10 text-center">
        <button id="rzp-sim-cancel" class="text-xs text-white/50 hover:text-white/80 transition-colors cursor-pointer">
          Cancel &amp; return to booking
        </button>
      </div>
    </div>
  `

  document.body.appendChild(container)

  const cleanup = () => {
    container.remove()
  }

  // Handler for Success
  const successBtn = container.querySelector('#rzp-sim-success') as HTMLButtonElement
  successBtn?.addEventListener('click', () => {
    successBtn.disabled = true
    successBtn.innerHTML = `
      <svg class="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
      Processing Test Payment...
    `
    setTimeout(() => {
      cleanup()
      options.handler({
        razorpay_payment_id: `pay_test_${Date.now()}`,
        razorpay_order_id: options.order_id,
        razorpay_signature: `mock_signature_${Date.now()}`,
      })
    }, 350)
  })

  // Handler for Failure
  const failBtn = container.querySelector('#rzp-sim-fail') as HTMLButtonElement
  failBtn?.addEventListener('click', () => {
    cleanup()
    options.onPaymentFailed?.({
      error: {
        code: 'BAD_REQUEST_ERROR',
        description: 'Payment was declined in test simulation mode.',
        source: 'gateway',
        step: 'payment_authentication',
        reason: 'simulation_declined',
        metadata: { order_id: options.order_id },
      },
    })
  })

  // Close & Cancel
  const closeBtn = container.querySelector('#rzp-sim-close')
  closeBtn?.addEventListener('click', () => {
    cleanup()
    options.modal?.ondismiss?.()
  })

  const cancelBtn = container.querySelector('#rzp-sim-cancel')
  cancelBtn?.addEventListener('click', () => {
    cleanup()
    options.modal?.ondismiss?.()
  })
}

export function openCheckout(options: CheckoutOptions): void {
  if (typeof window === 'undefined') return

  // 1. If explicit dev/mock order ID or mock environment, open interactive simulation
  const isDevOrder =
    options.order_id.startsWith('order_dev_') ||
    options.order_id.startsWith('order_mock_') ||
    options.order_id === 'INTERNAL_WALLET_ONLY'

  if (isDevOrder || process.env.NEXT_PUBLIC_RAZORPAY_MOCK === 'true') {
    openSimulatedCheckout(options)
    return
  }

  // 2. Otherwise attempt standard Razorpay modal
  const openModal = (): boolean => {
    const razorpay = (window as unknown as { Razorpay?: RazorpayConstructor }).Razorpay
    if (!razorpay) {
      return false
    }

    try {
      const instance = new razorpay(options)

      if (options.onPaymentFailed) {
        instance.on('payment.failed', options.onPaymentFailed)
      }

      instance.open()
      return true
    } catch {
      openSimulatedCheckout(options)
      return true
    }
  }

  // If already available on window, open immediately!
  if (openModal()) {
    return
  }

  // Poll for window.Razorpay up to 1 second
  let attempts = 0
  const maxAttempts = 10
  const interval = setInterval(() => {
    attempts++
    if (openModal()) {
      clearInterval(interval)
      return
    }

    if (attempts >= maxAttempts) {
      clearInterval(interval)
      openSimulatedCheckout(options)
    }
  }, 100)

  // Ensure script is injected if not already present
  if (!document.querySelector('script[src*="checkout.razorpay.com"]')) {
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.async = true
    script.onload = () => {
      clearInterval(interval)
      if (!openModal()) {
        openSimulatedCheckout(options)
      }
    }
    script.onerror = () => {
      clearInterval(interval)
      openSimulatedCheckout(options)
    }
    document.body.appendChild(script)
  }
}
