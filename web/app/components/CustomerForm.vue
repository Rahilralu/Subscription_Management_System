<script setup lang="ts">
import { z } from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import type { CustomerContact, CustomerInput } from '~/types/customers'

const props = defineProps<{ customer: CustomerContact | null }>()
const open = defineModel<boolean>('open', { required: true })
const emit = defineEmits<{ saved: [] }>()

const api = useApi()
const toast = useToast()
const saving = ref(false)

const schema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100, 'Keep the name under 100 characters'),
  email: z.string().trim().min(1, 'Email is required').pipe(z.email('Enter a valid email')),
  phone: z.string().trim().max(30, 'Keep the phone number under 30 characters'),
  address: z.string().trim().max(300, 'Keep the address under 300 characters'),
})

type Schema = z.output<typeof schema>

const emptyCustomer = (): CustomerInput => ({ name: '', email: '', phone: '', address: '' })
const state = reactive<CustomerInput>(emptyCustomer())

// the email is the customer's username once they have a login
const emailLocked = computed(() => Boolean(props.customer?.hasLogin))

watch(open, (isOpen) => {
  if (!isOpen) return
  Object.assign(
    state,
    props.customer
      ? { name: props.customer.name, email: props.customer.email, phone: props.customer.phone ?? '', address: props.customer.address ?? '' }
      : emptyCustomer(),
  )
})

async function onSubmit(event: FormSubmitEvent<Schema>) {
  saving.value = true
  try {
    if (props.customer) {
      const { email, ...rest } = event.data
      await api(`/customers/${props.customer.id}`, { method: 'PUT', body: emailLocked.value ? rest : { ...rest, email } })
    } else {
      await api('/customers', { method: 'POST', body: event.data })
    }
    toast.add({ title: props.customer ? 'Customer updated' : 'Customer added', color: 'success' })
    open.value = false
    emit('saved')
  } catch (err) {
    toast.add({ title: 'Could not save customer', description: apiErrorMessage(err), color: 'error' })
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <USlideover v-model:open="open" :title="customer ? 'Edit customer' : 'Add customer'">
    <template #body>
      <UForm id="customer-form" :schema="schema" :state="state" class="space-y-4" @submit="onSubmit">
        <UFormField label="Name" name="name" required>
          <UInput v-model="state.name" placeholder="Asha Kulkarni" class="w-full" />
        </UFormField>

        <UFormField
          label="Email"
          name="email"
          required
          :help="emailLocked ? 'This customer has a login, so the email cannot be changed.' : undefined"
        >
          <UInput v-model="state.email" type="email" :disabled="emailLocked" placeholder="name@example.com" class="w-full" />
        </UFormField>

        <UFormField label="Phone" name="phone">
          <UInput v-model="state.phone" type="tel" class="w-full" />
        </UFormField>

        <UFormField label="Address" name="address">
          <UTextarea v-model="state.address" :rows="3" class="w-full" />
        </UFormField>

        <UAlert
          v-if="!customer"
          icon="i-lucide-info"
          color="neutral"
          variant="subtle"
          description="This does not create a login. If the customer signs up later with the same email, their account is linked to this record."
        />
      </UForm>
    </template>

    <template #footer>
      <div class="flex w-full justify-end gap-2">
        <UButton color="neutral" variant="ghost" @click="open = false">Cancel</UButton>
        <UButton type="submit" form="customer-form" :loading="saving">Save</UButton>
      </div>
    </template>
  </USlideover>
</template>
