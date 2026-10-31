<script setup lang="ts">
import { z } from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import type { Discount, DiscountInput } from '~/types/catalog'

const props = defineProps<{ discount: Discount | null }>()
const open = defineModel<boolean>('open', { required: true })
const emit = defineEmits<{ saved: [] }>()

const api = useApi()
const toast = useToast()
const saving = ref(false)

const typeOptions = [
  { label: 'Percent off', value: 'PERCENT' },
  { label: 'Fixed amount off', value: 'FIXED' },
]
const scopeOptions = [
  { label: 'One product', value: 'PRODUCT' },
  { label: 'Whole subscription', value: 'SUBSCRIPTION' },
]

const money = z.string().trim().regex(/^\d{1,10}(\.\d{1,2})?$/, 'Enter a valid amount')
const optionalCount = z.number().int().min(1, 'At least 1').nullable()

const schema = z
  .object({
    name: z.string().trim().min(1, 'Name is required').max(100),
    type: z.enum(['PERCENT', 'FIXED']),
    value: money,
    scope: z.enum(['PRODUCT', 'SUBSCRIPTION']),
    productId: z.number().nullable(),
    minPurchase: z.union([z.literal(''), money]),
    minQuantity: optionalCount,
    usageLimit: optionalCount,
    startDate: z.iso.date('Enter a valid date'),
    endDate: z.union([z.literal(''), z.iso.date('Enter a valid date')]),
  })
  .superRefine((discount, ctx) => {
    if (Number(discount.value) <= 0) {
      ctx.addIssue({ code: 'custom', path: ['value'], message: 'Value must be more than 0' })
    }
    if (discount.type === 'PERCENT' && Number(discount.value) > 100) {
      ctx.addIssue({ code: 'custom', path: ['value'], message: 'Percent must be between 0 and 100' })
    }
    if (discount.scope === 'PRODUCT' && !discount.productId) {
      ctx.addIssue({ code: 'custom', path: ['productId'], message: 'Choose a product' })
    }
    if (discount.endDate && discount.endDate < discount.startDate) {
      ctx.addIssue({ code: 'custom', path: ['endDate'], message: 'End date cannot be before start date' })
    }
  })

type Schema = z.output<typeof schema>

function emptyDiscount(): DiscountInput {
  return {
    name: '',
    type: 'PERCENT',
    value: '',
    scope: 'SUBSCRIPTION',
    productId: null,
    minPurchase: '',
    minQuantity: null,
    usageLimit: null,
    startDate: todayInputValue(),
    endDate: '',
  }
}

const state = reactive<DiscountInput>(emptyDiscount())

watch(open, (isOpen) => {
  if (isOpen) Object.assign(state, props.discount ? discountToInput(props.discount) : emptyDiscount())
})

const minQuantityHelp = computed(() =>
  state.scope === 'PRODUCT' ? 'Units of this product on the line' : 'Units across all lines',
)
const minPurchaseHelp = computed(() =>
  state.scope === 'PRODUCT' ? 'Line total before tax' : 'Invoice subtotal before tax',
)

async function onSubmit(event: FormSubmitEvent<Schema>) {
  saving.value = true
  const body = discountBody(event.data)

  try {
    if (props.discount) {
      await api(`/catalog/discounts/${props.discount.id}`, { method: 'PUT', body })
    } else {
      await api('/catalog/discounts', { method: 'POST', body })
    }
    toast.add({ title: props.discount ? 'Discount updated' : 'Discount added', color: 'success' })
    open.value = false
    emit('saved')
  } catch (err) {
    toast.add({ title: 'Could not save discount', description: apiErrorMessage(err), color: 'error' })
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <USlideover v-model:open="open" :title="discount ? 'Edit discount' : 'Add discount'">
    <template #body>
      <UForm id="discount-form" :schema="schema" :state="state" class="space-y-4" @submit="onSubmit">
        <UFormField label="Name" name="name" required>
          <UInput v-model="state.name" placeholder="Festive 10% off" class="w-full" />
        </UFormField>

        <div class="grid gap-4 sm:grid-cols-2">
          <UFormField label="Type" name="type" required>
            <USelect v-model="state.type" :items="typeOptions" class="w-full" />
          </UFormField>

          <UFormField label="Value" name="value" required>
            <UInput v-model="state.value" inputmode="decimal" placeholder="0" class="w-full">
              <template v-if="state.type === 'FIXED'" #leading><span class="text-sm text-muted">₹</span></template>
              <template v-else #trailing><span class="text-sm text-muted">%</span></template>
            </UInput>
          </UFormField>
        </div>

        <UFormField label="Applies to" name="scope" required>
          <USelect v-model="state.scope" :items="scopeOptions" class="w-full" />
        </UFormField>

        <UFormField v-if="state.scope === 'PRODUCT'" label="Product" name="productId" required>
          <ProductPicker v-model="state.productId" :selected="discount?.product" />
        </UFormField>

        <fieldset class="space-y-4">
          <legend class="mb-2 text-sm font-medium text-highlighted">Conditions <span class="font-normal text-muted">(optional)</span></legend>

          <div class="grid gap-4 sm:grid-cols-2">
            <UFormField label="Minimum purchase" name="minPurchase" :help="minPurchaseHelp">
              <UInput v-model="state.minPurchase" inputmode="decimal" placeholder="None" class="w-full">
                <template #leading><span class="text-sm text-muted">₹</span></template>
              </UInput>
            </UFormField>

            <UFormField label="Minimum quantity" name="minQuantity" :help="minQuantityHelp">
              <UInputNumber v-model="state.minQuantity" :min="1" placeholder="None" class="w-full" />
            </UFormField>
          </div>

          <UFormField
            label="Usage limit"
            name="usageLimit"
            :help="discount?.usedCount ? `Used on ${discount.usedCount} invoice(s) so far` : 'Number of invoices it can be applied to'"
          >
            <UInputNumber v-model="state.usageLimit" :min="Math.max(1, discount?.usedCount ?? 0)" placeholder="Unlimited" class="w-full" />
          </UFormField>
        </fieldset>

        <div class="grid gap-4 sm:grid-cols-2">
          <UFormField label="Starts" name="startDate" required>
            <UInput v-model="state.startDate" type="date" class="w-full" />
          </UFormField>

          <UFormField label="Ends" name="endDate" help="Last day it applies; empty for no end">
            <UInput v-model="state.endDate" type="date" :min="state.startDate" class="w-full" />
          </UFormField>
        </div>
      </UForm>
    </template>

    <template #footer>
      <div class="flex w-full justify-end gap-2">
        <UButton color="neutral" variant="ghost" @click="open = false">Cancel</UButton>
        <UButton type="submit" form="discount-form" :loading="saving">Save</UButton>
      </div>
    </template>
  </USlideover>
</template>
