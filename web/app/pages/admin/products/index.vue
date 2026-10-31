<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { Paginated, Product } from '~/types/catalog'

const api = useApi()
const toast = useToast()

const pageSize = 20
const page = ref(1)
const searchInput = ref('')
const search = ref('')
const showArchived = ref(false)

let searchTimer: ReturnType<typeof setTimeout>
watch(searchInput, (value) => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    search.value = value.trim()
    page.value = 1
  }, 300)
})

watch(showArchived, () => {
  page.value = 1
})

const { data, status, refresh } = useAsyncData(
  'admin-products',
  () =>
    api<{ data: Paginated<Product> }>('/catalog/products', {
      query: {
        search: search.value || undefined,
        page: page.value,
        pageSize,
        archived: String(showArchived.value),
      },
    }).then((res) => res.data),
  { watch: [page, search, showArchived] },
)

const columns: TableColumn<Product>[] = [
  { accessorKey: 'name', header: 'Name' },
  { accessorKey: 'type', header: 'Type' },
  { accessorKey: 'salesPrice', header: 'Sales price' },
  { accessorKey: 'costPrice', header: 'Cost price' },
  { id: 'variants', header: 'Variants' },
  { id: 'taxes', header: 'Taxes' },
  { id: 'actions', header: '' },
]

const formOpen = ref(false)
const editing = ref<Product | null>(null)

function openForm(product: Product | null) {
  editing.value = product
  formOpen.value = true
}

const archiveTarget = ref<Product | null>(null)
const archiveOpen = ref(false)
const archiving = ref(false)

function askArchive(product: Product) {
  archiveTarget.value = product
  archiveOpen.value = true
}

async function confirmArchive() {
  if (!archiveTarget.value) return
  archiving.value = true
  try {
    await api(`/catalog/products/${archiveTarget.value.id}`, { method: 'DELETE' })
    toast.add({ title: `${archiveTarget.value.name} archived`, color: 'success' })
    archiveOpen.value = false
    await refresh()
  } catch (err) {
    toast.add({ title: 'Could not archive product', description: apiErrorMessage(err), color: 'error' })
  } finally {
    archiving.value = false
  }
}

async function restore(product: Product) {
  try {
    await api(`/catalog/products/${product.id}`, {
      method: 'PUT',
      body: { ...productToInput(product), active: true },
    })
    toast.add({ title: `${product.name} restored`, color: 'success' })
    await refresh()
  } catch (err) {
    toast.add({ title: 'Could not restore product', description: apiErrorMessage(err), color: 'error' })
  }
}
</script>

<template>
  <AppPage title="Products">
    <template #actions>
      <UButton icon="i-lucide-plus" @click="openForm(null)">Add product</UButton>
    </template>

    <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <UInput
        v-model="searchInput"
        icon="i-lucide-search"
        placeholder="Search products"
        aria-label="Search products"
        class="w-full sm:max-w-xs"
      />
      <USwitch v-model="showArchived" label="Show archived" />
    </div>

    <UTable :data="data?.items ?? []" :columns="columns" :loading="status === 'pending'" class="mt-4">
      <template #name-cell="{ row }">
        <div class="min-w-40">
          <p class="font-medium text-highlighted">{{ row.original.name }}</p>
          <p v-if="row.original.notes" class="truncate text-xs text-muted">{{ row.original.notes }}</p>
        </div>
      </template>

      <template #type-cell="{ row }">
        <UBadge :label="row.original.type === 'SERVICE' ? 'Service' : 'Goods'" color="neutral" variant="subtle" />
      </template>

      <template #salesPrice-cell="{ row }">{{ formatMoney(row.original.salesPrice) }}</template>
      <template #costPrice-cell="{ row }">{{ formatMoney(row.original.costPrice) }}</template>

      <template #variants-cell="{ row }">
        <div class="flex flex-wrap gap-1">
          <UBadge
            v-for="variant in row.original.variants"
            :key="variant.id"
            :label="`${variant.value} +${formatMoney(variant.extraPrice)}`"
            variant="soft"
          />
          <span v-if="!row.original.variants.length" class="text-muted">-</span>
        </div>
      </template>

      <template #taxes-cell="{ row }">
        <div class="flex flex-wrap gap-1">
          <UBadge v-for="tax in row.original.taxes" :key="tax.id" :label="tax.name" color="neutral" variant="outline" />
          <span v-if="!row.original.taxes.length" class="text-muted">-</span>
        </div>
      </template>

      <template #actions-cell="{ row }">
        <div class="flex justify-end gap-1">
          <template v-if="row.original.active">
            <UButton
              icon="i-lucide-pencil"
              color="neutral"
              variant="ghost"
              aria-label="Edit product"
              @click="openForm(row.original)"
            />
            <UButton
              icon="i-lucide-archive"
              color="error"
              variant="ghost"
              aria-label="Archive product"
              @click="askArchive(row.original)"
            />
          </template>
          <UButton v-else icon="i-lucide-rotate-ccw" size="sm" variant="soft" @click="restore(row.original)">
            Restore
          </UButton>
        </div>
      </template>

      <template #empty>
        <div class="py-8 text-center text-muted">
          {{ search ? `No products match "${search}"` : showArchived ? 'No archived products' : 'No products yet' }}
        </div>
      </template>
    </UTable>

    <div v-if="(data?.total ?? 0) > pageSize" class="mt-4 flex justify-end">
      <UPagination v-model:page="page" :total="data?.total ?? 0" :items-per-page="pageSize" />
    </div>

    <ProductForm v-model:open="formOpen" :product="editing" @saved="refresh" />

    <UModal
      v-model:open="archiveOpen"
      title="Archive product"
      :description="`${archiveTarget?.name} will no longer be offered on new subscriptions. Existing subscriptions keep working.`"
    >
      <template #footer>
        <div class="flex w-full justify-end gap-2">
          <UButton color="neutral" variant="ghost" @click="archiveOpen = false">Cancel</UButton>
          <UButton color="error" :loading="archiving" @click="confirmArchive">Archive</UButton>
        </div>
      </template>
    </UModal>
  </AppPage>
</template>
