<script setup lang="ts">
import { periodLabel, type CartItem } from '~/types/chat'

interface PlanSummary { id: number, name: string, billingPeriod: string }

const api = useApi()
const cart = useCartStore()
const toast = useToast()
const chat = useChatPanel()

const { data: plans } = await useAsyncData(
  'portal-plans',
  () => api<{ data: PlanSummary[] }>('/portal/plans').then((res) => res.data),
  { default: () => [] as PlanSummary[] },
)
const planItems = computed(() => plans.value.map((p) => ({ label: `${p.name} (billed every ${periodLabel[p.billingPeriod] ?? p.billingPeriod})`, value: p.id })))
const planModel = computed({
  get: () => cart.planId ?? undefined,
  set: (value: number | undefined) => { cart.planId = value ?? null },
})

const { quote, error, pending } = useQuote(() => ({
  planId: cart.planId,
  lines: cart.lines.map(({ productId, variantId, quantity }) => ({ productId, variantId, quantity })),
}))

// USelect cannot hold null, so 0 stands for "no option chosen"
const NO_OPTION = 0
function variantItems(line: CartItem) {
  return [
    { label: 'Standard', value: NO_OPTION },
    ...line.variants.map((v) => ({ label: v.extraPrice ? `${v.label} (+${formatMoney(v.extraPrice)})` : v.label, value: v.id })),
  ]
}

const notes = ref('')
const submitting = ref(false)
const created = ref<{ id: number, number: string } | null>(null)

async function requestQuotation() {
  submitting.value = true
  try {
    const res = await api<{ data: { id: number, number: string } }>('/chat/quote-request', {
      method: 'POST',
      body: {
        planId: cart.planId,
        notes: notes.value.trim() || undefined,
        lines: cart.lines.map(({ productId, variantId, quantity }) => ({ productId, variantId, quantity })),
      },
    })
    created.value = res.data
    cart.clear()
    notes.value = ''
    await refreshNuxtData('portal-quotations')
  } catch (err) {
    toast.add({ title: 'Could not send your request', description: apiErrorMessage(err), color: 'error' })
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <AppPage title="My cart">
    <UCard v-if="created" class="max-w-xl">
      <div class="flex items-start gap-3">
        <UIcon name="i-lucide-circle-check" class="size-6 text-success shrink-0" />
        <div class="space-y-3">
          <div>
            <p class="font-semibold">Quotation {{ created.number }} requested</p>
            <p class="text-sm text-muted">
              Our team will review it and get back to you. You can follow it any time under "My quotations"; nothing is charged yet.
            </p>
          </div>
          <div class="flex flex-wrap gap-2">
            <UButton to="/portal/quotations" icon="i-lucide-file-text">My quotations</UButton>
            <UButton :to="`/portal/subscriptions/${created.id}`" color="neutral" variant="outline" icon="i-lucide-eye">View this one</UButton>
            <UButton color="neutral" variant="outline" icon="i-lucide-sparkles" @click="created = null; chat.show()">Ask the assistant</UButton>
          </div>
        </div>
      </div>
    </UCard>

    <UEmpty
      v-else-if="!cart.lines.length"
      icon="i-lucide-shopping-cart"
      title="Your cart is empty"
      description="Tell the assistant what your business needs and it will suggest products and add-ons you can put here."
      :actions="[{ label: 'Ask the assistant', icon: 'i-lucide-sparkles', onClick: () => chat.show() }]"
    />

    <div v-else class="grid gap-6 lg:grid-cols-3">
      <div class="space-y-3 lg:col-span-2">
        <UAlert v-if="error" color="error" variant="subtle" icon="i-lucide-triangle-alert" :title="error" />

        <UCard v-for="(line, i) in cart.lines" :key="`${line.productId}-${line.variantId}`" :ui="{ body: 'p-4 sm:p-4' }">
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div class="min-w-0">
              <p class="flex items-center gap-2 font-medium">
                {{ line.name }}
                <UBadge v-if="line.kind === 'addon'" color="info" variant="subtle" size="sm">Add-on</UBadge>
              </p>
              <p v-if="line.reason" class="text-sm text-muted">{{ line.reason }}</p>
            </div>
            <div class="text-right">
              <USkeleton v-if="pending && !quote" class="h-6 w-20" />
              <p v-else-if="quote?.lines[i]" class="font-semibold tabular-nums">{{ formatMoney(quote.lines[i].amount) }}</p>
              <p class="text-xs text-muted">incl. tax</p>
            </div>
          </div>

          <div class="mt-3 flex flex-wrap items-end gap-3">
            <UFormField v-if="line.variants.length" label="Option">
              <USelect
                :model-value="line.variantId ?? NO_OPTION"
                :items="variantItems(line)"
                class="w-56"
                @update:model-value="cart.setVariant(i, $event === NO_OPTION ? null : Number($event))"
              />
            </UFormField>
            <UFormField label="Quantity">
              <UInputNumber
                :model-value="line.quantity"
                :min="quote?.plan.minQuantity ?? 1"
                :max="10000"
                class="w-32"
                @update:model-value="cart.setQuantity(i, $event ?? 1)"
              />
            </UFormField>
            <UButton color="error" variant="ghost" icon="i-lucide-trash-2" class="ml-auto" :aria-label="`Remove ${line.name}`" @click="cart.remove(i)">
              Remove
            </UButton>
          </div>
        </UCard>

        <UButton color="neutral" variant="outline" icon="i-lucide-sparkles" @click="chat.show()">Ask the assistant for more suggestions</UButton>
      </div>

      <UCard class="h-fit lg:sticky lg:top-4">
        <template #header>
          <h2 class="font-semibold">Summary</h2>
        </template>

        <div class="space-y-4">
          <UFormField label="Billing plan">
            <USelect v-model="planModel" :items="planItems" class="w-full" />
          </UFormField>

          <div class="min-h-24">
            <div v-if="pending && !quote" class="space-y-2">
              <USkeleton v-for="n in 4" :key="n" class="h-4 w-full" />
            </div>
            <template v-else-if="quote">
              <p v-if="quote.planPrice" class="mb-3 flex justify-between text-sm">
                <span class="text-muted">{{ quote.plan.name }} plan price</span>
                <span class="tabular-nums">{{ formatMoney(quote.planPrice) }}</span>
              </p>
              <TotalsBlock :subtotal="quote.subtotal" :discount-total="quote.discountTotal" :tax-total="quote.taxTotal" :total="quote.total" />
              <p class="mt-2 text-right text-xs text-muted">
                Per {{ periodLabel[quote.plan.billingPeriod] ?? quote.plan.billingPeriod }}. Discounts apply automatically.
              </p>
            </template>
            <p v-else class="text-sm text-muted">Fix the issue above to see your total.</p>
          </div>

          <UFormField label="Note for our team" hint="Optional">
            <UTextarea v-model="notes" :rows="2" :maxlength="500" placeholder="Start date, number of users, anything we should know" class="w-full" />
          </UFormField>

          <UButton block size="lg" icon="i-lucide-send" :loading="submitting" :disabled="!quote || pending" @click="requestQuotation">
            Request quotation
          </UButton>
          <p class="text-center text-xs text-muted">This sends a request to our team. Nothing is charged until you confirm a quotation.</p>

          <UButton block color="neutral" variant="ghost" size="sm" @click="cart.clear()">Empty cart</UButton>
        </div>
      </UCard>
    </div>
  </AppPage>
</template>
