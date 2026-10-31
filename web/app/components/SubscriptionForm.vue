<script setup lang="ts">
import type { FormOptions, SubscriptionPayload } from '~/types/billing'

interface FormLine {
  productId?: number
  variantId: number // 0 means no option
  quantity: number
}

const props = defineProps<{
  options: FormOptions
  submitLabel: string
  loading?: boolean
  // set when editing an existing subscription: the customer can't change and templates are hidden
  editing?: boolean
  initial?: {
    customerId: number
    planId: number
    startDate: string
    expiryDate: string
    paymentTermDays: number
    notes: string
    lines: { productId: number, variantId: number | null, quantity: number }[]
  }
}>()
const emit = defineEmits<{ submit: [payload: SubscriptionPayload] }>()
const toast = useToast()

const blankLine = (): FormLine => ({ productId: undefined, variantId: 0, quantity: 1 })

const state = reactive({
  customerId: props.initial?.customerId as number | undefined,
  planId: props.initial?.planId as number | undefined,
  startDate: props.initial?.startDate ?? todayInputValue(),
  expiryDate: props.initial?.expiryDate ?? '',
  paymentTermDays: props.initial?.paymentTermDays ?? 15,
  notes: props.initial?.notes ?? '',
  lines: props.initial?.lines.map((line) => ({ ...line, variantId: line.variantId ?? 0 })) ?? [blankLine()],
})
const templateId = ref<number>()

const customerItems = computed(() => props.options.customers.map((c) => ({ label: `${c.name} (${c.email})`, value: c.id })))
const planItems = computed(() => props.options.plans.map((p) => ({ label: `${p.name} (${titleCase(p.billingPeriod)})`, value: p.id })))
const productItems = computed(() => props.options.products.map((p) => ({ label: p.name, value: p.id })))
const templateItems = computed(() => props.options.templates.map((t) => ({ label: t.name, value: t.id })))
const selectedPlan = computed(() => props.options.plans.find((p) => p.id === state.planId))

const productById = (id?: number) => props.options.products.find((p) => p.id === id)

function variantItems(line: FormLine) {
  const variants = productById(line.productId)?.variants ?? []
  return [
    { label: 'No option', value: 0 },
    ...variants.map((v) => ({ label: `${v.attribute}: ${v.value} (+${formatMoney(v.extraPrice)})`, value: v.id })),
  ]
}

function lineTotal(line: FormLine) {
  const product = productById(line.productId)
  if (!product) return 0
  const extra = product.variants.find((v) => v.id === line.variantId)?.extraPrice ?? 0
  return (Number(product.salesPrice) + Number(extra)) * (line.quantity || 0)
}
const estimate = computed(() => state.lines.reduce((sum, line) => sum + lineTotal(line), 0))

function applyTemplate(id: number) {
  const template = props.options.templates.find((t) => t.id === id)
  if (!template) return
  state.planId = template.planId
  state.lines = template.lines.map((l) => ({ productId: l.productId, variantId: l.variantId ?? 0, quantity: l.quantity }))
}

function submit() {
  const problem = !props.editing && !state.customerId
    ? 'Choose a customer'
    : !state.planId
      ? 'Choose a plan'
      : state.lines.some((l) => !l.productId)
        ? 'Every line needs a product'
        : state.lines.some((l) => !Number.isInteger(l.quantity) || l.quantity < 1)
          ? 'Quantities must be 1 or more'
          : state.expiryDate && state.expiryDate < state.startDate
            ? 'Expiry date cannot be before the start date'
            : null
  if (problem) return toast.add({ title: problem, color: 'error' })

  emit('submit', {
    customerId: state.customerId,
    planId: state.planId!,
    startDate: state.startDate || undefined,
    expiryDate: state.expiryDate || undefined,
    paymentTermDays: state.paymentTermDays,
    notes: state.notes.trim() || null,
    lines: state.lines.map((l) => ({ productId: l.productId!, variantId: l.variantId || null, quantity: l.quantity })),
  })
}
</script>

<template>
  <form class="max-w-4xl space-y-6" @submit.prevent="submit">
    <UCard>
      <template #header><h2 class="font-semibold">Details</h2></template>

      <div class="grid gap-4 sm:grid-cols-2">
        <UFormField v-if="!editing && options.templates.length" label="Start from a template" class="sm:col-span-2" help="Fills in the plan and products for you.">
          <USelect v-model="templateId" :items="templateItems" placeholder="No template" class="w-full" @update:model-value="applyTemplate" />
        </UFormField>

        <UFormField label="Customer" required>
          <USelectMenu v-model="state.customerId" :items="customerItems" value-key="value" :disabled="editing" placeholder="Choose a customer" class="w-full" />
        </UFormField>

        <UFormField label="Plan" required>
          <USelect v-model="state.planId" :items="planItems" placeholder="Choose a plan" class="w-full" />
        </UFormField>

        <UFormField label="Start date" required>
          <UInput v-model="state.startDate" type="date" class="w-full" />
        </UFormField>

        <UFormField label="Expiry date" help="Leave empty to follow the plan's end date.">
          <UInput v-model="state.expiryDate" type="date" class="w-full" />
        </UFormField>

        <UFormField label="Payment terms (days)" help="Invoices fall due this many days after they are issued.">
          <UInputNumber v-model="state.paymentTermDays" :min="0" :max="365" class="w-full" />
        </UFormField>

        <UFormField label="Notes">
          <UTextarea v-model="state.notes" :rows="2" class="w-full" />
        </UFormField>
      </div>

      <p v-if="selectedPlan" class="mt-4 text-sm text-muted">
        {{ selectedPlan.name }} bills {{ selectedPlan.billingPeriod.toLowerCase() }}.
        <template v-if="selectedPlan.minQuantity > 1">Minimum quantity per product: {{ selectedPlan.minQuantity }}.</template>
      </p>
    </UCard>

    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <h2 class="font-semibold">Products</h2>
          <UButton type="button" icon="i-lucide-plus" size="sm" variant="outline" @click="state.lines.push(blankLine())">Add product</UButton>
        </div>
      </template>

      <div class="space-y-3">
        <div v-for="(line, i) in state.lines" :key="i" class="grid items-end gap-3 sm:grid-cols-12">
          <UFormField label="Product" class="sm:col-span-4">
            <USelectMenu v-model="line.productId" :items="productItems" value-key="value" placeholder="Choose" class="w-full" @update:model-value="line.variantId = 0" />
          </UFormField>
          <UFormField label="Option" class="sm:col-span-3">
            <USelect v-model="line.variantId" :items="variantItems(line)" :disabled="!line.productId" class="w-full" />
          </UFormField>
          <UFormField label="Quantity" class="sm:col-span-2">
            <UInputNumber v-model="line.quantity" :min="1" class="w-full" />
          </UFormField>
          <p class="pb-2 text-right text-sm text-muted sm:col-span-2">{{ formatMoney(lineTotal(line)) }}</p>
          <UButton
            type="button"
            icon="i-lucide-trash-2"
            color="error"
            variant="ghost"
            aria-label="Remove product"
            :disabled="state.lines.length === 1"
            @click="state.lines.splice(i, 1)"
          />
        </div>
      </div>

      <p class="mt-4 text-right text-sm">
        <span class="text-muted">Estimate before tax and discounts: </span>
        <span class="font-semibold">{{ formatMoney(estimate) }}</span>
      </p>
    </UCard>

    <div class="flex gap-2">
      <UButton type="submit" :loading="loading">{{ submitLabel }}</UButton>
      <UButton type="button" color="neutral" variant="outline" @click="$router.back()">Cancel</UButton>
    </div>
  </form>
</template>
