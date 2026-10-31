<script setup lang="ts">
import type { BillingRunResult, InvoiceRow, ListResponse } from '~/types/billing'

const api = useApi()
const toast = useToast()
const pageSize = 15

const search = ref('')
const appliedSearch = ref('')
const status = ref('ALL')
const page = ref(1)

let timer: ReturnType<typeof setTimeout>
watch(search, (value) => {
  clearTimeout(timer)
  timer = setTimeout(() => (appliedSearch.value = value.trim()), 300)
})
watch([appliedSearch, status], () => (page.value = 1))

const statusItems = [
  { label: 'All statuses', value: 'ALL' },
  { label: 'Draft', value: 'DRAFT' },
  { label: 'Confirmed', value: 'CONFIRMED' },
  { label: 'Overdue', value: 'OVERDUE' },
  { label: 'Paid', value: 'PAID' },
  { label: 'Cancelled', value: 'CANCELLED' },
]

const query = computed(() => ({
  status: ['ALL', 'OVERDUE'].includes(status.value) ? undefined : status.value,
  overdue: status.value === 'OVERDUE' ? 'true' : undefined,
  search: appliedSearch.value || undefined,
  page: page.value,
  pageSize,
}))

const { data, status: loadState, refresh } = await useLazyAsyncData(
  'staff-invoices',
  () => api<ListResponse<InvoiceRow>>('/billing/invoices', { query: query.value }),
  { watch: [query] },
)

const columns = [
  { accessorKey: 'number', header: 'Invoice' },
  { id: 'customer', header: 'Customer', accessorFn: (row: InvoiceRow) => row.customer.name },
  { id: 'subscription', header: 'Subscription', accessorFn: (row: InvoiceRow) => row.subscription.number },
  { id: 'period', header: 'Period', accessorFn: (row: InvoiceRow) => `${formatDate(row.periodStart)} to ${formatDate(row.periodEnd)}` },
  { id: 'dueDate', header: 'Due', accessorFn: (row: InvoiceRow) => formatDate(row.dueDate) },
  { id: 'total', header: 'Total', accessorFn: (row: InvoiceRow) => formatMoney(row.total) },
  { id: 'amountDue', header: 'Amount due', accessorFn: (row: InvoiceRow) => formatMoney(row.amountDue) },
  { id: 'status', header: 'Status' },
]

const open = (_event: Event, row: { original: InvoiceRow }) => navigateTo(`/staff/invoices/${row.original.id}`)

/* run billing */
const runOpen = ref(false)
const running = ref(false)
const runDate = ref('')
const result = ref<BillingRunResult | null>(null)

watch(runOpen, (isOpen) => {
  if (isOpen) {
    result.value = null
    runDate.value = ''
  }
})

async function runBilling() {
  running.value = true
  try {
    const res = await api<{ data: BillingRunResult }>('/billing/run', {
      method: 'POST',
      body: runDate.value ? { date: runDate.value } : {},
    })
    result.value = res.data
    await refresh()
  } catch (err) {
    toast.add({ title: 'Billing run failed', description: apiErrorMessage(err), color: 'error' })
  } finally {
    running.value = false
  }
}
</script>

<template>
  <AppPage title="Invoices">
    <template #actions>
      <UButton icon="i-lucide-play" @click="runOpen = true">Run billing</UButton>
    </template>

    <div class="space-y-4">
      <div class="flex flex-wrap gap-3">
        <UInput v-model="search" icon="i-lucide-search" placeholder="Search number or customer" class="w-72" />
        <USelect v-model="status" :items="statusItems" class="w-44" />
      </div>

      <UTable :data="data?.data ?? []" :columns="columns" :loading="loadState === 'pending'" empty="No invoices found" @select="open">
        <template #status-cell="{ row }">
          <StatusBadge :status="row.original.status" :overdue="isOverdue(row.original)" />
        </template>
      </UTable>

      <div v-if="data && data.meta.total > pageSize" class="flex justify-end">
        <UPagination v-model:page="page" :total="data.meta.total" :items-per-page="pageSize" />
      </div>
    </div>

    <UModal
      v-model:open="runOpen"
      title="Run billing"
      description="Creates a draft invoice for every active subscription that is due. Running it twice never bills the same period twice."
    >
      <template #body>
        <div v-if="!result">
          <UFormField label="Bill as of" help="Leave empty for today. A later date creates the invoices that would be due by then.">
            <UInput v-model="runDate" type="date" class="w-full" />
          </UFormField>
        </div>

        <div v-else class="space-y-3 text-sm">
          <p class="font-medium">
            {{ result.invoices.length }} invoice{{ result.invoices.length === 1 ? '' : 's' }} created
            from {{ result.checked }} due subscription{{ result.checked === 1 ? '' : 's' }}.
          </p>
          <ul v-if="result.invoices.length" class="space-y-1">
            <li v-for="invoice in result.invoices" :key="invoice.id">
              <NuxtLink :to="`/staff/invoices/${invoice.id}`" class="text-primary">{{ invoice.number }}</NuxtLink>
              for {{ invoice.subscriptionNumber }} - {{ formatMoney(invoice.total) }}
            </li>
          </ul>
          <p v-if="result.closed.length" class="text-muted">Closed at expiry: {{ result.closed.join(', ') }}</p>
          <UAlert
            v-for="error in result.errors"
            :key="error.subscriptionId"
            color="error"
            variant="subtle"
            :title="`${error.number} was skipped`"
            :description="error.message"
          />
        </div>
      </template>

      <template #footer>
        <div class="flex w-full justify-end gap-2">
          <UButton color="neutral" variant="outline" @click="runOpen = false">{{ result ? 'Done' : 'Cancel' }}</UButton>
          <UButton v-if="!result" :loading="running" @click="runBilling">Run billing</UButton>
        </div>
      </template>
    </UModal>
  </AppPage>
</template>
