<script setup lang="ts">
import type { FormOptions, SubscriptionDetail, SubscriptionPayload } from '~/types/billing'

const api = useApi()
const toast = useToast()
const id = useRoute().params.id as string
const saving = ref(false)

const { data: options } = await useAsyncData('subscription-form-options', () =>
  api<{ data: FormOptions }>('/subscriptions/options').then((res) => res.data),
)
const { data: sub, error } = await useAsyncData(`subscription-edit-${id}`, () =>
  api<{ data: SubscriptionDetail }>(`/subscriptions/${id}`).then((res) => res.data),
)

const editable = computed(() => sub.value && ['DRAFT', 'QUOTATION'].includes(sub.value.status))

const initial = computed(() => {
  const s = sub.value
  if (!s) return undefined
  return {
    customerId: s.customer.id,
    planId: s.plan.id,
    startDate: dateInputValue(s.startDate),
    expiryDate: dateInputValue(s.expiryDate),
    paymentTermDays: s.paymentTermDays,
    notes: s.notes ?? '',
    lines: s.lines.map(({ productId, variantId, quantity }) => ({ productId, variantId, quantity })),
  }
})

async function save(payload: SubscriptionPayload) {
  saving.value = true
  try {
    // an empty expiry date on the form means "no expiry", which the API wants as null
    const { customerId: _customerId, ...body } = payload
    await api(`/subscriptions/${id}`, { method: 'PATCH', body: { ...body, expiryDate: payload.expiryDate ?? null } })
    toast.add({ title: 'Changes saved', color: 'success' })
    await navigateTo(`/staff/subscriptions/${id}`)
  } catch (err) {
    toast.add({ title: 'Could not save', description: apiErrorMessage(err), color: 'error' })
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <AppPage :title="sub ? `Edit ${sub.number}` : 'Edit subscription'">
    <UAlert v-if="error" color="error" variant="subtle" title="Subscription not found" />
    <UAlert
      v-else-if="sub && !editable"
      color="warning"
      variant="subtle"
      title="This subscription can no longer be edited"
      description="Only drafts and quotations can be changed."
    />
    <SubscriptionForm
      v-else-if="sub && options && initial"
      :options="options"
      :initial="initial"
      editing
      submit-label="Save changes"
      :loading="saving"
      @submit="save"
    />
  </AppPage>
</template>
