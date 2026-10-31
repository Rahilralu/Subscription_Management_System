<script setup lang="ts">
import type { Paginated, Product } from '~/types/catalog'

interface ProductOption {
  id: number
  name: string
}

// `selected` labels the current value before any search has run (e.g. when editing)
const props = defineProps<{ selected?: ProductOption | null, placeholder?: string }>()
const model = defineModel<number | null | undefined>()
const emit = defineEmits<{ pick: [product: Product] }>()

const api = useApi()
const toast = useToast()

const searchTerm = ref('')
const results = ref<Product[]>([])
const loading = ref(false)
const loaded = ref(false)
const picked = ref<ProductOption | null>(null)

// active products only: archived ones can't be put on new discounts or templates
async function search() {
  loading.value = true
  try {
    const res = await api<{ data: Paginated<Product> }>('/catalog/products', {
      query: { search: searchTerm.value.trim() || undefined, pageSize: 20 },
    })
    results.value = res.data.items
    loaded.value = true
  } catch (err) {
    toast.add({ title: 'Could not load products', description: apiErrorMessage(err), color: 'error' })
  } finally {
    loading.value = false
  }
}

let searchTimer: ReturnType<typeof setTimeout>
watch(searchTerm, () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(search, 250)
})
onBeforeUnmount(() => clearTimeout(searchTimer))

function onOpen(isOpen: boolean) {
  if (isOpen && !loaded.value) search()
}

const items = computed(() => {
  const options = results.value.map((p) => ({ label: p.name, value: p.id }))
  const current = picked.value?.id === model.value ? picked.value : props.selected
  if (current && current.id === model.value && !options.some((o) => o.value === current.id)) {
    options.unshift({ label: current.name, value: current.id })
  }
  return options
})

function onSelect(id: number | null | undefined) {
  model.value = id
  const product = results.value.find((p) => p.id === id)
  if (!product) return
  picked.value = { id: product.id, name: product.name }
  emit('pick', product)
}
</script>

<template>
  <USelectMenu
    v-model:search-term="searchTerm"
    :model-value="model ?? undefined"
    :items="items"
    value-key="value"
    ignore-filter
    :loading="loading"
    :placeholder="placeholder ?? 'Choose a product'"
    class="w-full"
    @update:model-value="onSelect"
    @update:open="onOpen"
  />
</template>
