<script setup lang="ts">
import { z } from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'

definePageMeta({ layout: 'auth' })

const schema = z.object({
  email: z.email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
})
type Schema = z.output<typeof schema>

const state = reactive({ email: '', password: '' })
const loading = ref(false)
const auth = useAuthStore()
const toast = useToast()

// quick-fill for the seeded demo accounts; only compiled into dev builds
const demoAccounts = import.meta.dev
  ? [
      { label: 'Admin', icon: 'i-lucide-shield-check', email: 'admin@brightloop.local', password: 'Admin@1234' },
      { label: 'Staff', icon: 'i-lucide-briefcase', email: 'staff@brightloop.local', password: 'Staff@1234' },
      { label: 'Customer', icon: 'i-lucide-user', email: 'asha@example.com', password: 'Customer@1234' },
    ]
  : []

function fillDemo(account: { email: string, password: string }) {
  state.email = account.email
  state.password = account.password
}

async function onSubmit(event: FormSubmitEvent<Schema>) {
  loading.value = true
  try {
    await auth.login(event.data.email, event.data.password)
    await navigateTo(auth.homePath)
  } catch (err) {
    toast.add({ title: 'Login failed', description: apiErrorMessage(err), color: 'error' })
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <AuthCard title="Welcome back" subtitle="Sign in to manage your subscriptions.">
    <UForm :schema="schema" :state="state" class="space-y-5" @submit="onSubmit">
      <UFormField label="Email" name="email">
        <UInput v-model="state.email" type="email" autocomplete="email" placeholder="you@company.com" size="lg" class="w-full" />
      </UFormField>

      <UFormField label="Password" name="password">
        <template #hint>
          <ULink to="/forgot-password" class="text-xs">Forgot password?</ULink>
        </template>
        <PasswordInput v-model="state.password" autocomplete="current-password" size="lg" />
      </UFormField>

      <UButton type="submit" block size="lg" :loading="loading">Sign in</UButton>
    </UForm>

    <div v-if="demoAccounts.length" class="mt-8">
      <USeparator label="Demo accounts" />
      <div class="mt-4 grid grid-cols-3 gap-2">
        <UButton
          v-for="account in demoAccounts"
          :key="account.label"
          :icon="account.icon"
          color="neutral"
          variant="outline"
          size="sm"
          block
          @click="fillDemo(account)"
        >
          {{ account.label }}
        </UButton>
      </div>
    </div>

    <template #footer>
      New to Brightloop? <ULink to="/signup" class="font-medium text-primary">Create an account</ULink>
    </template>
  </AuthCard>
</template>
