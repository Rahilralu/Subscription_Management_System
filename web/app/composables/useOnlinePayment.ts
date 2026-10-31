// Customer "Pay now": Razorpay Checkout (test keys for the demo) or a simulated 'demo' gateway.
// The server decides which one is active (PAYMENT_GATEWAY) and re-checks every payment.

type Gateway = 'razorpay' | 'demo'

interface Checkout {
  gateway: Gateway
  invoiceNumber: string
  amount: number // paise
  currency: 'INR'
  keyId?: string
  orderId?: string
  prefill?: { name?: string, email?: string, contact?: string }
}

interface RazorpaySuccess {
  razorpay_order_id: string
  razorpay_payment_id: string
  razorpay_signature: string
}

interface RazorpayInstance {
  open: () => void
  on: (event: 'payment.failed', handler: (response: { error: { description: string } }) => void) => void
}

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => RazorpayInstance
  }
}

const CHECKOUT_SCRIPT = 'https://checkout.razorpay.com/v1/checkout.js'

function loadCheckoutScript(): Promise<void> {
  if (window.Razorpay) return Promise.resolve()
  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = CHECKOUT_SCRIPT
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Could not load Razorpay. Check your internet connection.'))
    document.head.appendChild(script)
  })
}

export function useOnlinePayment() {
  const api = useApi()
  const gateway = ref<Gateway | null>(null)
  const payingId = ref<number | null>(null)

  api<{ data: { gateway: Gateway | null } }>('/portal/payments/config')
    .then((res) => (gateway.value = res.data.gateway))
    .catch(() => (gateway.value = null)) // no Pay button if the config can't be read

  const confirm = (invoiceId: number, body: Record<string, string> = {}) =>
    api(`/portal/invoices/${invoiceId}/pay`, { method: 'POST', body })

  // opens Razorpay and resolves once the server has verified and recorded the payment;
  // resolves false if the customer closes the window
  async function payWithRazorpay(invoiceId: number, checkout: Checkout): Promise<boolean> {
    await loadCheckoutScript()
    return new Promise((resolve, reject) => {
      const razorpay = new window.Razorpay!({
        key: checkout.keyId,
        order_id: checkout.orderId,
        amount: checkout.amount,
        currency: checkout.currency,
        name: 'Brightloop',
        description: `Invoice ${checkout.invoiceNumber}`,
        prefill: checkout.prefill,
        theme: { color: '#6366f1' },
        handler: (res: RazorpaySuccess) =>
          confirm(invoiceId, { orderId: res.razorpay_order_id, paymentId: res.razorpay_payment_id, signature: res.razorpay_signature })
            .then(() => resolve(true), reject),
        modal: { ondismiss: () => resolve(false) },
      })
      razorpay.on('payment.failed', (res) => reject(new Error(res.error.description)))
      razorpay.open()
    })
  }

  // demo gateway: the caller shows its own "simulated payment" confirmation first
  async function pay(invoiceId: number): Promise<boolean> {
    payingId.value = invoiceId
    try {
      const checkout = (await api<{ data: Checkout }>(`/portal/invoices/${invoiceId}/checkout`, { method: 'POST' })).data
      if (checkout.gateway === 'demo') {
        await confirm(invoiceId)
        return true
      }
      return await payWithRazorpay(invoiceId, checkout)
    } finally {
      payingId.value = null
    }
  }

  return { gateway, payingId, pay }
}
