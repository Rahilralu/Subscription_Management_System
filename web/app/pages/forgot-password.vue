<script setup lang="ts">
import { z } from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'

definePageMeta({ layout: 'auth' })

const schema = z.object({ email: z.email('Enter a valid email') })
type Schema = z.output<typeof schema>

const state = reactive({ email: '' })
const loading = ref(false)
const sent = ref(false)
const toast = useToast()

async function onSubmit(event: FormSubmitEvent<Schema>) {
  loading.value = true
  try {
    await $fetch('/api/auth/forgot-password', { method: 'POST', body: event.data })
    sent.value = true
  } catch (err) {
    toast.add({ title: 'Could not send the link', description: apiErrorMessage(err), color: 'error' })
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <UCard class="w-full max-w-sm">
    <template #header>
      <h1 class="text-lg font-semibold">Forgot your password?</h1>
      <p class="text-sm text-muted">We'll email you a link to set a new one.</p>
    </template>

    <UAlert
      v-if="sent"
      color="success"
      variant="subtle"
      icon="i-lucide-mail-check"
      title="Check your inbox"
      description="If that email has an account, a reset link is on its way. It expires in 30 minutes."
    />

    <UForm v-else :schema="schema" :state="state" class="space-y-4" @submit="onSubmit">
      <UFormField label="Email" name="email">
        <UInput v-model="state.email" type="email" autocomplete="email" class="w-full" />
      </UFormField>

      <UButton type="submit" block :loading="loading">Send reset link</UButton>
    </UForm>

    <template #footer>
      <p class="text-sm text-muted text-center">
        <ULink to="/login" class="text-primary font-medium">Back to sign in</ULink>
      </p>
    </template>
  </UCard>
</template>
