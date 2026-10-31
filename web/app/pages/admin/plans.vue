<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { PlanRecord } from '~/types/catalog'

const { items, status, refresh, showArchived, archiveTarget, archiveOpen, archiving, askArchive, confirmArchive, restore }
  = useCatalogList<PlanRecord>({ resource: 'plans', label: 'plan', restoreBody: (plan) => planBody(planToInput(plan)) })

const columns: TableColumn<PlanRecord>[] = [
  { accessorKey: 'name', header: 'Name' },
  { accessorKey: 'price', header: 'Price' },
  { accessorKey: 'minQuantity', header: 'Min qty' },
  { id: 'availability', header: 'Available' },
  { id: 'rules', header: 'Rules' },
  { id: 'subscriptions', header: 'Subscriptions' },
  { id: 'actions', header: '' },
]

const ruleLabels = [
  { key: 'renewable', label: 'Renewable' },
  { key: 'pausable', label: 'Pausable' },
  { key: 'closable', label: 'Closable' },
  { key: 'autoClose', label: 'Auto-close' },
] as const

const formOpen = ref(false)
const editing = ref<PlanRecord | null>(null)

function openForm(plan: PlanRecord | null) {
  editing.value = plan
  formOpen.value = true
}
</script>

<template>
  <AppPage title="Plans">
    <template #actions>
      <UButton icon="i-lucide-plus" @click="openForm(null)">Add plan</UButton>
    </template>

    <div class="flex justify-end">
      <USwitch v-model="showArchived" label="Show archived" />
    </div>

    <UTable :data="items" :columns="columns" :loading="status === 'pending'" class="mt-4">
      <template #name-cell="{ row }">
        <span class="font-medium text-highlighted">{{ row.original.name }}</span>
      </template>

      <template #price-cell="{ row }">
        {{ formatMoney(row.original.price) }}
        <span class="text-muted">/ {{ titleCase(row.original.billingPeriod) }}</span>
      </template>

      <template #availability-cell="{ row }">
        {{ formatDate(row.original.startDate) }}
        <span class="text-muted">to</span>
        {{ row.original.endDate ? formatDate(row.original.endDate) : 'no end' }}
      </template>

      <template #rules-cell="{ row }">
        <div class="flex flex-wrap gap-1">
          <template v-for="rule in ruleLabels" :key="rule.key">
            <UBadge v-if="row.original[rule.key]" :label="rule.label" color="neutral" variant="subtle" />
          </template>
        </div>
      </template>

      <template #subscriptions-cell="{ row }">{{ row.original._count?.subscriptions ?? 0 }}</template>

      <template #actions-cell="{ row }">
        <div class="flex justify-end gap-1">
          <template v-if="row.original.active">
            <UButton icon="i-lucide-pencil" color="neutral" variant="ghost" aria-label="Edit plan" @click="openForm(row.original)" />
            <UButton icon="i-lucide-archive" color="error" variant="ghost" aria-label="Archive plan" @click="askArchive(row.original)" />
          </template>
          <UButton v-else icon="i-lucide-rotate-ccw" size="sm" variant="soft" @click="restore(row.original)">Restore</UButton>
        </div>
      </template>

      <template #empty>
        <div class="py-8 text-center text-muted">{{ showArchived ? 'No archived plans' : 'No plans yet' }}</div>
      </template>
    </UTable>

    <PlanForm v-model:open="formOpen" :plan="editing" @saved="refresh" />

    <ConfirmDialog
      v-model:open="archiveOpen"
      title="Archive plan"
      :description="`${archiveTarget?.name} can no longer be chosen for new subscriptions. Existing subscriptions keep working.`"
      confirm-label="Archive"
      :loading="archiving"
      @confirm="confirmArchive"
    />
  </AppPage>
</template>
