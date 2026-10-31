<script setup lang="ts">
import { z } from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import { paymentMethods, type InvoiceSummary, type Paged } from '~/types/finance'

// Usage: <RecordPaymentModal v-model:open="open" :invoice="invoice" @recorded="refresh" />
// Leave `invoice` empty to let the user search for an outstanding invoice.
const props = defineProps<{ invoice?: InvoiceSummary | null }>()
const open = defineModel<boolean>('open', { default: false })
const emit = defineEmits<{ recorded: [invoice: InvoiceSummary] }>()

const api = useApi()
const toast = useToast()

type InvoiceOption = { label: string, description: string, invoice: InvoiceSummary }
const selected = ref<InvoiceOption | undefined>()
const searchTerm = ref('')
const options = ref<InvoiceOption[]>([])
const searching = ref(false)

const invoice = computed(() => props.invoice ?? selected.value?.invoice ?? null)
const balance = computed(() => Number(invoice.value?.balance ?? 0))

const state = reactive({ method: 'BANK_TRANSFER', amount: '', paidAt: todayIso(), note: '' })
const saving = ref(false)

const schema = computed(() => z.object({
  method: z.string().min(1, 'Choose a method'),
  amount: z.string()
    .regex(/^\d+(\.\d{1,2})?$/, 'Enter an amount with at most 2 decimals')
    .refine(v => Number(v) > 0, 'Amount must be more than 0')
    .refine(v => Number(v) <= balance.value, `Cannot be more than the balance of ${formatMoney(balance.value)}`),
  paidAt: z.string().min(1, 'Pick a date').refine(v => v <= todayIso(), 'Date cannot be in the future'),
  note: z.string().max(500).optional(),
}))

function toOption(inv: InvoiceSummary): InvoiceOption {
  return {
    label: `${inv.number} · ${inv.customer?.name ?? ''}`,
    description: `${formatMoney(inv.balance)} due${inv.state === 'OVERDUE' ? ` · ${inv.daysOverdue}d overdue` : ''}`,
    invoice: inv,
  }
}

let searchTimer: ReturnType<typeof setTimeout> | undefined
async function searchInvoices() {
  searching.value = true
  try {
    const res = await api<Paged<InvoiceSummary>>('/payments/receivables', {
      query: { state: 'outstanding', pageSize: 20, search: searchTerm.value || undefined },
    })
    options.value = res.data.map(toOption)
  } catch (err) {
    toast.add({ title: 'Could not load invoices', description: apiErrorMessage(err), color: 'error' })
  } finally {
    searching.value = false
  }
}
watch(searchTerm, () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(searchInvoices, 250)
})

watch(open, (isOpen) => {
  if (!isOpen) return
  Object.assign(state, { method: 'BANK_TRANSFER', amount: '', paidAt: todayIso(), note: '' })
  selected.value = undefined
  if (!props.invoice) searchInvoices()
})

// default the amount to the full balance once an invoice is chosen
watch(invoice, (inv) => {
  if (inv) state.amount = Number(inv.balance).toFixed(2)
}, { immediate: true })

async function onSubmit(event: FormSubmitEvent<z.output<typeof schema.value>>) {
  if (!invoice.value) return
  saving.value = true
  try {
    const res = await api<{ data: { invoice: InvoiceSummary } }>('/payments', {
      method: 'POST',
      body: { invoiceId: invoice.value.id, ...event.data, note: event.data.note || undefined },
    })
    const updated = res.data.invoice
    toast.add({
      title: updated.status === 'PAID' ? `Invoice ${updated.number} is now paid` : 'Payment recorded',
      description: updated.status === 'PAID' ? undefined : `${formatMoney(updated.balance)} still outstanding`,
      color: 'success',
    })
    emit('recorded', updated)
    open.value = false
  } catch (err) {
    toast.add({ title: 'Payment not recorded', description: apiErrorMessage(err), color: 'error' })
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <UModal v-model:open="open" title="Record payment" description="Record money received against an invoice.">
    <template #body>
      <UForm id="record-payment" :schema="schema" :state="state" class="space-y-4" @submit="onSubmit">
        <UFormField v-if="!props.invoice" label="Invoice" required>
          <USelectMenu
            v-model="selected"
            v-model:search-term="searchTerm"
            :items="options"
            :loading="searching"
            ignore-filter
            placeholder="Search by invoice number or customer"
            class="w-full"
          />
        </UFormField>

        <div v-if="invoice" class="rounded-md border border-default p-3 text-sm grid grid-cols-3 gap-2">
          <div class="col-span-3 flex items-center justify-between">
            <span class="font-medium text-highlighted">{{ invoice.number }}</span>
            <UBadge v-if="invoice.state === 'OVERDUE'" color="error" variant="subtle" icon="i-lucide-clock-alert">
              {{ invoice.daysOverdue }} days overdue
            </UBadge>
          </div>
          <div><p class="text-muted text-xs">Total</p><p class="tabular-nums">{{ formatMoney(invoice.total) }}</p></div>
          <div><p class="text-muted text-xs">Paid</p><p class="tabular-nums">{{ formatMoney(invoice.amountPaid) }}</p></div>
          <div><p class="text-muted text-xs">Balance</p><p class="font-semibold tabular-nums">{{ formatMoney(invoice.balance) }}</p></div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <UFormField label="Method" name="method" required>
            <USelect v-model="state.method" :items="paymentMethods" class="w-full" />
          </UFormField>
          <UFormField label="Payment date" name="paidAt" required>
            <UInput v-model="state.paidAt" type="date" :max="todayIso()" class="w-full" />
          </UFormField>
        </div>

        <UFormField label="Amount (₹)" name="amount" required :hint="invoice ? `Max ${formatMoney(balance)}` : undefined">
          <UInput v-model="state.amount" inputmode="decimal" placeholder="0.00" class="w-full" :disabled="!invoice" />
        </UFormField>

        <UFormField label="Note" name="note">
          <UTextarea v-model="state.note" :rows="2" placeholder="Reference number, cheque no., remarks…" class="w-full" />
        </UFormField>
      </UForm>
    </template>

    <template #footer>
      <div class="flex justify-end gap-2 w-full">
        <UButton color="neutral" variant="ghost" @click="open = false">Cancel</UButton>
        <UButton type="submit" form="record-payment" :loading="saving" :disabled="!invoice" icon="i-lucide-check">
          Record payment
        </UButton>
      </div>
    </template>
  </UModal>
</template>
