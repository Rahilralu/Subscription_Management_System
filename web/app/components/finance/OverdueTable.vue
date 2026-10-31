<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { InvoiceSummary, Paged } from '~/types/finance'

const props = defineProps<{ planId?: number, customerId?: number }>()
const emit = defineEmits<{ changed: [] }>()

const api = useApi()
const toast = useToast()
const page = ref(1)
const pageSize = 10

const { data, status, refresh } = await useAsyncData(
  'dashboard-overdue',
  () => api<Paged<InvoiceSummary, { balance: string }>>('/dashboard/overdue', {
    query: { page: page.value, pageSize, planId: props.planId, customerId: props.customerId },
  }),
  { watch: [page, () => props.planId, () => props.customerId] },
)
watch(() => [props.planId, props.customerId], () => (page.value = 1))

const columns: TableColumn<InvoiceSummary>[] = [
  { accessorKey: 'number', header: 'Invoice' },
  { id: 'customer', header: 'Customer' },
  { accessorKey: 'dueDate', header: 'Due' },
  { accessorKey: 'daysOverdue', header: 'Overdue by' },
  { accessorKey: 'balance', header: () => h('span', { class: 'block text-right' }, 'Balance') },
  { id: 'reminders', header: 'Reminders' },
  { id: 'actions', header: '' },
]

const severity = (days: number) => (days > 60 ? 'error' : days > 30 ? 'warning' : 'neutral')

const reminding = ref<number | null>(null)
async function remind(inv: InvoiceSummary) {
  reminding.value = inv.id
  try {
    const res = await api<{ data: { to: string } }>(`/payments/invoices/${inv.id}/remind`, { method: 'POST' })
    toast.add({ title: 'Reminder sent', description: `Emailed ${res.data.to} about ${inv.number}`, color: 'success' })
    await refresh()
  } catch (err) {
    toast.add({ title: 'Reminder failed', description: apiErrorMessage(err), color: 'error' })
  } finally {
    reminding.value = null
  }
}

const runningAll = ref(false)
async function remindAll() {
  runningAll.value = true
  try {
    const res = await api<{ data: { sent: number, failed: number } }>('/payments/reminders/run', { method: 'POST' })
    toast.add({
      title: res.data.sent ? `${res.data.sent} reminder${res.data.sent === 1 ? '' : 's'} sent` : 'No reminders due',
      description: res.data.failed ? `${res.data.failed} failed to send` : 'Invoices reminded recently are skipped.',
      color: res.data.failed ? 'warning' : 'success',
    })
    await refresh()
  } catch (err) {
    toast.add({ title: 'Reminder run failed', description: apiErrorMessage(err), color: 'error' })
  } finally {
    runningAll.value = false
  }
}

const payOpen = ref(false)
const payInvoice = ref<InvoiceSummary | null>(null)
function pay(inv: InvoiceSummary) {
  payInvoice.value = inv
  payOpen.value = true
}
async function onRecorded() {
  await refresh()
  emit('changed')
}
</script>

<template>
  <UCard :ui="{ body: 'p-0 sm:p-0' }">
    <template #header>
      <div class="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 class="font-semibold text-highlighted">Overdue invoices</h3>
          <p class="text-sm text-muted">
            {{ formatNumber(data?.meta.total) }} invoices · {{ formatMoney(data?.meta.balance) }} to collect
          </p>
        </div>
        <UButton icon="i-lucide-mail" color="neutral" variant="outline" :loading="runningAll" @click="remindAll">
          Send due reminders
        </UButton>
      </div>
    </template>

    <UTable :data="data?.data ?? []" :columns="columns" :loading="status === 'pending'" class="w-full">
      <template #number-cell="{ row }">
        <span class="font-medium text-highlighted">{{ row.original.number }}</span>
      </template>
      <template #customer-cell="{ row }">
        <div class="min-w-0">
          <p class="truncate">{{ row.original.customer?.name }}</p>
          <p class="text-xs text-muted truncate">{{ row.original.customer?.email }}</p>
        </div>
      </template>
      <template #dueDate-cell="{ row }">{{ formatDate(row.original.dueDate) }}</template>
      <template #daysOverdue-cell="{ row }">
        <UBadge :color="severity(row.original.daysOverdue)" variant="subtle">{{ row.original.daysOverdue }} days</UBadge>
      </template>
      <template #balance-cell="{ row }">
        <span class="block text-right tabular-nums font-medium">{{ formatMoney(row.original.balance) }}</span>
      </template>
      <template #reminders-cell="{ row }">
        <span v-if="row.original.reminderCount" class="text-sm">
          {{ row.original.reminderCount }}× <span class="text-muted">· {{ formatDate(row.original.lastReminderAt) }}</span>
        </span>
        <span v-else class="text-muted text-sm">None yet</span>
      </template>
      <template #actions-cell="{ row }">
        <div class="flex justify-end gap-1">
          <UTooltip text="Email a reminder">
            <UButton icon="i-lucide-send" size="sm" color="neutral" variant="ghost" :loading="reminding === row.original.id" aria-label="Send reminder" @click="remind(row.original)" />
          </UTooltip>
          <UButton icon="i-lucide-wallet" size="sm" variant="soft" @click="pay(row.original)">Record payment</UButton>
        </div>
      </template>
      <template #empty>
        <UEmpty icon="i-lucide-party-popper" title="Nothing overdue" description="Every confirmed invoice is within its payment terms." />
      </template>
    </UTable>

    <template v-if="(data?.meta.pageCount ?? 0) > 1" #footer>
      <div class="flex justify-end">
        <UPagination v-model:page="page" :total="data?.meta.total ?? 0" :items-per-page="pageSize" />
      </div>
    </template>
  </UCard>

  <RecordPaymentModal v-model:open="payOpen" :invoice="payInvoice" @recorded="onRecorded" />
</template>
