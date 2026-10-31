<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { Paged } from '~/types/finance'

interface AuditEntry {
  id: number
  action: string
  entity: string
  entityId: number | null
  data: Record<string, unknown> | null
  createdAt: string
  user: { id: number, name: string, role: string } | null
}

const api = useApi()
const page = ref(1)
const action = ref('all')
const from = ref('')
const to = ref('')
watch([action, from, to], () => (page.value = 1))

const query = computed(() => ({
  page: page.value, pageSize: 25,
  action: action.value === 'all' ? undefined : action.value,
  from: from.value || undefined, to: to.value || undefined,
}))
const { data, status } = await useAsyncData(
  'audit-log',
  () => api<Paged<AuditEntry, { actions: string[] }>>('/dashboard/audit', { query: query.value }),
  { watch: [query] },
)

// keep the action list from the first load so filtering doesn't shrink it
const knownActions = ref<string[]>([])
watch(data, (d) => {
  if (d && d.meta.actions.length > knownActions.value.length) knownActions.value = d.meta.actions
}, { immediate: true })
const actionItems = computed(() => [{ label: 'All actions', value: 'all' }, ...knownActions.value.map(a => ({ label: a, value: a }))])

const columns: TableColumn<AuditEntry>[] = [
  { accessorKey: 'createdAt', header: 'When' },
  { id: 'user', header: 'Who' },
  { accessorKey: 'action', header: 'Action' },
  { id: 'target', header: 'Record' },
  { id: 'details', header: 'Details' },
]

function details(entry: AuditEntry) {
  if (!entry.data) return ''
  return Object.entries(entry.data)
    .filter(([, v]) => v !== null && typeof v !== 'object')
    .map(([k, v]) => `${k}: ${v}`)
    .join(' · ')
}
</script>

<template>
  <AppPage title="Audit log">
    <div class="space-y-4">
      <div class="flex flex-wrap items-end gap-3">
        <UFormField label="Action">
          <USelect v-model="action" :items="actionItems" class="w-56" />
        </UFormField>
        <UFormField label="From">
          <UInput v-model="from" type="date" class="w-40" />
        </UFormField>
        <UFormField label="To">
          <UInput v-model="to" type="date" class="w-40" />
        </UFormField>
      </div>

      <UCard :ui="{ body: 'p-0 sm:p-0' }">
        <UTable :data="data?.data ?? []" :columns="columns" :loading="status === 'pending'">
          <template #createdAt-cell="{ row }"><span class="whitespace-nowrap text-sm">{{ formatDateTime(row.original.createdAt) }}</span></template>
          <template #user-cell="{ row }">
            <span v-if="row.original.user">{{ row.original.user.name }} <span class="text-xs text-muted">({{ row.original.user.role.toLowerCase() }})</span></span>
            <span v-else class="text-muted">System</span>
          </template>
          <template #action-cell="{ row }"><UBadge color="neutral" variant="subtle">{{ row.original.action }}</UBadge></template>
          <template #target-cell="{ row }">{{ row.original.entity }}<span v-if="row.original.entityId" class="text-muted"> #{{ row.original.entityId }}</span></template>
          <template #details-cell="{ row }"><span class="text-sm text-muted line-clamp-2 max-w-xl">{{ details(row.original) }}</span></template>
          <template #empty>
            <UEmpty icon="i-lucide-scroll-text" title="No activity recorded yet" />
          </template>
        </UTable>
        <template v-if="(data?.meta.pageCount ?? 0) > 1" #footer>
          <div class="flex justify-end">
            <UPagination v-model:page="page" :total="data?.meta.total ?? 0" :items-per-page="25" />
          </div>
        </template>
      </UCard>
    </div>
  </AppPage>
</template>
