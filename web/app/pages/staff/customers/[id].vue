<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { CustomerDetail, CustomerInvoice, CustomerSubscription } from '~/types/customers'

const api = useApi()
const id = useRoute().params.id as string

const { data: customer, error, refresh } = await useAsyncData(`customer-${id}`, () =>
  api<{ data: CustomerDetail }>(`/customers/${id}`).then((res) => res.data),
)

const formOpen = ref(false)

const subscriptionColumns: TableColumn<CustomerSubscription>[] = [
  { accessorKey: 'number', header: 'Subscription' },
  { id: 'plan', header: 'Plan', accessorFn: (row) => row.plan.name },
  { id: 'status', header: 'Status' },
  { id: 'nextInvoiceDate', header: 'Next invoice', accessorFn: (row) => formatDate(row.nextInvoiceDate) },
]

const invoiceColumns: TableColumn<CustomerInvoice>[] = [
  { accessorKey: 'number', header: 'Invoice' },
  { id: 'status', header: 'Status' },
  { id: 'dueDate', header: 'Due', accessorFn: (row) => formatDate(row.dueDate) },
  { id: 'total', header: 'Total', accessorFn: (row) => formatMoney(row.total) },
  { id: 'amountDue', header: 'Amount due', accessorFn: (row) => formatMoney(Number(row.total) - Number(row.amountPaid)) },
]

const openSubscription = (_event: Event, row: { original: CustomerSubscription }) =>
  navigateTo(`/staff/subscriptions/${row.original.id}`)
const openInvoice = (_event: Event, row: { original: CustomerInvoice }) => navigateTo(`/staff/invoices/${row.original.id}`)
</script>

<template>
  <AppPage :title="customer?.name ?? 'Customer'">
    <template #actions>
      <UButton to="/staff/customers" color="neutral" variant="ghost" icon="i-lucide-arrow-left">Back</UButton>
      <UButton v-if="customer" color="neutral" variant="outline" icon="i-lucide-pencil" @click="formOpen = true">Edit</UButton>
      <UButton v-if="customer" :to="`/staff/subscriptions/new?customerId=${customer.id}`" icon="i-lucide-plus">
        New subscription
      </UButton>
    </template>

    <UAlert v-if="error" color="error" variant="subtle" title="Customer not found" />

    <div v-else-if="customer" class="max-w-5xl space-y-6">
      <UCard>
        <dl class="grid gap-x-6 gap-y-4 text-sm sm:grid-cols-3">
          <div><dt class="text-muted">Email</dt><dd class="mt-1">{{ customer.email }}</dd></div>
          <div><dt class="text-muted">Phone</dt><dd class="mt-1">{{ customer.phone ?? '—' }}</dd></div>
          <div>
            <dt class="text-muted">Login</dt>
            <dd class="mt-1">
              <UBadge
                :label="customer.hasLogin ? 'Has login' : 'No login'"
                :color="customer.hasLogin ? 'success' : 'neutral'"
                variant="subtle"
              />
            </dd>
          </div>
          <div class="sm:col-span-2"><dt class="text-muted">Address</dt><dd class="mt-1">{{ customer.address ?? '—' }}</dd></div>
          <div><dt class="text-muted">Customer since</dt><dd class="mt-1">{{ formatDate(customer.createdAt) }}</dd></div>
        </dl>
      </UCard>

      <div class="grid gap-4 sm:grid-cols-2">
        <StatTile label="Outstanding" :value="formatMoney(customer.outstanding)" icon="i-lucide-wallet" hint="Confirmed invoices not yet paid" />
        <StatTile
          label="Overdue"
          :value="formatMoney(customer.overdue)"
          icon="i-lucide-triangle-alert"
          :tone="Number(customer.overdue) > 0 ? 'error' : 'success'"
          :hint="Number(customer.overdue) > 0 ? 'Past the due date' : 'Nothing is overdue'"
        />
      </div>

      <UCard>
        <template #header><h2 class="font-semibold">Subscriptions</h2></template>
        <UTable :data="customer.subscriptions" :columns="subscriptionColumns" empty="No subscriptions yet" @select="openSubscription">
          <template #status-cell="{ row }"><StatusBadge :status="row.original.status" /></template>
        </UTable>
      </UCard>

      <UCard>
        <template #header><h2 class="font-semibold">Invoices</h2></template>
        <UTable :data="customer.invoices" :columns="invoiceColumns" empty="No invoices yet" @select="openInvoice">
          <template #status-cell="{ row }">
            <StatusBadge :status="row.original.status" :overdue="row.original.overdue" />
          </template>
        </UTable>
      </UCard>
    </div>

    <CustomerForm v-model:open="formOpen" :customer="customer" @saved="refresh" />
  </AppPage>
</template>
