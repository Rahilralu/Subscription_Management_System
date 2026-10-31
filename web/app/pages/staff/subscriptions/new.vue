<script setup lang="ts">
import type { FormOptions, SubscriptionDetail, SubscriptionPayload } from '~/types/billing'

const api = useApi()
const toast = useToast()
const saving = ref(false)

const { data: options } = await useAsyncData('subscription-form-options', () =>
  api<{ data: FormOptions }>('/subscriptions/options').then((res) => res.data),
)

async function create(payload: SubscriptionPayload) {
  saving.value = true
  try {
    const res = await api<{ data: SubscriptionDetail }>('/subscriptions', { method: 'POST', body: payload })
    toast.add({ title: `${res.data.number} created`, color: 'success' })
    await navigateTo(`/staff/subscriptions/${res.data.id}`)
  } catch (err) {
    toast.add({ title: 'Could not create the subscription', description: apiErrorMessage(err), color: 'error' })
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <AppPage title="New subscription">
    <SubscriptionForm v-if="options" :options="options" submit-label="Create draft" :loading="saving" @submit="create" />
  </AppPage>
</template>
