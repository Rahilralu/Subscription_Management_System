import type { Quote } from '~/types/chat'

interface QuoteInput {
  planId: number | null
  lines: { productId: number, variantId: number | null, quantity: number }[]
}

// Asks the server to price a cart and keeps the answer up to date as the input changes.
// Quick edits are batched, and an answer for an older cart never replaces a newer one.
export function useQuote(input: () => QuoteInput) {
  const api = useApi()
  const quote = ref<Quote | null>(null)
  const error = ref('')
  const pending = ref(false)

  let timer: ReturnType<typeof setTimeout> | undefined
  let latest = 0

  async function run() {
    const { planId, lines } = input()
    const id = ++latest
    if (!planId || !lines.length) {
      quote.value = null
      error.value = ''
      pending.value = false
      return
    }

    pending.value = true
    try {
      const res = await api<{ data: Quote }>('/chat/quote', { method: 'POST', body: { planId, lines } })
      if (id !== latest) return
      quote.value = res.data
      error.value = ''
    } catch (err) {
      if (id !== latest) return
      quote.value = null
      error.value = apiErrorMessage(err)
    } finally {
      if (id === latest) pending.value = false
    }
  }

  watch(
    () => JSON.stringify(input()),
    () => {
      clearTimeout(timer)
      timer = setTimeout(run, 200)
    },
    { immediate: true },
  )
  onScopeDispose(() => clearTimeout(timer))

  return { quote, error, pending, refresh: run }
}
