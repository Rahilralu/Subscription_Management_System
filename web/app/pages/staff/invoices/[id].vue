<script setup lang="ts">
import type { InvoiceDetail, PricedLine } from '~/types/billing'

const api = useApi()
const toast = useToast()
const id = useRoute().params.id as string

const { data: invoice, error, refresh } = await useAsyncData(`invoice-${id}`, () =>
  api<{ data: InvoiceDetail }>(`/billing/invoices/${id}`).then((res) => res.data),
)

const acting = ref<string | null>(null)
const cancelOpen = ref(false)

async function act(action: string, doneMessage: string) {
  acting.value = action
  try {
    await api(`/billing/invoices/${id}/${action}`, { method: 'POST' })
    toast.add({ title: doneMessage, color: 'success' })
    cancelOpen.value = false
    await refresh()
  } catch (err) {
    toast.add({ title: 'That did not work', description: apiErrorMessage(err), color: 'error' })
  } finally {
    acting.value = null
  }
}

// the PDF endpoint needs the login header, so a plain link would not work
async function downloadPdf() {
  acting.value = 'pdf'
  try {
    const blob = await api<Blob>(`/billing/invoices/${id}/pdf`, { responseType: 'blob' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${invoice.value!.number.replaceAll('/', '-')}.pdf`
    link.click()
    URL.revokeObjectURL(url)
  } catch (err) {
    toast.add({ title: 'Could not download the PDF', description: apiErrorMessage(err), color: 'error' })
  } finally {
    acting.value = null
  }
}

const lineColumns = [
  { accessorKey: 'description', header: 'Description' },
  { accessorKey: 'quantity', header: 'Qty' },
  { id: 'unitPrice', header: 'Unit price', accessorFn: (row: PricedLine) => formatMoney(row.unitPrice) },
  { id: 'discount', header: 'Discount', accessorFn: (row: PricedLine) => formatMoney(row.discountAmount) },
  { id: 'tax', header: 'Tax', accessorFn: (row: PricedLine) => formatMoney(row.taxAmount) },
  { id: 'amount', header: 'Amount', accessorFn: (row: PricedLine) => formatMoney(row.amount) },
]

type Payment = InvoiceDetail['payments'][number]
const paymentColumns = [
  { id: 'paidAt', header: 'Date', accessorFn: (row: Payment) => formatDate(row.paidAt) },
  { id: 'method', header: 'Method', accessorFn: (row: Payment) => titleCase(row.method.replace('_', ' ')) },
  { id: 'amount', header: 'Amount', accessorFn: (row: Payment) => formatMoney(row.amount) },
  { accessorKey: 'note', header: 'Note' },
]
</script>

<template>
  <AppPage :title="invoice?.number ?? 'Invoice'">
    <template #actions>
      <UButton v-if="invoice" icon="i-lucide-download" color="neutral" variant="outline" :loading="acting === 'pdf'" :disabled="acting !== null" @click="downloadPdf">PDF</UButton>
      <UButton v-if="invoice?.status === 'DRAFT'" icon="i-lucide-check" :loading="acting === 'confirm'" :disabled="acting !== null" @click="act('confirm', 'Invoice confirmed')">Confirm</UButton>
      <UButton v-if="invoice?.status === 'CONFIRMED'" icon="i-lucide-mail" :loading="acting === 'send'" :disabled="acting !== null" @click="act('send', 'Invoice emailed to the customer')">
        {{ invoice.sentAt ? 'Send again' : 'Send by email' }}
      </UButton>
      <UButton v-if="invoice && ['DRAFT', 'CONFIRMED'].includes(invoice.status)" icon="i-lucide-ban" color="error" variant="outline" :disabled="acting !== null" @click="cancelOpen = true">Cancel invoice</UButton>
    </template>

    <UAlert v-if="error" color="error" variant="subtle" title="Invoice not found" />

    <div v-else-if="invoice" class="max-w-5xl space-y-6">
      <UCard>
        <dl class="grid gap-x-6 gap-y-4 text-sm sm:grid-cols-3">
          <div><dt class="text-muted">Status</dt><dd class="mt-1"><StatusBadge :status="invoice.status" :overdue="isOverdue(invoice)" /></dd></div>
          <div>
            <dt class="text-muted">Customer</dt>
            <dd class="mt-1">{{ invoice.customer.name }}<br><span class="text-muted">{{ invoice.customer.email }}</span></dd>
          </div>
          <div>
            <dt class="text-muted">Subscription</dt>
            <dd class="mt-1"><NuxtLink :to="`/staff/subscriptions/${invoice.subscription.id}`" class="text-primary">{{ invoice.subscription.number }}</NuxtLink></dd>
          </div>
          <div><dt class="text-muted">Billing period</dt><dd class="mt-1">{{ formatDate(invoice.periodStart) }} to {{ formatDate(invoice.periodEnd) }}</dd></div>
          <div><dt class="text-muted">Issue date</dt><dd class="mt-1">{{ formatDate(invoice.issueDate) }}</dd></div>
          <div><dt class="text-muted">Due date</dt><dd class="mt-1">{{ formatDate(invoice.dueDate) }}</dd></div>
          <div v-if="invoice.sentAt"><dt class="text-muted">Emailed</dt><dd class="mt-1">{{ formatDateTime(invoice.sentAt) }}</dd></div>
        </dl>
      </UCard>

      <UCard>
        <UTable :data="invoice.lines" :columns="lineColumns" />
        <div class="mt-4">
          <TotalsBlock
            :subtotal="invoice.subtotal"
            :discount-total="invoice.discountTotal"
            :tax-total="invoice.taxTotal"
            :total="invoice.total"
            :paid="invoice.amountPaid"
            :due="invoice.amountDue"
          />
        </div>
      </UCard>

      <UCard>
        <template #header><h2 class="font-semibold">Payments</h2></template>
        <UTable :data="invoice.payments" :columns="paymentColumns" empty="No payments recorded yet" />
      </UCard>
    </div>

    <ConfirmDialog
      v-model:open="cancelOpen"
      title="Cancel this invoice?"
      description="A cancelled invoice cannot be brought back, and its billing period will not be invoiced again."
      confirm-label="Cancel invoice"
      :loading="acting === 'cancel'"
      @confirm="act('cancel', 'Invoice cancelled')"
    />
  </AppPage>
</template>
