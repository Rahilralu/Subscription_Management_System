<script setup lang="ts">
import { z } from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import type { PlanRecord, PlanInput, PlanRules } from '~/types/catalog'

const props = defineProps<{ plan: PlanRecord | null }>()
const open = defineModel<boolean>('open', { required: true })
const emit = defineEmits<{ saved: [] }>()

const api = useApi()
const toast = useToast()
const saving = ref(false)

const periodOptions = [
  { label: 'Daily', value: 'DAILY' },
  { label: 'Weekly', value: 'WEEKLY' },
  { label: 'Monthly', value: 'MONTHLY' },
  { label: 'Yearly', value: 'YEARLY' },
]

const rules: { key: keyof PlanRules, label: string, description: string }[] = [
  { key: 'renewable', label: 'Renewable', description: 'Staff can renew a subscription for another term' },
  { key: 'pausable', label: 'Pausable', description: 'Subscriptions can be paused and resumed' },
  { key: 'closable', label: 'Closable', description: 'Subscriptions can be closed before they expire' },
  { key: 'autoClose', label: 'Auto-close', description: 'Close subscriptions automatically on their expiry date' },
]

const schema = z
  .object({
    name: z.string().trim().min(1, 'Name is required').max(100),
    price: z.string().trim().regex(/^\d{1,10}(\.\d{1,2})?$/, 'Enter a valid amount'),
    billingPeriod: z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY']),
    minQuantity: z.number({ error: 'Required' }).int().min(1, 'At least 1'),
    startDate: z.iso.date('Enter a valid date'),
    endDate: z.union([z.literal(''), z.iso.date('Enter a valid date')]),
    autoClose: z.boolean(),
    closable: z.boolean(),
    pausable: z.boolean(),
    renewable: z.boolean(),
  })
  .refine((plan) => !plan.endDate || plan.endDate > plan.startDate, {
    path: ['endDate'],
    message: 'End date must be after start date',
  })

type Schema = z.output<typeof schema>

function emptyPlan(): PlanInput {
  return {
    name: '',
    price: '',
    billingPeriod: 'MONTHLY',
    minQuantity: 1,
    startDate: todayInputValue(),
    endDate: '',
    autoClose: false,
    closable: true,
    pausable: false,
    renewable: true,
  }
}

const state = reactive<PlanInput>(emptyPlan())

watch(open, (isOpen) => {
  if (isOpen) Object.assign(state, props.plan ? planToInput(props.plan) : emptyPlan())
})

async function onSubmit(event: FormSubmitEvent<Schema>) {
  saving.value = true
  const body = planBody(event.data)

  try {
    if (props.plan) {
      await api(`/catalog/plans/${props.plan.id}`, { method: 'PUT', body })
    } else {
      await api('/catalog/plans', { method: 'POST', body })
    }
    toast.add({ title: props.plan ? 'Plan updated' : 'Plan added', color: 'success' })
    open.value = false
    emit('saved')
  } catch (err) {
    toast.add({ title: 'Could not save plan', description: apiErrorMessage(err), color: 'error' })
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <USlideover v-model:open="open" :title="plan ? 'Edit plan' : 'Add plan'">
    <template #body>
      <UForm id="plan-form" :schema="schema" :state="state" class="space-y-4" @submit="onSubmit">
        <UFormField label="Name" name="name" required>
          <UInput v-model="state.name" placeholder="Monthly" class="w-full" />
        </UFormField>

        <div class="grid gap-4 sm:grid-cols-2">
          <UFormField label="Price" name="price" required>
            <UInput v-model="state.price" inputmode="decimal" placeholder="0.00" class="w-full">
              <template #leading><span class="text-sm text-muted">₹</span></template>
            </UInput>
          </UFormField>

          <UFormField label="Billing period" name="billingPeriod" required>
            <USelect v-model="state.billingPeriod" :items="periodOptions" class="w-full" />
          </UFormField>
        </div>

        <UFormField label="Minimum quantity" name="minQuantity" help="Every subscription line needs at least this many units">
          <UInputNumber v-model="state.minQuantity" :min="1" class="w-full" />
        </UFormField>

        <div class="grid gap-4 sm:grid-cols-2">
          <UFormField label="Available from" name="startDate" required>
            <UInput v-model="state.startDate" type="date" class="w-full" />
          </UFormField>

          <UFormField label="Available until" name="endDate" help="Leave empty for no end date">
            <UInput v-model="state.endDate" type="date" :min="state.startDate" class="w-full" />
          </UFormField>
        </div>

        <fieldset class="space-y-3">
          <legend class="mb-2 text-sm font-medium text-highlighted">Rules</legend>
          <USwitch
            v-for="rule in rules"
            :key="rule.key"
            v-model="state[rule.key]"
            :label="rule.label"
            :description="rule.description"
          />
        </fieldset>
      </UForm>
    </template>

    <template #footer>
      <div class="flex w-full justify-end gap-2">
        <UButton color="neutral" variant="ghost" @click="open = false">Cancel</UButton>
        <UButton type="submit" form="plan-form" :loading="saving">Save</UButton>
      </div>
    </template>
  </USlideover>
</template>
