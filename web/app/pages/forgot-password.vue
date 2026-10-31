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
  <AuthCard
    :title="sent ? 'Check your inbox' : 'Forgot your password?'"
    :subtitle="sent ? undefined : 'Enter your email and we will send you a link to set a new one.'"
  >
    <div v-if="sent" class="rounded-xl border border-default bg-elevated/40 p-5 text-center">
      <span class="mx-auto grid size-12 place-items-center rounded-full bg-success/10 text-success">
        <UIcon name="i-lucide-mail-check" class="size-6" />
      </span>
      <p class="mt-4 text-sm text-default">
        If <strong class="text-highlighted">{{ state.email }}</strong> has an account, a reset link is on its way.
        It expires in 30 minutes.
      </p>
      <UButton color="neutral" variant="ghost" size="sm" class="mt-3" @click="sent = false">Use a different email</UButton>
    </div>

    <UForm v-else :schema="schema" :state="state" class="space-y-5" @submit="onSubmit">
      <UFormField label="Email" name="email">
        <UInput v-model="state.email" type="email" autocomplete="email" placeholder="you@company.com" size="lg" class="w-full" />
      </UFormField>

      <UButton type="submit" block size="lg" :loading="loading">Send reset link</UButton>
    </UForm>

    <template #footer>
      <ULink to="/login" class="inline-flex items-center gap-1 font-medium text-primary">
        <UIcon name="i-lucide-arrow-left" class="size-4" /> Back to sign in
      </ULink>
    </template>
  </AuthCard>
</template>
