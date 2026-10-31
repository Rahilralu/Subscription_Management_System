<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { QuotationTemplate, TemplateLine } from '~/types/catalog'

const api = useApi()
const toast = useToast()

const { data, status, refresh } = useAsyncData(
  'admin-templates',
  () => api<{ data: QuotationTemplate[] }>('/catalog/templates').then((res) => res.data),
  { default: () => [] as QuotationTemplate[] },
)

const columns: TableColumn<QuotationTemplate>[] = [
  { accessorKey: 'name', header: 'Name' },
  { id: 'plan', header: 'Plan' },
  { id: 'lines', header: 'Products' },
  { accessorKey: 'validityDays', header: 'Valid for' },
  { id: 'estimate', header: 'List price' },
  { id: 'actions', header: '' },
]

const lineLabel = (line: TemplateLine) =>
  `${line.quantity} × ${line.product.name}${line.variant ? ` (${line.variant.value})` : ''}`

// before tax and discounts, at today's catalog prices
const estimate = (template: QuotationTemplate) =>
  template.lines.reduce(
    (sum, line) => sum + (Number(line.product.salesPrice) + Number(line.variant?.extraPrice ?? 0)) * line.quantity,
    0,
  )

// a template pointing at something archived can't be used until it's fixed
const isBroken = (template: QuotationTemplate) => !template.plan.active || template.lines.some((l) => !l.product.active)

const formOpen = ref(false)
const editing = ref<QuotationTemplate | null>(null)

function openForm(template: QuotationTemplate | null) {
  editing.value = template
  formOpen.value = true
}

const deleteTarget = ref<QuotationTemplate | null>(null)
const deleteOpen = ref(false)
const deleting = ref(false)

function askDelete(template: QuotationTemplate) {
  deleteTarget.value = template
  deleteOpen.value = true
}

async function confirmDelete() {
  const template = deleteTarget.value
  if (!template) return
  deleting.value = true
  try {
    await api(`/catalog/templates/${template.id}`, { method: 'DELETE' })
    toast.add({ title: `${template.name} deleted`, color: 'success' })
    deleteOpen.value = false
    await refresh()
  } catch (err) {
    toast.add({ title: 'Could not delete template', description: apiErrorMessage(err), color: 'error' })
  } finally {
    deleting.value = false
  }
}
</script>

<template>
  <AppPage title="Quotation templates">
    <template #actions>
      <UButton icon="i-lucide-plus" @click="openForm(null)">Add template</UButton>
    </template>

    <p class="text-sm text-muted">Staff pick a template on the new subscription form to fill in the plan and products.</p>

    <UTable :data="data" :columns="columns" :loading="status === 'pending'" class="mt-4">
      <template #name-cell="{ row }">
        <div class="min-w-40">
          <p class="font-medium text-highlighted">{{ row.original.name }}</p>
          <p v-if="isBroken(row.original)" class="text-xs text-error">Uses an archived plan or product</p>
          <p v-else-if="row.original.notes" class="truncate text-xs text-muted">{{ row.original.notes }}</p>
        </div>
      </template>

      <template #plan-cell="{ row }">
        {{ row.original.plan.name }}
        <span class="text-muted">({{ titleCase(row.original.plan.billingPeriod) }})</span>
      </template>

      <template #lines-cell="{ row }">
        <ul class="space-y-0.5">
          <li v-for="line in row.original.lines" :key="line.id">{{ lineLabel(line) }}</li>
        </ul>
      </template>

      <template #validityDays-cell="{ row }">{{ row.original.validityDays }} days</template>
      <template #estimate-cell="{ row }">{{ formatMoney(estimate(row.original)) }}</template>

      <template #actions-cell="{ row }">
        <div class="flex justify-end gap-1">
          <UButton icon="i-lucide-pencil" color="neutral" variant="ghost" aria-label="Edit template" @click="openForm(row.original)" />
          <UButton icon="i-lucide-trash-2" color="error" variant="ghost" aria-label="Delete template" @click="askDelete(row.original)" />
        </div>
      </template>

      <template #empty>
        <div class="py-8 text-center text-muted">No templates yet</div>
      </template>
    </UTable>

    <TemplateForm v-model:open="formOpen" :template="editing" @saved="refresh" />

    <ConfirmDialog
      v-model:open="deleteOpen"
      title="Delete template"
      :description="`${deleteTarget?.name} will be removed. Subscriptions already created from it are not affected.`"
      confirm-label="Delete"
      :loading="deleting"
      @confirm="confirmDelete"
    />
  </AppPage>
</template>
