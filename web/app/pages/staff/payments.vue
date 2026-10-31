<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import { methodLabel, paymentMethods, type InvoiceSummary, type Paged, type Payment } from '~/types/finance'

const api = useApi()
const toast = useToast()
const auth = useAuthStore()
const isAdmin = computed(() => auth.user?.role === 'ADMIN')

const tab = ref('receivables')
const tabs = [
  { label: 'Invoices', value: 'receivables', icon: 'i-lucide-receipt' },
  { label: 'Payments received', value: 'payments', icon: 'i-lucide-wallet' },
]

// ---- shared filters ----
const search = ref('')
const debouncedSearch = ref('')
let timer: ReturnType<typeof setTimeout> | undefined
watch(search, (v) => {
  clearTimeout(timer)
  timer = setTimeout(() => (debouncedSearch.value = v.trim()), 300)
})
const from = ref('')
const to = ref('')

// ---- invoices (paid / outstanding / overdue) ----
const state = ref('outstanding')
const stateItems = [
  { label: 'Outstanding', value: 'outstanding' },
  { label: 'Overdue', value: 'overdue' },
  { label: 'Paid', value: 'paid' },
  { label: 'All', value: 'all' },
]
const invoicePage = ref(1)
const invoiceQuery = computed(() => ({
  page: invoicePage.value, pageSize: 20, state: state.value,
  search: debouncedSearch.value || undefined, from: from.value || undefined, to: to.value || undefined,
}))
const { data: invoices, status: invoicesStatus, refresh: refreshInvoices } = await useAsyncData(
  'receivables',
  () => api<Paged<InvoiceSummary, { totalAmount: string, paidAmount: string, balance: string }>>('/payments/receivables', { query: invoiceQuery.value }),
  { watch: [invoiceQuery] },
)

const stateBadge: Record<string, { label: string, color: 'success' | 'warning' | 'error' | 'neutral', icon: string }> = {
  PAID: { label: 'Paid', color: 'success', icon: 'i-lucide-check' },
  OUTSTANDING: { label: 'Outstanding', color: 'warning', icon: 'i-lucide-hourglass' },
  OVERDUE: { label: 'Overdue', color: 'error', icon: 'i-lucide-clock-alert' },
}

const invoiceColumns: TableColumn<InvoiceSummary>[] = [
  { accessorKey: 'number', header: 'Invoice' },
  { id: 'customer', header: 'Customer' },
  { accessorKey: 'issueDate', header: 'Issued' },
  { accessorKey: 'dueDate', header: 'Due' },
  { accessorKey: 'state', header: 'Status' },
  { accessorKey: 'total', header: () => h('span', { class: 'block text-right' }, 'Total') },
  { accessorKey: 'amountPaid', header: () => h('span', { class: 'block text-right' }, 'Paid') },
  { accessorKey: 'balance', header: () => h('span', { class: 'block text-right' }, 'Balance') },
  { id: 'actions', header: '' },
]

// ---- payments received ----
const method = ref('all')
const methodItems = [{ label: 'All methods', value: 'all' }, ...paymentMethods]
const paymentPage = ref(1)
const paymentQuery = computed(() => ({
  page: paymentPage.value, pageSize: 20, method: method.value === 'all' ? undefined : method.value,
  search: debouncedSearch.value || undefined, from: from.value || undefined, to: to.value || undefined,
}))
const { data: payments, status: paymentsStatus, refresh: refreshPayments } = await useAsyncData(
  'payments',
  () => api<Paged<Payment, { totalAmount: string }>>('/payments', { query: paymentQuery.value }),
  { watch: [paymentQuery] },
)
watch([debouncedSearch, from, to, state, method], () => {
  invoicePage.value = 1
  paymentPage.value = 1
})

const paymentColumns: TableColumn<Payment>[] = [
  { accessorKey: 'paidAt', header: 'Date' },
  { id: 'invoice', header: 'Invoice' },
  { id: 'customer', header: 'Customer' },
  { accessorKey: 'method', header: 'Method' },
  { accessorKey: 'note', header: 'Note' },
  { id: 'recordedBy', header: 'Recorded by' },
  { accessorKey: 'amount', header: () => h('span', { class: 'block text-right' }, 'Amount') },
  { id: 'actions', header: '' },
]

// ---- actions ----
const payOpen = ref(false)
const payInvoice = ref<InvoiceSummary | null>(null)
function openPayment(inv: InvoiceSummary | null = null) {
  payInvoice.value = inv
  payOpen.value = true
}
async function refreshAll() {
  await Promise.all([refreshInvoices(), refreshPayments()])
}

const voidTarget = ref<Payment | null>(null)
const voiding = ref(false)
async function confirmVoid() {
  if (!voidTarget.value) return
  voiding.value = true
  try {
    await api(`/payments/${voidTarget.value.id}`, { method: 'DELETE' })
    toast.add({ title: 'Payment voided', description: `Invoice ${voidTarget.value.invoice?.number} reopened for the amount.`, color: 'success' })
    voidTarget.value = null
    await refreshAll()
  } catch (err) {
    toast.add({ title: 'Could not void payment', description: apiErrorMessage(err), color: 'error' })
  } finally {
    voiding.value = false
  }
}
</script>

<template>
  <AppPage title="Payments">
    <template #actions>
      <UButton icon="i-lucide-plus" @click="openPayment()">Record payment</UButton>
    </template>

    <div class="space-y-4">
      <UTabs v-model="tab" :items="tabs" :content="false" class="w-full sm:w-auto" />

      <div class="flex flex-wrap items-end gap-3">
        <UFormField label="Search">
          <UInput v-model="search" icon="i-lucide-search" placeholder="Invoice no. or customer" class="w-64" />
        </UFormField>
        <UFormField v-if="tab === 'receivables'" label="Status">
          <USelect v-model="state" :items="stateItems" class="w-40" />
        </UFormField>
        <UFormField v-else label="Method">
          <USelect v-model="method" :items="methodItems" class="w-40" />
        </UFormField>
        <UFormField :label="tab === 'receivables' ? 'Issued from' : 'Paid from'">
          <UInput v-model="from" type="date" class="w-40" />
        </UFormField>
        <UFormField label="To">
          <UInput v-model="to" type="date" class="w-40" />
        </UFormField>
        <UButton v-if="search || from || to" color="neutral" variant="ghost" icon="i-lucide-x" @click="search = ''; from = ''; to = ''">
          Clear
        </UButton>
      </div>

      <!-- invoices -->
      <template v-if="tab === 'receivables'">
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <FinanceKpiTile label="Invoiced" icon="i-lucide-receipt" :value="formatMoney(invoices?.meta.totalAmount)" :hint="`${formatNumber(invoices?.meta.total)} invoices`" />
          <FinanceKpiTile label="Paid" icon="i-lucide-check" :value="formatMoney(invoices?.meta.paidAmount)" />
          <FinanceKpiTile label="Balance due" icon="i-lucide-hourglass" :tone="state === 'overdue' ? 'error' : 'warning'" :value="formatMoney(invoices?.meta.balance)" />
        </div>

        <UCard :ui="{ body: 'p-0 sm:p-0' }">
          <UTable :data="invoices?.data ?? []" :columns="invoiceColumns" :loading="invoicesStatus === 'pending'">
            <template #number-cell="{ row }">
              <p class="font-medium text-highlighted">{{ row.original.number }}</p>
              <p class="text-xs text-muted">{{ row.original.subscription?.number }}</p>
            </template>
            <template #customer-cell="{ row }">{{ row.original.customer?.name }}</template>
            <template #issueDate-cell="{ row }">{{ formatDate(row.original.issueDate) }}</template>
            <template #dueDate-cell="{ row }">
              {{ formatDate(row.original.dueDate) }}
              <p v-if="row.original.daysOverdue" class="text-xs text-error">{{ row.original.daysOverdue }} days late</p>
            </template>
            <template #state-cell="{ row }">
              <UBadge v-if="stateBadge[row.original.state]" v-bind="stateBadge[row.original.state]" variant="subtle" />
            </template>
            <template #total-cell="{ row }"><span class="block text-right tabular-nums">{{ formatMoney(row.original.total) }}</span></template>
            <template #amountPaid-cell="{ row }"><span class="block text-right tabular-nums">{{ formatMoney(row.original.amountPaid) }}</span></template>
            <template #balance-cell="{ row }"><span class="block text-right tabular-nums font-medium">{{ formatMoney(row.original.balance) }}</span></template>
            <template #actions-cell="{ row }">
              <div class="flex justify-end">
                <UButton v-if="row.original.status === 'CONFIRMED'" size="sm" variant="soft" icon="i-lucide-wallet" @click="openPayment(row.original)">
                  Record payment
                </UButton>
              </div>
            </template>
            <template #empty>
              <UEmpty icon="i-lucide-receipt" title="No invoices match these filters" />
            </template>
          </UTable>
          <template v-if="(invoices?.meta.pageCount ?? 0) > 1" #footer>
            <div class="flex justify-end">
              <UPagination v-model:page="invoicePage" :total="invoices?.meta.total ?? 0" :items-per-page="20" />
            </div>
          </template>
        </UCard>
      </template>

      <!-- payments -->
      <template v-else>
        <p class="text-sm text-muted">
          {{ formatNumber(payments?.meta.total) }} payments totalling
          <span class="font-medium text-highlighted">{{ formatMoney(payments?.meta.totalAmount) }}</span>
        </p>
        <UCard :ui="{ body: 'p-0 sm:p-0' }">
          <UTable :data="payments?.data ?? []" :columns="paymentColumns" :loading="paymentsStatus === 'pending'">
            <template #paidAt-cell="{ row }">{{ formatDate(row.original.paidAt) }}</template>
            <template #invoice-cell="{ row }"><span class="font-medium text-highlighted">{{ row.original.invoice?.number }}</span></template>
            <template #customer-cell="{ row }">{{ row.original.invoice?.customer.name }}</template>
            <template #method-cell="{ row }"><UBadge color="neutral" variant="subtle">{{ methodLabel(row.original.method) }}</UBadge></template>
            <template #note-cell="{ row }"><span class="text-muted text-sm">{{ row.original.note || '—' }}</span></template>
            <template #recordedBy-cell="{ row }"><span class="text-sm">{{ row.original.recordedBy?.name ?? '—' }}</span></template>
            <template #amount-cell="{ row }"><span class="block text-right tabular-nums font-medium">{{ formatMoney(row.original.amount) }}</span></template>
            <template #actions-cell="{ row }">
              <div class="flex justify-end">
                <UTooltip v-if="isAdmin" text="Void payment">
                  <UButton icon="i-lucide-undo-2" size="sm" color="error" variant="ghost" aria-label="Void payment" @click="voidTarget = row.original" />
                </UTooltip>
              </div>
            </template>
            <template #empty>
              <UEmpty icon="i-lucide-wallet" title="No payments match these filters" />
            </template>
          </UTable>
          <template v-if="(payments?.meta.pageCount ?? 0) > 1" #footer>
            <div class="flex justify-end">
              <UPagination v-model:page="paymentPage" :total="payments?.meta.total ?? 0" :items-per-page="20" />
            </div>
          </template>
        </UCard>
      </template>
    </div>

    <RecordPaymentModal v-model:open="payOpen" :invoice="payInvoice" @recorded="refreshAll" />

    <UModal :open="!!voidTarget" title="Void this payment?" @update:open="(v: boolean) => { if (!v) voidTarget = null }">
      <template #body>
        <p class="text-sm">
          {{ formatMoney(voidTarget?.amount) }} via {{ methodLabel(voidTarget?.method ?? '') }} on {{ formatDate(voidTarget?.paidAt) }}
          will be removed from invoice <strong>{{ voidTarget?.invoice?.number }}</strong>, and the invoice will show that amount as owed again.
          This is recorded in the audit log.
        </p>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2 w-full">
          <UButton color="neutral" variant="ghost" @click="voidTarget = null">Keep payment</UButton>
          <UButton color="error" :loading="voiding" @click="confirmVoid">Void payment</UButton>
        </div>
      </template>
    </UModal>
  </AppPage>
</template>
