<script setup lang="ts">
import { z } from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import type { Product, ProductInput, Tax, Variant } from '~/types/catalog'

const props = defineProps<{ product: Product | null }>()
const open = defineModel<boolean>('open', { required: true })
const emit = defineEmits<{ saved: [] }>()

const api = useApi()
const toast = useToast()
const saving = ref(false)

const typeOptions = [
  { label: 'Service', value: 'SERVICE' },
  { label: 'Goods', value: 'GOODS' },
]

const amount = z.string().trim().regex(/^\d{1,10}(\.\d{1,2})?$/, 'Enter a valid amount')

const schema = z
  .object({
    name: z.string().trim().min(1, 'Name is required').max(100),
    type: z.enum(['SERVICE', 'GOODS']),
    salesPrice: amount,
    costPrice: amount,
    notes: z.string().trim().max(500),
    taxIds: z.array(z.number()),
    variants: z.array(
      z.object({
        id: z.number().optional(),
        attribute: z.string().trim().min(1, 'Required').max(50),
        value: z.string().trim().min(1, 'Required').max(50),
        extraPrice: amount,
      }),
    ),
  })
  .superRefine((product, ctx) => {
    const seen = new Set()
    product.variants.forEach((variant, i) => {
      const key = `${variant.attribute.toLowerCase()}:${variant.value.toLowerCase()}`
      if (seen.has(key)) {
        ctx.addIssue({ code: 'custom', path: ['variants', i, 'value'], message: 'Duplicate variant' })
      }
      seen.add(key)
    })
  })

type Schema = z.output<typeof schema>
type VariantRow = Variant & { key: number }

let nextKey = 0
const toRow = (variant: Variant): VariantRow => ({ ...variant, key: nextKey++ })

function emptyProduct(): ProductInput {
  return { name: '', type: 'SERVICE', salesPrice: '', costPrice: '0', notes: '', taxIds: [], variants: [] }
}

const state = reactive<Omit<ProductInput, 'variants'> & { variants: VariantRow[] }>({ ...emptyProduct(), variants: [] })

const taxes = ref<Tax[]>([])
const taxesLoading = ref(false)

// active taxes, plus any archived ones this product still has so they stay visible and removable
const taxItems = computed(() => {
  const all = [...taxes.value, ...(props.product?.taxes ?? []).filter((t) => !taxes.value.some((a) => a.id === t.id))]
  return all.map((tax) => ({ label: `${tax.name} (${formatAmount(tax.type, tax.rate)})`, value: tax.id }))
})

async function loadTaxes() {
  taxesLoading.value = true
  try {
    taxes.value = (await api<{ data: Tax[] }>('/catalog/taxes')).data
  } catch (err) {
    toast.add({ title: 'Could not load taxes', description: apiErrorMessage(err), color: 'error' })
  } finally {
    taxesLoading.value = false
  }
}

watch(open, (isOpen) => {
  if (!isOpen) return
  const input = props.product ? productToInput(props.product) : emptyProduct()
  Object.assign(state, { ...input, variants: input.variants.map(toRow) })
  loadTaxes()
})

function addVariant() {
  state.variants.push(toRow({ attribute: '', value: '', extraPrice: '0' }))
}

function removeVariant(index: number) {
  state.variants.splice(index, 1)
}

async function onSubmit(event: FormSubmitEvent<Schema>) {
  saving.value = true
  const body = { ...event.data, notes: event.data.notes || null }

  try {
    if (props.product) {
      await api(`/catalog/products/${props.product.id}`, { method: 'PUT', body })
    } else {
      await api('/catalog/products', { method: 'POST', body })
    }
    toast.add({ title: props.product ? 'Product updated' : 'Product added', color: 'success' })
    open.value = false
    emit('saved')
  } catch (err) {
    toast.add({ title: 'Could not save product', description: apiErrorMessage(err), color: 'error' })
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <USlideover v-model:open="open" :title="product ? 'Edit product' : 'Add product'">
    <template #body>
      <UForm id="product-form" :schema="schema" :state="state" class="space-y-4" @submit="onSubmit">
        <UFormField label="Name" name="name" required>
          <UInput v-model="state.name" placeholder="ERP License" class="w-full" />
        </UFormField>

        <UFormField label="Type" name="type" required>
          <USelect v-model="state.type" :items="typeOptions" class="w-full" />
        </UFormField>

        <div class="grid gap-4 sm:grid-cols-2">
          <UFormField label="Sales price" name="salesPrice" required>
            <UInput v-model="state.salesPrice" inputmode="decimal" placeholder="0.00" class="w-full">
              <template #leading><span class="text-sm text-muted">₹</span></template>
            </UInput>
          </UFormField>

          <UFormField label="Cost price" name="costPrice">
            <UInput v-model="state.costPrice" inputmode="decimal" placeholder="0.00" class="w-full">
              <template #leading><span class="text-sm text-muted">₹</span></template>
            </UInput>
          </UFormField>
        </div>

        <UFormField label="Taxes" name="taxIds" help="Charged on every invoice line for this product">
          <USelectMenu
            v-model="state.taxIds"
            :items="taxItems"
            value-key="value"
            multiple
            :loading="taxesLoading"
            placeholder="No taxes"
            class="w-full"
          />
        </UFormField>

        <UFormField label="Notes" name="notes">
          <UTextarea v-model="state.notes" :rows="2" class="w-full" />
        </UFormField>

        <div class="space-y-2">
          <div class="flex items-center justify-between gap-2">
            <div>
              <h3 class="text-sm font-medium text-highlighted">Variants</h3>
              <p class="text-xs text-muted">Versions of this product that add to the price</p>
            </div>
            <UButton icon="i-lucide-plus" size="sm" variant="soft" class="shrink-0" @click="addVariant">
              Add variant
            </UButton>
          </div>

          <p v-if="!state.variants.length" class="text-sm text-muted">No variants</p>

          <div
            v-for="(variant, i) in state.variants"
            :key="variant.key"
            class="grid grid-cols-2 gap-2 items-start sm:grid-cols-[1fr_1fr_7rem_auto]"
          >
            <UFormField :name="`variants.${i}.attribute`">
              <UInput v-model="variant.attribute" placeholder="Brand" aria-label="Attribute" class="w-full" />
            </UFormField>
            <UFormField :name="`variants.${i}.value`">
              <UInput v-model="variant.value" placeholder="Odoo" aria-label="Value" class="w-full" />
            </UFormField>
            <UFormField :name="`variants.${i}.extraPrice`">
              <UInput v-model="variant.extraPrice" inputmode="decimal" aria-label="Extra price" class="w-full">
                <template #leading><span class="text-sm text-muted">+₹</span></template>
              </UInput>
            </UFormField>
            <UButton
              icon="i-lucide-trash-2"
              color="error"
              variant="ghost"
              aria-label="Remove variant"
              @click="removeVariant(i)"
            />
          </div>
        </div>
      </UForm>
    </template>

    <template #footer>
      <div class="flex w-full justify-end gap-2">
        <UButton color="neutral" variant="ghost" @click="open = false">Cancel</UButton>
        <UButton type="submit" form="product-form" :loading="saving">Save</UButton>
      </div>
    </template>
  </USlideover>
</template>
