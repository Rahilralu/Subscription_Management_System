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
  <UCard class="w-full max-w-sm">
    <template #header>
      <h1 class="text-lg font-semibold">Create an account</h1>
      <p class="text-sm text-muted">Manage your Brightloop subscriptions</p>
    </template>

    <UForm :schema="schema" :state="state" class="space-y-4" @submit="onSubmit">
      <UFormField label="Name" name="name">
        <UInput v-model="state.name" autocomplete="name" class="w-full" />
      </UFormField>

      <UFormField label="Email" name="email">
        <UInput v-model="state.email" type="email" autocomplete="email" class="w-full" />
      </UFormField>

      <UFormField
        label="Password"
        name="password"
        help="More than 8 characters, with an uppercase letter, a lowercase letter and a special character."
      >
        <UInput v-model="state.password" type="password" autocomplete="new-password" class="w-full" />
      </UFormField>

      <UFormField label="Confirm password" name="confirmPassword">
        <UInput v-model="state.confirmPassword" type="password" autocomplete="new-password" class="w-full" />
      </UFormField>

      <UButton type="submit" block :loading="loading">Create account</UButton>
    </UForm>

    <template #footer>
      <p class="text-sm text-muted text-center">
        Already have an account? <ULink to="/login" class="text-primary font-medium">Sign in</ULink>
      </p>
    </template>
  </UCard>
</template>
