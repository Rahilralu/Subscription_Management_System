<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { TaxRecord } from '~/types/catalog'

const { items, status, refresh, showArchived, archiveTarget, archiveOpen, archiving, askArchive, confirmArchive, restore }
  = useCatalogList<TaxRecord>({ resource: 'taxes', label: 'tax', restoreBody: taxToInput })

const columns: TableColumn<TaxRecord>[] = [
  { accessorKey: 'name', header: 'Name' },
  { accessorKey: 'type', header: 'Type' },
  { accessorKey: 'rate', header: 'Rate' },
  { id: 'products', header: 'Products' },
  { id: 'actions', header: '' },
]

const formOpen = ref(false)
const editing = ref<TaxRecord | null>(null)

function openForm(tax: TaxRecord | null) {
  editing.value = tax
  formOpen.value = true
}
</script>

<template>
  <AppPage title="Taxes">
    <template #actions>
      <UButton icon="i-lucide-plus" @click="openForm(null)">Add tax</UButton>
    </template>

    <div class="flex justify-end">
      <USwitch v-model="showArchived" label="Show archived" />
    </div>

    <UTable :data="items" :columns="columns" :loading="status === 'pending'" class="mt-4">
      <template #name-cell="{ row }">
        <span class="font-medium text-highlighted">{{ row.original.name }}</span>
      </template>

      <template #type-cell="{ row }">
        <UBadge :label="row.original.type === 'PERCENT' ? 'Percent' : 'Fixed per unit'" color="neutral" variant="subtle" />
      </template>

      <template #rate-cell="{ row }">{{ formatAmount(row.original.type, row.original.rate) }}</template>
      <template #products-cell="{ row }">{{ row.original._count.products }}</template>

      <template #actions-cell="{ row }">
        <div class="flex justify-end gap-1">
          <template v-if="row.original.active">
            <UButton icon="i-lucide-pencil" color="neutral" variant="ghost" aria-label="Edit tax" @click="openForm(row.original)" />
            <UButton icon="i-lucide-archive" color="error" variant="ghost" aria-label="Archive tax" @click="askArchive(row.original)" />
          </template>
          <UButton v-else icon="i-lucide-rotate-ccw" size="sm" variant="soft" @click="restore(row.original)">Restore</UButton>
        </div>
      </template>

      <template #empty>
        <div class="py-8 text-center text-muted">{{ showArchived ? 'No archived taxes' : 'No taxes yet' }}</div>
      </template>
    </UTable>

    <TaxForm v-model:open="formOpen" :tax="editing" @saved="refresh" />

    <ConfirmDialog
      v-model:open="archiveOpen"
      title="Archive tax"
      :description="`${archiveTarget?.name} will stop being charged on new invoices, including for products that still list it.`"
      confirm-label="Archive"
      :loading="archiving"
      @confirm="confirmArchive"
    />
  </AppPage>
</template>
