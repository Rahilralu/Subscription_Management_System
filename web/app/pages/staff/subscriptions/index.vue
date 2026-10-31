<script setup lang="ts">
import type { ListResponse, SubscriptionRow } from '~/types/billing'

const api = useApi()
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
  ...['DRAFT', 'QUOTATION', 'CONFIRMED', 'ACTIVE', 'PAUSED', 'CLOSED'].map((s) => ({ label: titleCase(s), value: s })),
]

const query = computed(() => ({
  status: status.value === 'ALL' ? undefined : status.value,
  search: appliedSearch.value || undefined,
  page: page.value,
  pageSize,
}))

const { data, status: loadState } = await useLazyAsyncData(
  'staff-subscriptions',
  () => api<ListResponse<SubscriptionRow>>('/subscriptions', { query: query.value }),
  { watch: [query] },
)

const columns = [
  { id: 'number', header: 'Number', accessorKey: 'number' },
  { id: 'customer', header: 'Customer', accessorFn: (row: SubscriptionRow) => row.customer.name },
  { id: 'plan', header: 'Plan', accessorFn: (row: SubscriptionRow) => row.plan.name },
  { id: 'status', header: 'Status' },
  { id: 'startDate', header: 'Start date', accessorFn: (row: SubscriptionRow) => formatDate(row.startDate) },
  { id: 'nextInvoiceDate', header: 'Next invoice', accessorFn: (row: SubscriptionRow) => formatDate(row.nextInvoiceDate) },
]

const open = (_event: Event, row: { original: SubscriptionRow }) => navigateTo(`/staff/subscriptions/${row.original.id}`)
</script>

<template>
  <AppPage title="Subscriptions">
    <template #actions>
      <UButton to="/staff/subscriptions/new" icon="i-lucide-plus">New subscription</UButton>
    </template>

    <div class="space-y-4">
      <div class="flex flex-wrap gap-3">
        <UInput v-model="search" icon="i-lucide-search" placeholder="Search number or customer" class="w-72" />
        <USelect v-model="status" :items="statusItems" class="w-44" />
      </div>

      <UTable
        :data="data?.data ?? []"
        :columns="columns"
        :loading="loadState === 'pending'"
        empty="No subscriptions found"
        @select="open"
      >
        <template #status-cell="{ row }">
          <StatusBadge :status="row.original.status" />
        </template>
      </UTable>

      <div v-if="data && data.meta.total > pageSize" class="flex justify-end">
        <UPagination v-model:page="page" :total="data.meta.total" :items-per-page="pageSize" />
      </div>
    </div>
  </AppPage>
</template>
