<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'

interface Invoice {
  id: number
  number: string
  status: string
  issueDate: string
  dueDate: string
  total: string
  amountPaid: string
  overdue: boolean
  subscription: { id: number, number: string }
}

const api = useApi()
const toast = useToast()

const filter = ref<'ALL' | 'OUTSTANDING' | 'OVERDUE' | 'PAID'>('ALL')
const filterOptions = [
  { label: 'All', value: 'ALL' },
  { label: 'Outstanding', value: 'OUTSTANDING' },
  { label: 'Overdue', value: 'OVERDUE' },
  { label: 'Paid', value: 'PAID' },
]

// a customer has few invoices, so fetch them all once and filter in the page
const { data: all, status, refresh } = await useAsyncData(
  'portal-invoices',
  () => api<{ data: Invoice[] }>('/portal/invoices').then((res) => res.data),
  { default: () => [] },
)

const invoices = computed(() => {
  if (filter.value === 'OUTSTANDING') return all.value.filter((i) => i.status === 'CONFIRMED')
  if (filter.value === 'OVERDUE') return all.value.filter((i) => i.overdue)
  if (filter.value === 'PAID') return all.value.filter((i) => i.status === 'PAID')
  return all.value
})

const balance = (i: Invoice) => Number(i.total) - Number(i.amountPaid)
const outstanding = computed(() => all.value.filter((i) => i.status === 'CONFIRMED').reduce((sum, i) => sum + balance(i), 0))
const overdue = computed(() => all.value.filter((i) => i.overdue))
const overdueAmount = computed(() => overdue.value.reduce((sum, i) => sum + balance(i), 0))
const paidCount = computed(() => all.value.filter((i) => i.status === 'PAID').length)
const paidTotal = computed(() => all.value.reduce((sum, i) => sum + Number(i.amountPaid), 0))

const columns: TableColumn<Invoice>[] = [
  { accessorKey: 'number', header: 'Invoice' },
  { accessorKey: 'issueDate', header: 'Issued' },
  { accessorKey: 'dueDate', header: 'Due' },
  { accessorKey: 'total', header: 'Total' },
  { id: 'balance', header: 'Balance' },
  { accessorKey: 'status', header: 'Status' },
  { id: 'actions', header: '' },
]

const downloading = ref<number | null>(null)

const { gateway, payingId, pay } = useOnlinePayment()
const canPay = (i: Invoice) => gateway.value !== null && i.status === 'CONFIRMED' && balance(i) > 0
const demoInvoice = ref<Invoice | null>(null)

async function startPayment(invoice: Invoice) {
  if (gateway.value === 'demo' && demoInvoice.value?.id !== invoice.id) {
    demoInvoice.value = invoice // ask first: this is a simulated payment
    return
  }
  demoInvoice.value = null
  try {
    const paid = await pay(invoice.id)
    if (!paid) return // customer closed the Razorpay window
    toast.add({ title: `${invoice.number} paid`, description: 'Thank you! Your payment has been recorded.', color: 'success' })
    await refresh()
  } catch (err) {
    toast.add({ title: 'Payment did not go through', description: err instanceof Error && !('data' in err) ? err.message : apiErrorMessage(err), color: 'error' })
    await refresh()
  }
}

// fetched through useApi so the bearer token goes along, then saved from a blob URL
async function downloadPdf(invoice: Invoice) {
  downloading.value = invoice.id
  try {
    const blob = await api<Blob>(`/portal/invoices/${invoice.id}/pdf`, { responseType: 'blob' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${invoice.number.replaceAll('/', '-')}.pdf`
    link.click()
    URL.revokeObjectURL(url)
  } catch (err) {
    // with responseType blob the error body is a Blob too, so read it before showing the message
    const data = (err as { data?: unknown }).data
    const message = data instanceof Blob ? JSON.parse(await data.text())?.error?.message : apiErrorMessage(err)
    toast.add({ title: 'Could not download PDF', description: message ?? 'Something went wrong', color: 'error' })
  } finally {
    downloading.value = null
  }
}
</script>

<template>
  <AppPage title="My invoices">
    <div class="grid gap-4 sm:grid-cols-3">
      <StatTile label="Outstanding" icon="i-lucide-hourglass" :tone="outstanding ? 'warning' : 'success'" :loading="status === 'pending'" :value="formatMoney(outstanding)" :hint="outstanding ? 'Across unpaid invoices' : 'You are all paid up'" />
      <StatTile label="Overdue" :icon="overdue.length ? 'i-lucide-clock-alert' : 'i-lucide-circle-check'" :tone="overdue.length ? 'error' : 'success'" :loading="status === 'pending'" :value="formatMoney(overdueAmount)" :hint="overdue.length ? `${overdue.length} invoice${overdue.length === 1 ? '' : 's'} past due` : 'Nothing overdue'" />
      <StatTile label="Paid to date" icon="i-lucide-wallet" tone="success" :loading="status === 'pending'" :value="formatMoney(paidTotal)" :hint="`${paidCount} ${paidCount === 1 ? 'invoice' : 'invoices'} settled`" />
    </div>

    <UTabs v-model="filter" :items="filterOptions" :content="false" size="sm" class="w-fit" />

    <UTable :data="invoices" :columns="columns" :loading="status === 'pending'">
      <template #number-cell="{ row }">
        <p class="font-medium text-highlighted">{{ row.original.number }}</p>
        <p class="font-mono text-xs text-muted">{{ row.original.subscription.number }}</p>
      </template>
      <template #issueDate-cell="{ row }">{{ formatDate(row.original.issueDate) }}</template>
      <template #dueDate-cell="{ row }">
        <span :class="{ 'font-medium text-error': row.original.overdue }">{{ formatDate(row.original.dueDate) }}</span>
      </template>
      <template #total-cell="{ row }"><span class="tabular-nums">{{ formatMoney(row.original.total) }}</span></template>
      <template #balance-cell="{ row }"><span class="tabular-nums">{{ formatMoney(balance(row.original)) }}</span></template>
      <template #status-cell="{ row }">
        <StatusBadge :status="row.original.status" :overdue="row.original.overdue" />
      </template>
      <template #actions-cell="{ row }">
        <div class="flex justify-end gap-1">
          <UButton
            v-if="canPay(row.original)"
            icon="i-lucide-credit-card"
            size="sm"
            :loading="payingId === row.original.id"
            :disabled="payingId !== null"
            @click="startPayment(row.original)"
          >
            Pay now
          </UButton>
          <UButton icon="i-lucide-download" color="neutral" variant="ghost" size="sm" :loading="downloading === row.original.id" @click="downloadPdf(row.original)">
            PDF
          </UButton>
        </div>
      </template>
      <template #empty>
        <p class="py-8 text-center text-sm text-muted">No invoices here.</p>
      </template>
    </UTable>

    <UModal
      :open="demoInvoice !== null"
      title="Demo payment"
      :description="demoInvoice ? `Pay ${formatMoney(balance(demoInvoice))} for ${demoInvoice.number}` : ''"
      @update:open="(open: boolean) => { if (!open) demoInvoice = null }"
    >
      <template #body>
        <UAlert icon="i-lucide-flask-conical" color="warning" variant="subtle" title="This is a simulated payment" description="No real money moves. The invoice is marked as paid, just as it would be after a real online payment." />
      </template>
      <template #footer>
        <div class="flex w-full justify-end gap-2">
          <UButton color="neutral" variant="ghost" @click="demoInvoice = null">Cancel</UButton>
          <UButton icon="i-lucide-credit-card" :loading="payingId !== null" @click="demoInvoice && startPayment(demoInvoice)">
            Pay {{ demoInvoice ? formatMoney(balance(demoInvoice)) : '' }}
          </UButton>
        </div>
      </template>
    </UModal>
  </AppPage>
</template>
