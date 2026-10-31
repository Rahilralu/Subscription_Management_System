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

const { data: invoices, status } = await useAsyncData(
  'portal-invoices',
  () => {
    const query = {
      ALL: {},
      OUTSTANDING: { status: 'CONFIRMED' },
      OVERDUE: { overdue: 'true' },
      PAID: { status: 'PAID' },
    }[filter.value]
    return api<{ data: Invoice[] }>('/portal/invoices', { query }).then((res) => res.data)
  },
  { watch: [filter], default: () => [] },
)

const outstanding = computed(() =>
  invoices.value
    .filter((i) => i.status === 'CONFIRMED')
    .reduce((sum, i) => sum + Number(i.total) - Number(i.amountPaid), 0),
)

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
    <div class="flex flex-wrap items-center justify-between gap-4 mb-4">
      <UTabs v-model="filter" :items="filterOptions" :content="false" size="sm" />
      <p v-if="filter !== 'PAID'" class="text-sm">
        Outstanding: <span class="font-semibold">{{ formatMoney(outstanding) }}</span>
      </p>
    </div>

    <UTable :data="invoices" :columns="columns" :loading="status === 'pending'">
      <template #number-cell="{ row }">
        <p class="font-medium">{{ row.original.number }}</p>
        <p class="text-xs text-muted">{{ row.original.subscription.number }}</p>
      </template>
      <template #issueDate-cell="{ row }">{{ formatDate(row.original.issueDate) }}</template>
      <template #dueDate-cell="{ row }">
        <span :class="{ 'text-error font-medium': row.original.overdue }">{{ formatDate(row.original.dueDate) }}</span>
      </template>
      <template #total-cell="{ row }">{{ formatMoney(row.original.total) }}</template>
      <template #balance-cell="{ row }">
        {{ formatMoney(Number(row.original.total) - Number(row.original.amountPaid)) }}
      </template>
      <template #status-cell="{ row }">
        <StatusBadge :status="row.original.overdue ? 'OVERDUE' : row.original.status" />
      </template>
      <template #actions-cell="{ row }">
        <UButton
          icon="i-lucide-download"
          color="neutral"
          variant="ghost"
          size="sm"
          :loading="downloading === row.original.id"
          @click="downloadPdf(row.original)"
        >
          PDF
        </UButton>
      </template>
      <template #empty>
        <p class="text-muted text-sm py-6 text-center">No invoices here.</p>
      </template>
    </UTable>
  </AppPage>
</template>
