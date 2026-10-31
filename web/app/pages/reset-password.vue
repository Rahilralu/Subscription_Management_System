<script setup lang="ts">
import { z } from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'

definePageMeta({ layout: 'auth' })

const schema = z
  .object({ password: passwordSchema, confirmPassword: z.string() })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })
type Schema = z.output<typeof schema>

const route = useRoute()
const token = computed(() => String(route.query.token ?? ''))
const state = reactive({ password: '', confirmPassword: '' })
const loading = ref(false)
const toast = useToast()

async function onSubmit(event: FormSubmitEvent<Schema>) {
  loading.value = true
  try {
    await $fetch('/api/auth/reset-password', {
      method: 'POST',
      body: { token: token.value, password: event.data.password },
    })
    toast.add({ title: 'Password updated', description: 'You can sign in with your new password.', color: 'success' })
    await navigateTo('/login')
  } catch (err) {
    toast.add({ title: 'Could not reset password', description: apiErrorMessage(err), color: 'error' })
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <UCard class="w-full max-w-sm">
    <template #header>
      <h1 class="text-lg font-semibold">Set a new password</h1>
    </template>

    <UAlert
      v-if="!token"
      color="error"
      variant="subtle"
      title="This reset link is incomplete"
      description="Open the link from your email again, or ask for a new one."
    />

    <UForm v-else :schema="schema" :state="state" class="space-y-4" @submit="onSubmit">
      <UFormField
        label="New password"
        name="password"
        help="More than 8 characters, with an uppercase letter, a lowercase letter and a special character."
      >
        <UInput v-model="state.password" type="password" autocomplete="new-password" class="w-full" />
      </UFormField>

      <UFormField label="Confirm password" name="confirmPassword">
        <UInput v-model="state.confirmPassword" type="password" autocomplete="new-password" class="w-full" />
      </UFormField>

      <UButton type="submit" block :loading="loading">Update password</UButton>
    </UForm>

    <template #footer>
      <p class="text-sm text-muted text-center">
        <ULink to="/forgot-password" class="text-primary font-medium">Request a new link</ULink>
      </p>
    </template>
  </UCard>
</template>
