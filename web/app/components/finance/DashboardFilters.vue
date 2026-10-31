<script setup lang="ts">
export interface DashboardFilterValue {
  from: string
  to: string
  planId: string
  customerId: number | undefined
}

const filters = defineModel<DashboardFilterValue>({ required: true })
const api = useApi()

const today = new Date()
const monthStart = (monthsBack: number) => isoDate(new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - monthsBack, 1)))
const presets = [
  { label: 'This month', value: 'month', from: () => monthStart(0) },
  { label: 'Last 3 months', value: '3m', from: () => monthStart(2) },
  { label: 'Last 12 months', value: '12m', from: () => monthStart(11) },
  { label: 'Year to date', value: 'ytd', from: () => `${today.getUTCFullYear()}-01-01` },
]
const presetItems = [...presets.map(({ label, value }) => ({ label, value })), { label: 'Custom', value: 'custom' }]
const preset = ref('month')
watch(preset, (value) => {
  const p = presets.find(x => x.value === value)
  if (p) filters.value = { ...filters.value, from: p.from(), to: todayIso() }
})
function setDate(key: 'from' | 'to', value: string) {
  if (!value) return
  preset.value = 'custom'
  filters.value = { ...filters.value, [key]: value }
}

const { data: options } = await useAsyncData('dashboard-filter-options', () =>
  api<{ data: { plans: { id: number, name: string }[] } }>('/dashboard/filter-options'),
)
const planItems = computed(() => [
  { label: 'All plans', value: 'all' },
  ...(options.value?.data.plans ?? []).map(p => ({ label: p.name, value: String(p.id) })),
])
const planId = computed({
  get: () => filters.value.planId,
  set: (value: string) => (filters.value = { ...filters.value, planId: value }),
})

type CustomerItem = { label: string, value: number | undefined }
const allCustomers: CustomerItem = { label: 'All customers', value: undefined }
const customerSearch = ref('')
const customerItems = ref<CustomerItem[]>([allCustomers])
const customer = ref<CustomerItem>(allCustomers)
let timer: ReturnType<typeof setTimeout> | undefined
async function loadCustomers() {
  const res = await api<{ data: { customers: { id: number, name: string }[] } }>('/dashboard/filter-options', {
    query: { search: customerSearch.value || undefined },
  })
  customerItems.value = [allCustomers, ...res.data.customers.map(c => ({ label: c.name, value: c.id }))]
}
watch(customerSearch, () => {
  clearTimeout(timer)
  timer = setTimeout(loadCustomers, 250)
}, { immediate: true })
watch(customer, c => (filters.value = { ...filters.value, customerId: c?.value }))
</script>

<template>
  <div class="flex flex-wrap items-end gap-3">
    <UFormField label="Period">
      <USelect v-model="preset" :items="presetItems" class="w-40" />
    </UFormField>
    <UFormField label="From">
      <UInput type="date" :model-value="filters.from" :max="filters.to" class="w-40" @update:model-value="setDate('from', String($event))" />
    </UFormField>
    <UFormField label="To">
      <UInput type="date" :model-value="filters.to" :min="filters.from" :max="todayIso()" class="w-40" @update:model-value="setDate('to', String($event))" />
    </UFormField>
    <UFormField label="Plan">
      <USelect v-model="planId" :items="planItems" class="w-40" />
    </UFormField>
    <UFormField label="Customer">
      <USelectMenu v-model="customer" v-model:search-term="customerSearch" :items="customerItems" ignore-filter class="w-56" />
    </UFormField>
  </div>
</template>
