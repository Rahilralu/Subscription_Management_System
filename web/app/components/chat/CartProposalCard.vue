<script setup lang="ts">
import { periodLabel, type CartItem, type Proposal } from '~/types/chat'

// The add-to-cart / modify menu shown inside the assistant's message. The customer can tick items,
// switch options, change quantities and the plan, and sees the real price update as they do.
const props = defineProps<{ proposal: Proposal }>()

const cart = useCartStore()
const chat = useChatPanel()
const toast = useToast()

type Row = CartItem & { selected: boolean }

const planId = ref(props.proposal.planId)
// what was asked for is ticked; extras the assistant merely recommends start unticked
const rows = ref<Row[]>(props.proposal.items.map((item) => ({ ...item, selected: item.kind === 'core' })))

const core = computed(() => rows.value.filter((row) => row.kind === 'core'))
const addons = computed(() => rows.value.filter((row) => row.kind === 'addon'))
const selected = computed(() => rows.value.filter((row) => row.selected))

const { quote, error, pending } = useQuote(() => ({
  planId: planId.value,
  lines: selected.value.map(({ productId, variantId, quantity }) => ({ productId, variantId, quantity })),
}))

// quote lines come back in the order of the selected rows
const lineAmount = (row: Row) => {
  const index = selected.value.indexOf(row)
  return index === -1 ? null : (quote.value?.lines[index]?.amount ?? null)
}

const NO_OPTION = 0
const variantItems = (row: Row) => [
  { label: 'Standard', value: NO_OPTION },
  ...row.variants.map((v) => ({ label: v.extraPrice ? `${v.label} (+${formatMoney(v.extraPrice)})` : v.label, value: v.id })),
]

const added = ref(false)
watch([rows, planId], () => { added.value = false }, { deep: true })

function addToCart() {
  const items = selected.value.map(({ selected: _selected, ...item }) => item)
  cart.addItems(items, planId.value)
  added.value = true
  toast.add({ title: `${items.length} item${items.length === 1 ? '' : 's'} in your cart`, color: 'success', icon: 'i-lucide-shopping-cart' })
}

async function openCart() {
  chat.hide()
  await navigateTo('/portal/cart')
}
</script>

<template>
  <div class="mt-2 rounded-lg border border-default bg-default p-3 text-sm">
    <div class="mb-3 flex items-center justify-between gap-2">
      <p class="font-semibold">Suggested selection</p>
      <USelect v-model="planId" :items="proposal.plans.map((p) => ({ label: `${p.name} · every ${periodLabel[p.billingPeriod] ?? p.billingPeriod}`, value: p.id }))" size="sm" class="w-48" aria-label="Billing plan" />
    </div>

    <template v-for="group in [{ title: 'Your products', rows: core }, { title: 'Recommended add-ons', rows: addons }]" :key="group.title">
      <div v-if="group.rows.length" class="mb-3">
        <p class="mb-1 text-xs font-medium uppercase tracking-wide text-muted">{{ group.title }}</p>
        <ul class="space-y-2">
          <li v-for="row in group.rows" :key="row.productId" class="rounded-md border border-default p-2" :class="row.selected ? 'bg-primary/5' : ''">
            <div class="flex items-start justify-between gap-2">
              <UCheckbox v-model="row.selected" :label="row.name" :description="row.reason" />
              <span v-if="row.selected" class="shrink-0 tabular-nums font-medium">
                <USkeleton v-if="pending && !quote" class="h-4 w-14" />
                <template v-else-if="lineAmount(row)">{{ formatMoney(lineAmount(row)) }}</template>
              </span>
            </div>

            <div v-if="row.selected" class="mt-2 flex flex-wrap items-center gap-2 pl-6">
              <USelect
                v-if="row.variants.length"
                :model-value="row.variantId ?? NO_OPTION"
                :items="variantItems(row)"
                size="sm"
                class="w-44"
                :aria-label="`Option for ${row.name}`"
                @update:model-value="row.variantId = $event === NO_OPTION ? null : Number($event)"
              />
              <UInputNumber
                :model-value="row.quantity"
                :min="quote?.plan.minQuantity ?? 1"
                :max="10000"
                size="sm"
                class="w-28"
                :aria-label="`Quantity of ${row.name}`"
                @update:model-value="row.quantity = Math.max(1, Math.floor($event ?? 1))"
              />
            </div>
          </li>
        </ul>
      </div>
    </template>

    <UAlert v-if="error" color="error" variant="subtle" icon="i-lucide-triangle-alert" :title="error" class="mb-3" />
    <p v-else-if="!selected.length" class="mb-3 text-muted">Tick at least one item to see a price.</p>
    <div v-else class="mb-3 min-h-16">
      <USkeleton v-if="pending && !quote" class="h-16 w-full" />
      <template v-else-if="quote">
        <TotalsBlock :subtotal="quote.subtotal" :discount-total="quote.discountTotal" :tax-total="quote.taxTotal" :total="quote.total" />
        <p class="mt-1 text-right text-xs text-muted">Per {{ periodLabel[quote.plan.billingPeriod] ?? quote.plan.billingPeriod }}</p>
      </template>
    </div>

    <div class="flex flex-wrap gap-2">
      <UButton :icon="added ? 'i-lucide-check' : 'i-lucide-shopping-cart'" :color="added ? 'success' : 'primary'" :disabled="!selected.length || !!error || pending" @click="addToCart">
        {{ added ? 'Added to cart' : 'Add selected to cart' }}
      </UButton>
      <UButton color="neutral" variant="outline" icon="i-lucide-arrow-right" trailing @click="openCart">
        Open cart<template v-if="cart.count"> ({{ cart.count }})</template>
      </UButton>
    </div>
  </div>
</template>
