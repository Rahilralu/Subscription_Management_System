<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'

interface Line {
  id: number
  quantity: number
  unitPrice: string
  product: { id: number, name: string }
  variant: { attribute: string, value: string } | null
}

interface Request {
  id: number
  type: 'PAUSE' | 'UPGRADE'
  status: string
  note: string | null
  decisionNote: string | null
  createdAt: string
  plan: { id: number, name: string } | null
}

interface Subscription {
  id: number
  number: string
  status: string
  startDate: string
  expiryDate: string | null
  nextInvoiceDate: string | null
  quotationValidUntil: string | null
  paymentTermDays: number
  recurringTotal: string
  plan: { id: number, name: string, billingPeriod: string, pausable: boolean }
  lines: Line[]
  history: { fromStatus: string | null, toStatus: string, createdAt: string }[]
  requests: Request[]
}

interface Plan {
  id: number
  name: string
  price: string
  billingPeriod: string
}

const route = useRoute()
const api = useApi()
const toast = useToast()
const id = Number(route.params.id)

const { data: sub, error, refresh } = await useAsyncData(`portal-subscription-${id}`, () =>
  api<{ data: Subscription }>(`/portal/subscriptions/${id}`).then((res) => res.data),
)

const columns: TableColumn<Line>[] = [
  { id: 'product', header: 'Product' },
  { accessorKey: 'quantity', header: 'Qty' },
  { accessorKey: 'unitPrice', header: 'Unit price' },
  { id: 'amount', header: 'Amount' },
]

const pendingRequest = computed(() => sub.value?.requests.find((r) => r.status === 'PENDING'))
const canRequest = computed(() => sub.value?.status === 'ACTIVE' && !pendingRequest.value)

// request modal
const open = ref(false)
const requestType = ref<'PAUSE' | 'UPGRADE'>('PAUSE')
const planId = ref<number>()
const note = ref('')
const saving = ref(false)

const { data: plans } = await useAsyncData(
  'portal-plans',
  () => api<{ data: Plan[] }>('/portal/plans').then((res) => res.data),
  { default: () => [] },
)
const planOptions = computed(() =>
  plans.value
    .filter((p) => p.id !== sub.value?.plan.id)
    .map((p) => ({ label: `${p.name} (${formatMoney(p.price)} ${p.billingPeriod.toLowerCase()})`, value: p.id })),
)

function startRequest(type: 'PAUSE' | 'UPGRADE') {
  requestType.value = type
  planId.value = undefined
  note.value = ''
  open.value = true
}

async function submitRequest() {
  saving.value = true
  try {
    await api(`/portal/subscriptions/${id}/requests`, {
      method: 'POST',
      body: { type: requestType.value, planId: planId.value, note: note.value || undefined },
    })
    toast.add({ title: 'Request sent', description: 'Our team will review it shortly.', color: 'success' })
    open.value = false
    await refresh()
  } catch (err) {
    toast.add({ title: 'Could not send request', description: apiErrorMessage(err), color: 'error' })
  } finally {
    saving.value = false
  }
}

// resuming needs no approval, it just starts billing again
const resuming = ref(false)

async function resume() {
  resuming.value = true
  try {
    await api(`/portal/subscriptions/${id}/resume`, { method: 'POST' })
    toast.add({
      title: 'Subscription resumed',
      description: 'Your next invoice and end date moved back by the days you were paused.',
      color: 'success',
    })
    await refresh()
  } catch (err) {
    toast.add({ title: 'Could not resume', description: apiErrorMessage(err), color: 'error' })
  } finally {
    resuming.value = false
  }
}

const periodWord: Record<string, string> = { DAILY: 'day', WEEKLY: 'week', MONTHLY: 'month', YEARLY: 'year' }

// accepting a quotation confirms it; staff then activate it and billing starts
const acceptOpen = ref(false)
const accepting = ref(false)
const quotationExpired = computed(() =>
  Boolean(sub.value?.quotationValidUntil && dateInputValue(sub.value.quotationValidUntil) < todayInputValue()),
)

async function acceptQuotation() {
  accepting.value = true
  try {
    await api(`/portal/subscriptions/${id}/accept`, { method: 'POST' })
    acceptOpen.value = false
    toast.add({ title: 'Quotation accepted', description: 'Thank you! Our team will start your subscription shortly.', color: 'success' })
    await Promise.all([refresh(), refreshNuxtData('portal-quotations')])
  } catch (err) {
    toast.add({ title: 'Could not accept the quotation', description: apiErrorMessage(err), color: 'error' })
  } finally {
    accepting.value = false
  }
}

// lifecycle shown as a stepper; PAUSED sits on the Active step and DRAFT has not reached the customer yet
const steps = ['Quotation', 'Confirmed', 'Active', 'Closed']
const stepIndex = computed(() => ({ QUOTATION: 0, CONFIRMED: 1, ACTIVE: 2, PAUSED: 2, CLOSED: 3 } as Record<string, number>)[sub.value?.status ?? ''] ?? 0)

const requestLabel = (r: Request) => (r.type === 'PAUSE' ? 'Pause' : `Change plan to ${r.plan?.name ?? '—'}`)
</script>

<template>
  <AppPage :title="sub ? sub.plan.name : 'Subscription'">
    <template #actions>
      <UButton to="/portal" color="neutral" variant="ghost" icon="i-lucide-arrow-left">Back</UButton>
    </template>

    <UAlert v-if="error" color="error" variant="subtle" title="Subscription not found" />

    <div v-else-if="sub" class="space-y-6">
      <div class="flex flex-wrap items-center gap-3">
        <h2 class="text-2xl font-semibold tracking-tight text-highlighted">{{ sub.plan.name }}</h2>
        <StatusBadge :status="sub.status" />
        <span class="font-mono text-sm text-muted">{{ sub.number }}</span>
      </div>

      <UCard v-if="sub.status === 'QUOTATION'" :ui="{ root: quotationExpired ? '' : 'ring-2 ring-primary' }">
        <div class="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 class="font-semibold text-highlighted">{{ quotationExpired ? 'This quotation has expired' : 'Your quotation is ready' }}</h3>
            <p class="text-sm text-muted">
              <template v-if="quotationExpired">It was valid until {{ formatDate(sub.quotationValidUntil) }}. Contact us for a new one.</template>
              <template v-else>
                {{ formatMoney(sub.recurringTotal) }} per {{ periodWord[sub.plan.billingPeriod] ?? 'period' }} before tax.
                <template v-if="sub.quotationValidUntil">Valid until {{ formatDate(sub.quotationValidUntil) }}.</template>
              </template>
            </p>
          </div>
          <UButton v-if="!quotationExpired" icon="i-lucide-check" size="lg" @click="acceptOpen = true">Accept quotation</UButton>
        </div>
      </UCard>

      <UCard>
        <ol class="flex items-start" aria-label="Subscription progress">
          <li v-for="(label, i) in steps" :key="label" class="relative flex flex-1 flex-col items-center text-center last:flex-none sm:last:flex-1">
            <div v-if="i < steps.length - 1" class="absolute left-1/2 top-4 h-0.5 w-full -translate-y-1/2" :class="i < stepIndex ? 'bg-primary' : 'bg-accented'" aria-hidden="true" />
            <span
              class="relative z-10 grid size-8 place-items-center rounded-full text-xs font-semibold ring-4 ring-default"
              :class="i < stepIndex ? 'bg-primary text-white' : i === stepIndex ? (sub.status === 'PAUSED' ? 'bg-warning text-white' : sub.status === 'CLOSED' ? 'bg-accented text-default' : 'bg-primary text-white') : 'bg-accented text-muted'"
              :aria-current="i === stepIndex ? 'step' : undefined"
            >
              <UIcon v-if="i < stepIndex || (i === stepIndex && sub.status === 'CLOSED')" name="i-lucide-check" class="size-4" />
              <UIcon v-else-if="i === stepIndex && sub.status === 'PAUSED'" name="i-lucide-pause" class="size-4" />
              <template v-else>{{ i + 1 }}</template>
            </span>
            <span class="mt-2 text-xs sm:text-sm" :class="i === stepIndex ? 'font-medium text-highlighted' : 'text-muted'">{{ label }}</span>
          </li>
        </ol>
      </UCard>

      <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Recurring total" icon="i-lucide-wallet" :value="formatMoney(sub.recurringTotal)" hint="Per billing period, before tax" />
        <StatTile label="Next invoice" icon="i-lucide-calendar-clock" :value="formatDate(sub.nextInvoiceDate)" :hint="`Payment terms: ${sub.paymentTermDays} days`" />
        <StatTile label="Started" icon="i-lucide-calendar-check" :value="formatDate(sub.startDate)" />
        <StatTile label="Expires" icon="i-lucide-calendar-x" :value="formatDate(sub.expiryDate)" :hint="sub.expiryDate ? undefined : 'Renews until you close it'" />
      </div>

      <UCard>
        <template #header>
          <div class="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 class="font-semibold text-highlighted">Need a change?</h3>
              <p class="text-sm text-muted">
                <template v-if="pendingRequest">Your request to {{ requestLabel(pendingRequest).toLowerCase() }} is waiting for review.</template>
                <template v-else-if="sub.status === 'PAUSED'">
                  Your subscription is paused and you are not being invoiced. When you resume, your next invoice and end date move back by the days you were paused.
                </template>
                <template v-else-if="sub.status !== 'ACTIVE'">Changes can be requested while the subscription is active.</template>
                <template v-else>Our team reviews every request.</template>
              </p>
            </div>
            <div class="flex gap-2">
              <UButton v-if="sub.status === 'PAUSED'" icon="i-lucide-play" :loading="resuming" @click="resume">
                Resume subscription
              </UButton>
              <UButton v-if="sub.plan.pausable" icon="i-lucide-pause" color="neutral" variant="outline" :disabled="!canRequest" @click="startRequest('PAUSE')">
                Request pause
              </UButton>
              <UButton icon="i-lucide-circle-arrow-up" :disabled="!canRequest" @click="startRequest('UPGRADE')">
                Request plan change
              </UButton>
            </div>
          </div>
        </template>

        <ul v-if="sub.requests.length" class="-my-1 divide-y divide-default">
          <li v-for="r in sub.requests" :key="r.id" class="flex items-center justify-between gap-3 py-3 text-sm">
            <div class="flex min-w-0 items-center gap-3">
              <span class="grid size-8 shrink-0 place-items-center rounded-lg bg-elevated text-muted">
                <UIcon :name="r.type === 'PAUSE' ? 'i-lucide-pause' : 'i-lucide-circle-arrow-up'" class="size-4" />
              </span>
              <div class="min-w-0">
                <p class="font-medium text-highlighted">{{ requestLabel(r) }}</p>
                <p class="truncate text-xs text-muted">{{ formatDate(r.createdAt) }}<template v-if="r.decisionNote"> · {{ r.decisionNote }}</template></p>
              </div>
            </div>
            <StatusBadge :status="r.status" />
          </li>
        </ul>
        <p v-else class="text-sm text-muted">No requests yet.</p>
      </UCard>

      <UCard :ui="{ body: 'p-0 sm:p-0' }">
        <template #header><h3 class="font-semibold text-highlighted">Products</h3></template>
        <UTable :data="sub.lines" :columns="columns">
          <template #product-cell="{ row }">
            <span class="font-medium text-highlighted">{{ row.original.product.name }}</span>
            <span v-if="row.original.variant" class="text-muted"> · {{ row.original.variant.attribute }}: {{ row.original.variant.value }}</span>
          </template>
          <template #unitPrice-cell="{ row }"><span class="tabular-nums">{{ formatMoney(row.original.unitPrice) }}</span></template>
          <template #amount-cell="{ row }">
            <span class="tabular-nums">{{ formatMoney(Number(row.original.unitPrice) * row.original.quantity) }}</span>
          </template>
        </UTable>
      </UCard>

      <UCard>
        <template #header><h3 class="font-semibold text-highlighted">History</h3></template>
        <ol class="relative space-y-5 border-s border-default ps-6">
          <li v-for="(h, i) in sub.history" :key="i" class="relative">
            <span class="absolute -start-[31px] top-0.5 size-3 rounded-full bg-primary ring-4 ring-default" aria-hidden="true" />
            <StatusBadge :status="h.toStatus" />
            <p class="mt-1 text-xs text-muted">{{ formatDate(h.createdAt) }}</p>
          </li>
        </ol>
      </UCard>
    </div>

    <UModal v-model:open="open" :title="requestType === 'PAUSE' ? 'Request a pause' : 'Request a plan change'">
      <template #body>
        <div class="space-y-4">
          <UFormField v-if="requestType === 'UPGRADE'" label="New plan" required>
            <USelect v-model="planId" :items="planOptions" placeholder="Choose a plan" class="w-full" />
          </UFormField>
          <UFormField label="Note (optional)">
            <UTextarea v-model="note" :rows="3" placeholder="Anything our team should know" class="w-full" />
          </UFormField>
        </div>
      </template>
      <template #footer>
        <div class="flex w-full justify-end gap-2">
          <UButton color="neutral" variant="ghost" @click="open = false">Cancel</UButton>
          <UButton :loading="saving" :disabled="requestType === 'UPGRADE' && !planId" @click="submitRequest">Send request</UButton>
        </div>
      </template>
    </UModal>
    <UModal
      v-model:open="acceptOpen"
      title="Accept this quotation?"
      :description="sub ? `${sub.plan.name}, ${formatMoney(sub.recurringTotal)} per ${periodWord[sub.plan.billingPeriod] ?? 'period'} before tax. Billing starts once our team activates it.` : ''"
    >
      <template #footer>
        <div class="flex w-full justify-end gap-2">
          <UButton color="neutral" variant="ghost" @click="acceptOpen = false">Not yet</UButton>
          <UButton icon="i-lucide-check" :loading="accepting" @click="acceptQuotation">Accept quotation</UButton>
        </div>
      </template>
    </UModal>
  </AppPage>
</template>
