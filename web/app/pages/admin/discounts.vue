<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { Discount } from '~/types/catalog'

const { items, status, refresh, showArchived, archiveTarget, archiveOpen, archiving, askArchive, confirmArchive, restore }
  = useCatalogList<Discount>({ resource: 'discounts', label: 'discount', restoreBody: (d) => discountBody(discountToInput(d)) })

const columns: TableColumn<Discount>[] = [
  { accessorKey: 'name', header: 'Name' },
  { accessorKey: 'value', header: 'Discount' },
  { id: 'appliesTo', header: 'Applies to' },
  { id: 'conditions', header: 'Conditions' },
  { id: 'validity', header: 'Valid' },
  { id: 'usage', header: 'Used' },
  { id: 'state', header: 'Status' },
  { id: 'actions', header: '' },
]

type DiscountState = { label: string, color: 'success' | 'info' | 'neutral' | 'warning' }

// mirrors isDiscountUsable() in the billing module; compares 'YYYY-MM-DD' strings
function discountState(discount: Discount): DiscountState {
  const today = todayInputValue()
  if (!discount.active) return { label: 'Archived', color: 'neutral' }
  if (dateInputValue(discount.startDate) > today) return { label: 'Scheduled', color: 'info' }
  if (discount.endDate && dateInputValue(discount.endDate) < today) return { label: 'Expired', color: 'neutral' }
  if (discount.usageLimit != null && discount.usedCount >= discount.usageLimit) return { label: 'Used up', color: 'warning' }
  return { label: 'Live', color: 'success' }
}

function conditions(discount: Discount) {
  const parts = []
  if (discount.minPurchase != null) parts.push(`Min ${formatMoney(discount.minPurchase)}`)
  if (discount.minQuantity != null) parts.push(`Min qty ${discount.minQuantity}`)
  return parts.join(', ') || '-'
}

const formOpen = ref(false)
const editing = ref<Discount | null>(null)

function openForm(discount: Discount | null) {
  editing.value = discount
  formOpen.value = true
}
</script>

<template>
  <AppPage title="Discounts">
    <template #actions>
      <UButton icon="i-lucide-plus" @click="openForm(null)">Add discount</UButton>
    </template>

    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p class="text-sm text-muted">Live discounts are applied automatically by the billing run.</p>
      <USwitch v-model="showArchived" label="Show archived" />
    </div>

    <UTable :data="items" :columns="columns" :loading="status === 'pending'" class="mt-4">
      <template #name-cell="{ row }">
        <span class="font-medium text-highlighted">{{ row.original.name }}</span>
      </template>

      <template #value-cell="{ row }">{{ formatAmount(row.original.type, row.original.value) }} off</template>

      <template #appliesTo-cell="{ row }">
        {{ row.original.scope === 'PRODUCT' ? row.original.product?.name : 'Whole subscription' }}
      </template>

      <template #conditions-cell="{ row }">{{ conditions(row.original) }}</template>

      <template #validity-cell="{ row }">
        {{ formatDate(row.original.startDate) }}
        <span class="text-muted">to</span>
        {{ row.original.endDate ? formatDate(row.original.endDate) : 'no end' }}
      </template>

      <template #usage-cell="{ row }">
        {{ row.original.usedCount }}<span class="text-muted"> / {{ row.original.usageLimit ?? '∞' }}</span>
      </template>

      <template #state-cell="{ row }">
        <UBadge v-bind="discountState(row.original)" variant="subtle" />
      </template>

      <template #actions-cell="{ row }">
        <div class="flex justify-end gap-1">
          <template v-if="row.original.active">
            <UButton icon="i-lucide-pencil" color="neutral" variant="ghost" aria-label="Edit discount" @click="openForm(row.original)" />
            <UButton icon="i-lucide-archive" color="error" variant="ghost" aria-label="Archive discount" @click="askArchive(row.original)" />
          </template>
          <UButton v-else icon="i-lucide-rotate-ccw" size="sm" variant="soft" @click="restore(row.original)">Restore</UButton>
        </div>
      </template>

      <template #empty>
        <div class="py-8 text-center text-muted">{{ showArchived ? 'No archived discounts' : 'No discounts yet' }}</div>
      </template>
    </UTable>

    <DiscountForm v-model:open="formOpen" :discount="editing" @saved="refresh" />

    <ConfirmDialog
      v-model:open="archiveOpen"
      title="Archive discount"
      :description="`${archiveTarget?.name} will no longer be applied to new invoices. Invoices already created keep their discount.`"
      confirm-label="Archive"
      :loading="archiving"
      @confirm="confirmArchive"
    />
  </AppPage>
</template>
