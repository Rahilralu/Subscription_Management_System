<script setup lang="ts">
import { periodLabel } from '~/types/chat'
import type { ShopPackage, ShopPlan, ShopProduct } from '~/types/shop'

const api = useApi()
const cart = useCartStore()
const toast = useToast()
const chat = useChatPanel()

// three ways in: a ready-made package, building your own, or asking the assistant
const mode = ref<'packages' | 'build'>('packages')

const { data: packages } = await useAsyncData(
  'shop-packages',
  () => api<{ data: ShopPackage[] }>('/shop/packages').then((res) => res.data),
  { default: () => [] as ShopPackage[] },
)

const { data: plans } = await useAsyncData(
  'shop-plans',
  () => api<{ data: ShopPlan[] }>('/portal/plans').then((res) => res.data),
  { default: () => [] as ShopPlan[] },
)

const searchInput = ref('')
const search = ref('')
let searchTimer: ReturnType<typeof setTimeout>
watch(searchInput, (value) => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => (search.value = value.trim()), 300)
})

const { data: products, status } = await useAsyncData(
  'shop-products',
  () => api<{ data: ShopProduct[] }>('/shop/products', { query: { search: search.value || undefined } }).then((res) => res.data),
  { watch: [search], default: () => [] as ShopProduct[] },
)

// the plan for products you pick yourself: the cart's plan if it has one, otherwise the first
const planItems = computed(() => plans.value.map((p) => ({ label: `${p.name} (${formatMoney(p.price)}, billed every ${periodLabel[p.billingPeriod] ?? p.billingPeriod})`, value: p.id })))
const chosenPlanId = ref<number | undefined>(cart.planId ?? undefined)
watchEffect(() => {
  if (chosenPlanId.value === undefined && plans.value.length) chosenPlanId.value = plans.value[0]!.id
})
// adding a package sets the cart's plan, and products picked afterwards should join that same plan
watch(() => cart.planId, (id) => {
  if (id) chosenPlanId.value = id
})

// what the customer picked on each product card before pressing Add
const choice = reactive<Record<number, { variantId: number, quantity: number }>>({})
const pick = (product: ShopProduct) => (choice[product.id] ??= { variantId: 0, quantity: 1 })
const variantItems = (product: ShopProduct) => [
  { label: 'Standard', value: 0 },
  ...product.variants.map((v) => ({ label: v.extraPrice ? `${v.label} (+${formatMoney(v.extraPrice)})` : v.label, value: v.id })),
]

function addPackage(pkg: ShopPackage) {
  cart.addItems(pkg.items, pkg.plan.id)
  toast.add({ title: `${pkg.name} is in your cart`, color: 'success', icon: 'i-lucide-shopping-cart' })
}

function addProduct(product: ShopProduct) {
  if (!chosenPlanId.value) return toast.add({ title: 'Choose a plan first', color: 'error' })
  const { variantId, quantity } = pick(product)
  cart.addItems(
    [{ productId: product.id, name: product.name, kind: 'core', reason: '', quantity, variantId: variantId || null, variants: product.variants }],
    chosenPlanId.value,
  )
  toast.add({ title: `${product.name} is in your cart`, color: 'success', icon: 'i-lucide-shopping-cart' })
}

const options = [
  { key: 'packages', icon: 'i-lucide-package-check', title: 'Ready-made packages', text: 'Pick a bundle our team already put together.' },
  { key: 'build', icon: 'i-lucide-blocks', title: 'Build your own', text: 'Choose products and tell us your requirements.' },
] as const
</script>

<template>
  <AppPage title="Get started" description="Choose how you want to set up your subscription. Whichever way you pick, you review the price in your cart and send it to our team as a quotation.">
    <div class="grid gap-3 md:grid-cols-3">
      <button
        v-for="option in options"
        :key="option.key"
        type="button"
        class="rounded-xl border p-4 text-left transition hover:border-primary"
        :class="mode === option.key ? 'border-primary bg-primary/5' : 'border-default'"
        @click="mode = option.key"
      >
        <UIcon :name="option.icon" class="size-6 text-primary" />
        <p class="mt-2 font-semibold text-highlighted">{{ option.title }}</p>
        <p class="mt-1 text-sm text-muted">{{ option.text }}</p>
      </button>

      <button type="button" class="rounded-xl border border-default p-4 text-left transition hover:border-primary" @click="chat.show()">
        <UIcon name="i-lucide-sparkles" class="size-6 text-primary" />
        <p class="mt-2 font-semibold text-highlighted">Ask the assistant</p>
        <p class="mt-1 text-sm text-muted">Describe what you need and it will suggest a cart.</p>
      </button>
    </div>

    <!-- 1. ready-made packages -->
    <section v-if="mode === 'packages'" class="space-y-4">
      <h2 class="text-lg font-semibold text-highlighted">Ready-made packages</h2>
      <p v-if="!packages.length" class="text-sm text-muted">There are no packages yet. Build your own or ask the assistant.</p>

      <div class="grid gap-4 md:grid-cols-2">
        <UCard v-for="pkg in packages" :key="pkg.id">
          <div class="flex items-start justify-between gap-3">
            <div>
              <h3 class="font-semibold text-highlighted">{{ pkg.name }}</h3>
              <p v-if="pkg.description" class="mt-1 text-sm text-muted">{{ pkg.description }}</p>
            </div>
            <UBadge :label="`Billed every ${periodLabel[pkg.plan.billingPeriod] ?? pkg.plan.billingPeriod}`" color="neutral" variant="subtle" class="shrink-0" />
          </div>

          <ul class="mt-3 space-y-1 text-sm">
            <li v-for="(line, i) in pkg.includes" :key="i" class="flex items-center gap-2">
              <UIcon name="i-lucide-check" class="size-4 text-success" />
              {{ line.name }}<span v-if="line.variant" class="text-muted">({{ line.variant }})</span>
              <span class="text-muted">x {{ line.quantity }}</span>
            </li>
            <li class="flex items-center gap-2 text-muted">
              <UIcon name="i-lucide-check" class="size-4 text-success" />
              {{ pkg.plan.name }} plan
            </li>
          </ul>

          <div class="mt-4 flex items-end justify-between gap-3">
            <p class="text-sm text-muted">
              From <span class="text-lg font-semibold text-highlighted tabular-nums">{{ formatMoney(pkg.priceBeforeTax) }}</span>
              per {{ periodLabel[pkg.plan.billingPeriod] ?? pkg.plan.billingPeriod }}, before tax
            </p>
            <UButton icon="i-lucide-shopping-cart" @click="addPackage(pkg)">Add to cart</UButton>
          </div>
        </UCard>
      </div>
    </section>

    <!-- 2. build your own -->
    <section v-else class="space-y-4">
      <h2 class="text-lg font-semibold text-highlighted">Build your own</h2>

      <div class="flex flex-col gap-3 sm:flex-row sm:items-end">
        <UFormField label="Billing plan" class="sm:w-96">
          <USelect v-model="chosenPlanId" :items="planItems" placeholder="Choose a plan" class="w-full" />
        </UFormField>
        <UInput v-model="searchInput" icon="i-lucide-search" placeholder="Search products" aria-label="Search products" class="w-full sm:max-w-xs" />
      </div>

      <p v-if="status !== 'pending' && !products.length" class="text-sm text-muted">
        {{ search ? `No products match "${search}"` : 'No products available right now.' }}
      </p>

      <div class="grid gap-4 md:grid-cols-2">
        <UCard v-for="product in products" :key="product.id">
          <div class="flex items-start justify-between gap-3">
            <div>
              <h3 class="font-semibold text-highlighted">{{ product.name }}</h3>
              <p v-if="product.description" class="mt-1 text-sm text-muted">{{ product.description }}</p>
            </div>
            <p class="shrink-0 font-semibold tabular-nums">{{ formatMoney(product.price) }}</p>
          </div>

          <div class="mt-4 flex flex-wrap items-end gap-3">
            <UFormField v-if="product.variants.length" label="Option">
              <USelect v-model="pick(product).variantId" :items="variantItems(product)" class="w-52" />
            </UFormField>
            <UFormField label="Quantity">
              <UInputNumber v-model="pick(product).quantity" :min="1" :max="10000" class="w-28" />
            </UFormField>
            <UButton icon="i-lucide-plus" class="ml-auto" @click="addProduct(product)">Add</UButton>
          </div>
        </UCard>
      </div>
    </section>

    <UCard v-if="cart.count" class="sticky bottom-4">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <p class="text-sm">
          <span class="font-semibold">{{ cart.count }} item{{ cart.count === 1 ? '' : 's' }}</span> in your cart.
          <span class="text-muted">Add your requirements for our team there before you send the request.</span>
        </p>
        <UButton to="/portal/cart" trailing-icon="i-lucide-arrow-right">Go to cart</UButton>
      </div>
    </UCard>
  </AppPage>
</template>
