import type { CartItem } from '~/types/chat'

// The customer's cart. It lives in the browser (one per logged-in user) and holds only choices:
// which products, which option and how many. Prices are always fetched from the server.
export const useCartStore = defineStore('cart', () => {
  const auth = useAuthStore()

  const planId = ref<number | null>(null)
  const lines = ref<CartItem[]>([])

  const count = computed(() => lines.value.length)
  const storageKey = computed(() => (auth.user ? `cart:${auth.user.id}` : null))

  // storage can be blocked or hold something old, so every access is guarded
  function load() {
    planId.value = null
    lines.value = []
    if (!storageKey.value) return
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey.value) ?? 'null')
      if (saved && Array.isArray(saved.lines)) {
        planId.value = typeof saved.planId === 'number' ? saved.planId : null
        lines.value = saved.lines
      }
    } catch { /* start with an empty cart */ }
  }

  function save() {
    if (!storageKey.value) return
    try {
      localStorage.setItem(storageKey.value, JSON.stringify({ planId: planId.value, lines: lines.value }))
    } catch { /* the cart still works, it just won't survive a reload */ }
  }

  watch(storageKey, load, { immediate: true })
  watch([planId, lines], save, { deep: true })

  const sameLine = (a: CartItem, b: CartItem) => a.productId === b.productId && a.variantId === b.variantId

  // Adding something that is already in the cart updates it, so pressing "add" twice never doubles it.
  function addItems(items: CartItem[], plan: number) {
    planId.value = plan
    for (const item of items) {
      const existing = lines.value.findIndex((line) => sameLine(line, item))
      if (existing === -1) lines.value.push({ ...item })
      else lines.value[existing] = { ...item }
    }
  }

  function setQuantity(index: number, quantity: number) {
    const line = lines.value[index]
    if (line) line.quantity = Math.max(1, Math.floor(quantity) || 1)
  }

  function setVariant(index: number, variantId: number | null) {
    const line = lines.value[index]
    if (line) line.variantId = variantId
  }

  function remove(index: number) {
    lines.value.splice(index, 1)
    if (!lines.value.length) planId.value = null
  }

  function clear() {
    lines.value = []
    planId.value = null
  }

  return { planId, lines, count, addItems, setQuantity, setVariant, remove, clear }
})
