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
  <AuthCard title="Set a new password" subtitle="Choose a strong password you have not used before.">
    <UAlert
      v-if="!token"
      color="error"
      variant="subtle"
      icon="i-lucide-link-2-off"
      title="This reset link is incomplete"
      description="Open the link from your email again, or ask for a new one."
    />

    <UForm v-else :schema="schema" :state="state" class="space-y-4" @submit="onSubmit">
      <UFormField label="New password" name="password">
        <PasswordInput v-model="state.password" autocomplete="new-password" size="lg" />
        <PasswordStrength :password="state.password" class="mt-3" />
      </UFormField>

      <UFormField label="Confirm password" name="confirmPassword">
        <PasswordInput v-model="state.confirmPassword" autocomplete="new-password" size="lg" />
      </UFormField>

      <UButton type="submit" block size="lg" :loading="loading" class="mt-2">Update password</UButton>
    </UForm>

    <template #footer>
      <ULink to="/forgot-password" class="font-medium text-primary">Request a new link</ULink>
    </template>
  </AuthCard>
</template>
