<script setup lang="ts">
import type { SubscriptionDetail, SubscriptionInvoice, PricedLine } from '~/types/billing'

const api = useApi()
const toast = useToast()
const id = useRoute().params.id as string

const { data: sub, error, refresh } = await useAsyncData(`subscription-${id}`, () =>
  api<{ data: SubscriptionDetail }>(`/subscriptions/${id}`).then((res) => res.data),
)

const acting = ref<string | null>(null)
const closeOpen = ref(false)

async function act(action: string, doneMessage: string) {
  acting.value = action
  try {
    const res = await api<{ data: SubscriptionDetail }>(`/subscriptions/${id}/${action}`, { method: 'POST', body: {} })
    if (action === 'renew') {
      toast.add({ title: `Renewal ${res.data.number} created as a draft`, color: 'success' })
      return navigateTo(`/staff/subscriptions/${res.data.id}`)
    }
    if (action === 'send-quotation' && !res.data.emailSent) {
      toast.add({ title: 'Quotation saved, but the email could not be sent', color: 'warning' })
    } else {
      toast.add({ title: doneMessage, color: 'success' })
    }
    closeOpen.value = false
    await refresh()
  } catch (err) {
    toast.add({ title: 'That did not work', description: apiErrorMessage(err), color: 'error' })
  } finally {
    acting.value = null
  }
}

interface ActionButton {
  key: string
  label: string
  icon: string
  color?: 'primary' | 'neutral' | 'error'
  variant?: 'solid' | 'outline'
  run: () => void
}

const actions = computed<ActionButton[]>(() => {
  const s = sub.value
  if (!s) return []
  const list: ActionButton[] = []
  const add = (key: string, label: string, icon: string, doneMessage: string, extra: Partial<ActionButton> = {}) =>
    list.push({ key, label, icon, run: () => act(key, doneMessage), ...extra })

  if (s.status === 'DRAFT') add('send-quotation', 'Send quotation', 'i-lucide-send', 'Quotation sent to the customer')
  if (s.status === 'QUOTATION') {
    add('confirm', 'Confirm', 'i-lucide-check', 'Subscription confirmed')
    add('send-quotation', 'Resend quotation', 'i-lucide-send', 'Quotation sent again', { variant: 'outline', color: 'neutral' })
  }
  if (s.status === 'CONFIRMED') add('activate', 'Activate', 'i-lucide-play', 'Subscription is now active')
  if (s.status === 'ACTIVE' && s.plan.pausable) add('pause', 'Pause', 'i-lucide-pause', 'Subscription paused', { variant: 'outline', color: 'neutral' })
  if (s.status === 'PAUSED') add('resume', 'Resume', 'i-lucide-play', 'Subscription resumed')
  if (['ACTIVE', 'PAUSED', 'CLOSED'].includes(s.status) && s.plan.renewable) {
    add('renew', 'Renew', 'i-lucide-refresh-cw', 'Renewed', { variant: 'outline', color: 'neutral' })
  }
  if (['ACTIVE', 'PAUSED'].includes(s.status) && s.plan.closable) {
    list.push({ key: 'close', label: 'Close', icon: 'i-lucide-circle-x', color: 'error', variant: 'outline', run: () => (closeOpen.value = true) })
  }
  return list
})

const canEdit = computed(() => sub.value && ['DRAFT', 'QUOTATION'].includes(sub.value.status))

const lineColumns = [
  { accessorKey: 'description', header: 'Product' },
  { accessorKey: 'quantity', header: 'Qty' },
  { id: 'unitPrice', header: 'Unit price', accessorFn: (row: PricedLine) => formatMoney(row.unitPrice) },
  { id: 'discount', header: 'Discount', accessorFn: (row: PricedLine) => formatMoney(row.discountAmount) },
  { id: 'tax', header: 'Tax', accessorFn: (row: PricedLine) => formatMoney(row.taxAmount) },
  { id: 'amount', header: 'Amount', accessorFn: (row: PricedLine) => formatMoney(row.amount) },
]

const invoiceColumns = [
  { accessorKey: 'number', header: 'Invoice' },
  { id: 'period', header: 'Period', accessorFn: (row: SubscriptionInvoice) => `${formatDate(row.periodStart)} to ${formatDate(row.periodEnd)}` },
  { id: 'dueDate', header: 'Due', accessorFn: (row: SubscriptionInvoice) => formatDate(row.dueDate) },
  { id: 'total', header: 'Total', accessorFn: (row: SubscriptionInvoice) => formatMoney(row.total) },
  { id: 'status', header: 'Status' },
]

const openInvoice = (_event: Event, row: { original: SubscriptionInvoice }) => navigateTo(`/staff/invoices/${row.original.id}`)
</script>

<template>
  <AppPage :title="sub?.number ?? 'Subscription'">
    <template #actions>
      <UButton v-if="canEdit" :to="`/staff/subscriptions/${id}/edit`" icon="i-lucide-pencil" color="neutral" variant="outline">Edit</UButton>
      <UButton
        v-for="action in actions"
        :key="action.key + action.label"
        :icon="action.icon"
        :color="action.color ?? 'primary'"
        :variant="action.variant ?? 'solid'"
        :loading="acting === action.key"
        :disabled="acting !== null"
        @click="action.run"
      >
        {{ action.label }}
      </UButton>
    </template>

    <UAlert v-if="error" color="error" variant="subtle" title="Subscription not found" />

    <div v-else-if="sub" class="max-w-5xl space-y-6">
      <UCard>
        <dl class="grid gap-x-6 gap-y-4 text-sm sm:grid-cols-3">
          <div><dt class="text-muted">Status</dt><dd class="mt-1"><StatusBadge :status="sub.status" /></dd></div>
          <div><dt class="text-muted">Customer</dt><dd class="mt-1">{{ sub.customer.name }}<br><span class="text-muted">{{ sub.customer.email }}</span></dd></div>
          <div><dt class="text-muted">Plan</dt><dd class="mt-1">{{ sub.plan.name }} ({{ titleCase(sub.plan.billingPeriod) }})</dd></div>
          <div><dt class="text-muted">Start date</dt><dd class="mt-1">{{ formatDate(sub.startDate) }}</dd></div>
          <div><dt class="text-muted">Expiry date</dt><dd class="mt-1">{{ formatDate(sub.expiryDate) }}</dd></div>
          <div><dt class="text-muted">Next invoice</dt><dd class="mt-1">{{ formatDate(sub.nextInvoiceDate) }}</dd></div>
          <div><dt class="text-muted">Payment terms</dt><dd class="mt-1">{{ sub.paymentTermDays }} days</dd></div>
          <div v-if="sub.quotationValidUntil"><dt class="text-muted">Quotation valid until</dt><dd class="mt-1">{{ formatDate(sub.quotationValidUntil) }}</dd></div>
          <div v-if="sub.notes" class="sm:col-span-3"><dt class="text-muted">Notes</dt><dd class="mt-1">{{ sub.notes }}</dd></div>
        </dl>
      </UCard>

      <UCard>
        <template #header>
          <h2 class="font-semibold">Each {{ sub.plan.billingPeriod.toLowerCase() }} invoice</h2>
        </template>
        <UTable :data="sub.pricing.lines" :columns="lineColumns" />
        <div class="mt-4">
          <TotalsBlock
            :subtotal="sub.pricing.subtotal"
            :discount-total="sub.pricing.discountTotal"
            :tax-total="sub.pricing.taxTotal"
            :total="sub.pricing.total"
          />
        </div>
      </UCard>

      <UCard>
        <template #header><h2 class="font-semibold">Invoices</h2></template>
        <UTable :data="sub.invoices" :columns="invoiceColumns" empty="No invoices yet" @select="openInvoice">
          <template #status-cell="{ row }">
            <StatusBadge :status="row.original.status" :overdue="isOverdue(row.original)" />
          </template>
        </UTable>
      </UCard>

      <UCard>
        <template #header><h2 class="font-semibold">History</h2></template>
        <ul class="space-y-3 text-sm">
          <li v-for="entry in sub.history" :key="entry.id" class="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span class="w-40 text-muted">{{ formatDateTime(entry.createdAt) }}</span>
            <span class="flex items-center gap-2">
              <StatusBadge v-if="entry.fromStatus" :status="entry.fromStatus" />
              <UIcon v-if="entry.fromStatus" name="i-lucide-arrow-right" class="text-muted" />
              <StatusBadge :status="entry.toStatus" />
            </span>
            <span class="text-muted">by {{ entry.changedBy?.name ?? 'the system' }}</span>
            <span v-if="entry.note">- {{ entry.note }}</span>
          </li>
        </ul>
      </UCard>
    </div>

    <ConfirmDialog
      v-model:open="closeOpen"
      title="Close this subscription?"
      description="It will stop being invoiced. You can renew it later if the plan allows it."
      confirm-label="Close subscription"
      :loading="acting === 'close'"
      @confirm="act('close', 'Subscription closed')"
    />
  </AppPage>
</template>
