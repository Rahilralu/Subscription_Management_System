<script setup lang="ts">
import type { PlanRecord, Product, QuotationTemplate, Variant } from '~/types/catalog'

interface LineRow {
  key: number
  productId: number | null
  variantId: number // 0 means no option
  quantity: number
  // label for the picker before it has searched
  product: { id: number, name: string } | null
}

const props = defineProps<{ template: QuotationTemplate | null }>()
const open = defineModel<boolean>('open', { required: true })
const emit = defineEmits<{ saved: [] }>()

const api = useApi()
const toast = useToast()
const saving = ref(false)

const plans = ref<PlanRecord[]>([])
const planItems = computed(() => plans.value.map((p) => ({ label: `${p.name} (${titleCase(p.billingPeriod)})`, value: p.id })))

async function loadPlans() {
  try {
    plans.value = (await api<{ data: PlanRecord[] }>('/catalog/plans')).data
  } catch (err) {
    toast.add({ title: 'Could not load plans', description: apiErrorMessage(err), color: 'error' })
  }
}

let nextKey = 0
const blankLine = (): LineRow => ({ key: nextKey++, productId: null, variantId: 0, quantity: 1, product: null })

const state = reactive({
  name: '',
  planId: undefined as number | undefined,
  validityDays: 30,
  notes: '',
  lines: [] as LineRow[],
})

// variants per product, from the template being edited and from products picked in this session
const variantsByProduct = reactive(new Map<number, Variant[]>())

watch(open, (isOpen) => {
  if (!isOpen) return
  loadPlans()
  variantsByProduct.clear()
  const t = props.template
  Object.assign(state, {
    name: t?.name ?? '',
    planId: t?.planId,
    validityDays: t?.validityDays ?? 30,
    notes: t?.notes ?? '',
    lines: t
      ? t.lines.map((line) => {
          variantsByProduct.set(line.productId, line.product.variants)
          return { key: nextKey++, productId: line.productId, variantId: line.variantId ?? 0, quantity: line.quantity, product: line.product }
        })
      : [blankLine()],
  })
})

const selectedPlan = computed(() => plans.value.find((p) => p.id === state.planId))

function variantItems(line: LineRow) {
  const variants = line.productId ? variantsByProduct.get(line.productId) ?? [] : []
  return [
    { label: 'No option', value: 0 },
    ...variants.map((v) => ({ label: `${v.attribute}: ${v.value} (+${formatMoney(v.extraPrice)})`, value: v.id! })),
  ]
}

function onPick(line: LineRow, product: Product) {
  variantsByProduct.set(product.id, product.variants)
  line.product = { id: product.id, name: product.name }
  line.variantId = 0
}

function addLine() {
  state.lines.push(blankLine())
}

function removeLine(index: number) {
  state.lines.splice(index, 1)
}

// returns the first problem, or null; the API repeats every check
function validate() {
  if (!state.name.trim()) return 'Name is required'
  if (!state.planId) return 'Choose a plan'
  if (!Number.isInteger(state.validityDays) || state.validityDays < 1 || state.validityDays > 365) {
    return 'Validity must be between 1 and 365 days'
  }
  if (!state.lines.length) return 'Add at least one product'
  if (state.lines.some((l) => !l.productId)) return 'Every line needs a product'
  const min = selectedPlan.value?.minQuantity ?? 1
  if (state.lines.some((l) => !Number.isInteger(l.quantity) || l.quantity < min)) {
    return `Every quantity must be a whole number of at least ${min}`
  }
  const keys = state.lines.map((l) => `${l.productId}:${l.variantId}`)
  if (new Set(keys).size !== keys.length) return 'The same product and option appear twice'
  return null
}

async function save() {
  const problem = validate()
  if (problem) {
    toast.add({ title: problem, color: 'warning' })
    return
  }

  saving.value = true
  const body = {
    name: state.name.trim(),
    planId: state.planId,
    validityDays: state.validityDays,
    notes: state.notes.trim() || null,
    lines: state.lines.map((l) => ({ productId: l.productId, variantId: l.variantId || null, quantity: l.quantity })),
  }

  try {
    if (props.template) {
      await api(`/catalog/templates/${props.template.id}`, { method: 'PUT', body })
    } else {
      await api('/catalog/templates', { method: 'POST', body })
    }
    toast.add({ title: props.template ? 'Template updated' : 'Template added', color: 'success' })
    open.value = false
    emit('saved')
  } catch (err) {
    toast.add({ title: 'Could not save template', description: apiErrorMessage(err), color: 'error' })
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <USlideover v-model:open="open" :title="template ? 'Edit template' : 'Add template'" :ui="{ content: 'sm:max-w-2xl' }">
    <template #body>
      <form id="template-form" class="space-y-4" @submit.prevent="save">
        <UFormField label="Name" required>
          <UInput v-model="state.name" placeholder="Starter pack" class="w-full" />
        </UFormField>

        <div class="grid gap-4 sm:grid-cols-2">
          <UFormField label="Plan" required>
            <USelectMenu v-model="state.planId" :items="planItems" value-key="value" placeholder="Choose a plan" class="w-full" />
          </UFormField>

          <UFormField label="Quotation valid for" help="Days the customer has to accept">
            <UInputNumber v-model="state.validityDays" :min="1" :max="365" class="w-full" />
          </UFormField>
        </div>

        <UFormField label="Notes" help="Copied onto subscriptions created from this template">
          <UTextarea v-model="state.notes" :rows="2" class="w-full" />
        </UFormField>

        <div class="space-y-2">
          <div class="flex items-center justify-between gap-2">
            <div>
              <h3 class="text-sm font-medium text-highlighted">Products</h3>
              <p class="text-xs text-muted">
                Prices are taken from the catalog when a subscription is created
                <template v-if="selectedPlan && selectedPlan.minQuantity > 1">. Minimum quantity {{ selectedPlan.minQuantity }}</template>
              </p>
            </div>
            <UButton icon="i-lucide-plus" size="sm" variant="soft" class="shrink-0" @click="addLine">Add product</UButton>
          </div>

          <div
            v-for="(line, i) in state.lines"
            :key="line.key"
            class="grid grid-cols-2 items-start gap-2 sm:grid-cols-[1fr_1fr_6rem_auto]"
          >
            <ProductPicker v-model="line.productId" :selected="line.product" aria-label="Product" @pick="onPick(line, $event)" />
            <USelect v-model="line.variantId" :items="variantItems(line)" :disabled="!line.productId" aria-label="Option" class="w-full" />
            <UInputNumber v-model="line.quantity" :min="selectedPlan?.minQuantity ?? 1" aria-label="Quantity" class="w-full" />
            <UButton
              icon="i-lucide-trash-2"
              color="error"
              variant="ghost"
              aria-label="Remove product"
              :disabled="state.lines.length === 1"
              @click="removeLine(i)"
            />
          </div>
        </div>
      </form>
    </template>

    <template #footer>
      <div class="flex w-full justify-end gap-2">
        <UButton color="neutral" variant="ghost" @click="open = false">Cancel</UButton>
        <UButton type="submit" form="template-form" :loading="saving">Save</UButton>
      </div>
    </template>
  </USlideover>
</template>
