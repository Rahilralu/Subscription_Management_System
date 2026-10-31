<script setup lang="ts">
import { z } from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'

definePageMeta({ layout: 'auth' })

const schema = z
  .object({
    name: z.string().trim().min(2, 'Enter your name'),
    email: z.email('Enter a valid email'),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })
type Schema = z.output<typeof schema>

const state = reactive({ name: '', email: '', password: '', confirmPassword: '' })
const loading = ref(false)
const auth = useAuthStore()
const toast = useToast()

async function onSubmit(event: FormSubmitEvent<Schema>) {
  loading.value = true
  try {
    await auth.signup(event.data.name, event.data.email, event.data.password)
    await navigateTo(auth.homePath)
  } catch (err) {
    toast.add({ title: 'Sign up failed', description: apiErrorMessage(err), color: 'error' })
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <AuthCard title="Create your account" subtitle="See and manage your Brightloop subscriptions.">
    <UForm :schema="schema" :state="state" class="space-y-4" @submit="onSubmit">
      <UFormField label="Name" name="name">
        <UInput v-model="state.name" autocomplete="name" size="lg" class="w-full" />
      </UFormField>

      <UFormField label="Email" name="email">
        <UInput v-model="state.email" type="email" autocomplete="email" placeholder="you@company.com" size="lg" class="w-full" />
      </UFormField>

      <UFormField label="Password" name="password">
        <PasswordInput v-model="state.password" autocomplete="new-password" size="lg" />
        <PasswordStrength :password="state.password" class="mt-3" />
      </UFormField>

      <UFormField label="Confirm password" name="confirmPassword">
        <PasswordInput v-model="state.confirmPassword" autocomplete="new-password" size="lg" />
      </UFormField>

      <UButton type="submit" block size="lg" :loading="loading" class="mt-2">Create account</UButton>
    </UForm>

    <template #footer>
      Already have an account? <ULink to="/login" class="font-medium text-primary">Sign in</ULink>
    </template>
  </AuthCard>
</template>
