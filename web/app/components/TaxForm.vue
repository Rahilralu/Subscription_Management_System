<script setup lang="ts">
import { z } from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import type { TaxInput, TaxRecord } from '~/types/catalog'

const props = defineProps<{ tax: TaxRecord | null }>()
const open = defineModel<boolean>('open', { required: true })
const emit = defineEmits<{ saved: [] }>()

const api = useApi()
const toast = useToast()
const saving = ref(false)

const typeOptions = [
  { label: 'Percent of line', value: 'PERCENT' },
  { label: 'Fixed per unit', value: 'FIXED' },
]

const schema = z
  .object({
    name: z.string().trim().min(1, 'Name is required').max(50),
    type: z.enum(['PERCENT', 'FIXED']),
    rate: z.string().trim().regex(/^\d{1,10}(\.\d{1,2})?$/, 'Enter a valid amount'),
  })
  .refine((tax) => tax.type !== 'PERCENT' || Number(tax.rate) <= 100, {
    path: ['rate'],
    message: 'Percent must be between 0 and 100',
  })

type Schema = z.output<typeof schema>

const emptyTax = (): TaxInput => ({ name: '', type: 'PERCENT', rate: '' })
const state = reactive<TaxInput>(emptyTax())

watch(open, (isOpen) => {
  if (isOpen) Object.assign(state, props.tax ? taxToInput(props.tax) : emptyTax())
})

async function onSubmit(event: FormSubmitEvent<Schema>) {
  saving.value = true
  try {
    if (props.tax) {
      await api(`/catalog/taxes/${props.tax.id}`, { method: 'PUT', body: event.data })
    } else {
      await api('/catalog/taxes', { method: 'POST', body: event.data })
    }
    toast.add({ title: props.tax ? 'Tax updated' : 'Tax added', color: 'success' })
    open.value = false
    emit('saved')
  } catch (err) {
    toast.add({ title: 'Could not save tax', description: apiErrorMessage(err), color: 'error' })
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <USlideover v-model:open="open" :title="tax ? 'Edit tax' : 'Add tax'">
    <template #body>
      <UForm id="tax-form" :schema="schema" :state="state" class="space-y-4" @submit="onSubmit">
        <UFormField label="Name" name="name" required>
          <UInput v-model="state.name" placeholder="GST 18%" class="w-full" />
        </UFormField>

        <UFormField label="Type" name="type" required>
          <USelect v-model="state.type" :items="typeOptions" class="w-full" />
        </UFormField>

        <UFormField
          label="Rate"
          name="rate"
          required
          :help="state.type === 'PERCENT' ? 'Charged on the line total after discounts' : 'Charged once for every unit on the line'"
        >
          <UInput v-model="state.rate" inputmode="decimal" placeholder="0" class="w-full">
            <template v-if="state.type === 'FIXED'" #leading><span class="text-sm text-muted">₹</span></template>
            <template v-else #trailing><span class="text-sm text-muted">%</span></template>
          </UInput>
        </UFormField>

        <UAlert
          v-if="tax && tax._count.products"
          icon="i-lucide-info"
          color="neutral"
          variant="subtle"
          :description="`Used by ${tax._count.products} product(s). Changes apply to invoices created from now on.`"
        />
      </UForm>
    </template>

    <template #footer>
      <div class="flex w-full justify-end gap-2">
        <UButton color="neutral" variant="ghost" @click="open = false">Cancel</UButton>
        <UButton type="submit" form="tax-form" :loading="saving">Save</UButton>
      </div>
    </template>
  </USlideover>
</template>
