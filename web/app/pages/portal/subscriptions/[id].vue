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

const requestLabel = (r: Request) => (r.type === 'PAUSE' ? 'Pause' : `Change plan to ${r.plan?.name ?? '—'}`)
</script>

<template>
  <AppPage :title="sub ? `${sub.plan.name} · ${sub.number}` : 'Subscription'">
    <template #actions>
      <UButton to="/portal" color="neutral" variant="ghost" icon="i-lucide-arrow-left">Back</UButton>
    </template>

    <UAlert v-if="error" color="error" variant="subtle" title="Subscription not found" />

    <div v-else-if="sub" class="space-y-6">
      <div class="grid gap-4 md:grid-cols-4">
        <UCard>
          <p class="text-sm text-muted">Status</p>
          <StatusBadge :status="sub.status" class="mt-1" />
        </UCard>
        <UCard>
          <p class="text-sm text-muted">Recurring total (before tax)</p>
          <p class="text-lg font-semibold">{{ formatMoney(sub.recurringTotal) }}</p>
        </UCard>
        <UCard>
          <p class="text-sm text-muted">Next invoice</p>
          <p class="text-lg font-semibold">{{ formatDate(sub.nextInvoiceDate) }}</p>
        </UCard>
        <UCard>
          <p class="text-sm text-muted">Expires</p>
          <p class="text-lg font-semibold">{{ formatDate(sub.expiryDate) }}</p>
        </UCard>
      </div>

      <UCard>
        <template #header>
          <div class="flex flex-wrap items-center justify-between gap-2">
            <h2 class="font-semibold">Need a change?</h2>
            <div class="flex gap-2">
              <UButton v-if="sub.status === 'PAUSED'" icon="i-lucide-play" :loading="resuming" @click="resume">
                Resume subscription
              </UButton>
              <UButton
                v-if="sub.plan.pausable"
                icon="i-lucide-pause"
                color="neutral"
                variant="outline"
                :disabled="!canRequest"
                @click="startRequest('PAUSE')"
              >
                Request pause
              </UButton>
              <UButton icon="i-lucide-circle-arrow-up" :disabled="!canRequest" @click="startRequest('UPGRADE')">
                Request plan change
              </UButton>
            </div>
          </div>
        </template>

        <p v-if="pendingRequest" class="text-sm">
          Your request to <strong>{{ requestLabel(pendingRequest).toLowerCase() }}</strong> is waiting for review.
        </p>
        <p v-else-if="sub.status === 'PAUSED'" class="text-sm text-muted">
          Your subscription is paused and you are not being invoiced. When you resume, your next invoice and end date
          move back by the days you were paused.
        </p>
        <p v-else-if="sub.status !== 'ACTIVE'" class="text-sm text-muted">
          Changes can be requested while the subscription is active.
        </p>
        <p v-else class="text-sm text-muted">
          Ask to pause{{ sub.plan.pausable ? '' : ' (not available on this plan)' }} or move to another plan. Our team
          reviews every request.
        </p>

        <ul v-if="sub.requests.length" class="mt-4 divide-y divide-default">
          <li v-for="r in sub.requests" :key="r.id" class="py-2 flex items-center justify-between gap-2 text-sm">
            <div>
              <p>{{ requestLabel(r) }}</p>
              <p class="text-muted">
                {{ formatDate(r.createdAt) }}<template v-if="r.decisionNote"> · {{ r.decisionNote }}</template>
              </p>
            </div>
            <StatusBadge :status="r.status" />
          </li>
        </ul>
      </UCard>

      <UCard :ui="{ body: 'p-0 sm:p-0' }">
        <template #header><h2 class="font-semibold">Products</h2></template>
        <UTable :data="sub.lines" :columns="columns">
          <template #product-cell="{ row }">
            {{ row.original.product.name }}
            <span v-if="row.original.variant" class="text-muted">
              ({{ row.original.variant.attribute }}: {{ row.original.variant.value }})
            </span>
          </template>
          <template #unitPrice-cell="{ row }">{{ formatMoney(row.original.unitPrice) }}</template>
          <template #amount-cell="{ row }">
            {{ formatMoney(Number(row.original.unitPrice) * row.original.quantity) }}
          </template>
        </UTable>
      </UCard>

      <UCard>
        <template #header><h2 class="font-semibold">History</h2></template>
        <ol class="space-y-2 text-sm">
          <li v-for="(h, i) in sub.history" :key="i" class="flex items-center gap-2">
            <StatusBadge :status="h.toStatus" />
            <span class="text-muted">{{ formatDate(h.createdAt) }}</span>
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
        <div class="flex justify-end gap-2 w-full">
          <UButton color="neutral" variant="ghost" @click="open = false">Cancel</UButton>
          <UButton :loading="saving" :disabled="requestType === 'UPGRADE' && !planId" @click="submitRequest">
            Send request
          </UButton>
        </div>
      </template>
    </UModal>
  </AppPage>
</template>
