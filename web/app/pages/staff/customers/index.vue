<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { ListResponse } from '~/types/billing'
import type { CustomerRow } from '~/types/customers'

const api = useApi()
const pageSize = 20

const page = ref(1)
const searchInput = ref('')
const search = ref('')

let searchTimer: ReturnType<typeof setTimeout>
watch(searchInput, (value) => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    search.value = value.trim()
    page.value = 1
  }, 300)
})

const { data, status, refresh } = useAsyncData(
  'staff-customers',
  () =>
    api<ListResponse<CustomerRow>>('/customers', {
      query: { search: search.value || undefined, page: page.value, pageSize },
    }),
  { watch: [page, search] },
)

const columns: TableColumn<CustomerRow>[] = [
  { id: 'name', header: 'Customer' },
  { id: 'phone', header: 'Phone' },
  { accessorKey: 'activeSubscriptions', header: 'Active subscriptions' },
  { id: 'outstanding', header: 'Outstanding' },
  { id: 'hasLogin', header: 'Login' },
]

const formOpen = ref(false)

const open = (_event: Event, row: { original: CustomerRow }) => navigateTo(`/staff/customers/${row.original.id}`)
</script>

<template>
  <AppPage title="Customers">
    <template #actions>
      <UButton icon="i-lucide-plus" @click="formOpen = true">Add customer</UButton>
    </template>

    <UInput
      v-model="searchInput"
      icon="i-lucide-search"
      placeholder="Search name, email or phone"
      aria-label="Search customers"
      class="w-full sm:max-w-xs"
    />

    <UTable :data="data?.data ?? []" :columns="columns" :loading="status === 'pending'" class="mt-4" @select="open">
      <template #name-cell="{ row }">
        <div class="min-w-40">
          <p class="font-medium text-highlighted">{{ row.original.name }}</p>
          <p class="text-xs text-muted">{{ row.original.email }}</p>
        </div>
      </template>

      <template #phone-cell="{ row }">{{ row.original.phone ?? '—' }}</template>

      <template #outstanding-cell="{ row }">
        <div v-if="Number(row.original.outstanding) > 0">
          <p :class="Number(row.original.overdue) > 0 ? 'font-medium text-error' : ''">
            {{ formatMoney(row.original.outstanding) }}
          </p>
          <p v-if="Number(row.original.overdue) > 0" class="text-xs text-error">
            {{ formatMoney(row.original.overdue) }} overdue
          </p>
        </div>
        <span v-else class="text-muted">—</span>
      </template>

      <template #hasLogin-cell="{ row }">
        <UBadge
          :label="row.original.hasLogin ? 'Has login' : 'No login'"
          :color="row.original.hasLogin ? 'success' : 'neutral'"
          variant="subtle"
        />
      </template>

      <template #empty>
        <div class="py-8 text-center text-muted">
          {{ search ? `No customers match "${search}"` : 'No customers yet' }}
        </div>
      </template>
    </UTable>

    <div v-if="(data?.meta.total ?? 0) > pageSize" class="mt-4 flex justify-end">
      <UPagination v-model:page="page" :total="data?.meta.total ?? 0" :items-per-page="pageSize" />
    </div>

    <CustomerForm v-model:open="formOpen" :customer="null" @saved="refresh" />
  </AppPage>
</template>
