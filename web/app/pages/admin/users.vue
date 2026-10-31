<script setup lang="ts">
import { z } from 'zod'
import type { FormSubmitEvent, TableColumn } from '@nuxt/ui'

interface User {
  id: number
  name: string
  email: string
  role: 'ADMIN' | 'STAFF' | 'CUSTOMER'
  active: boolean
  createdAt: string
}

const api = useApi()
const auth = useAuthStore()
const toast = useToast()

const roleFilter = ref<'STAFF' | 'ADMIN' | 'CUSTOMER' | 'ALL'>('ALL')
const search = ref('')
const query = ref('')
let searchTimer: ReturnType<typeof setTimeout> | undefined
watch(search, (value) => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => (query.value = value.trim()), 300)
})
const roleOptions = [
  { label: 'All roles', value: 'ALL' },
  { label: 'Admin', value: 'ADMIN' },
  { label: 'Staff', value: 'STAFF' },
  { label: 'Customer', value: 'CUSTOMER' },
]

const { data: users, status, refresh } = await useAsyncData(
  'admin-users',
  () =>
    api<{ data: User[] }>('/users', {
      query: { role: roleFilter.value === 'ALL' ? undefined : roleFilter.value, q: query.value || undefined },
    }).then((res) => res.data),
  { watch: [roleFilter, query], default: () => [] },
)

const columns: TableColumn<User>[] = [
  { accessorKey: 'name', header: 'User' },
  { accessorKey: 'role', header: 'Role' },
  { accessorKey: 'createdAt', header: 'Added' },
  { accessorKey: 'active', header: 'Active' },
]

const busyId = ref<number | null>(null)

async function setActive(user: User, active: boolean) {
  busyId.value = user.id
  try {
    await api(`/users/${user.id}`, { method: 'PATCH', body: { active } })
    toast.add({ title: active ? `${user.name} can sign in again` : `${user.name} has been deactivated`, color: 'success' })
    await refresh()
  } catch (err) {
    toast.add({ title: 'Could not update user', description: apiErrorMessage(err), color: 'error' })
  } finally {
    busyId.value = null
  }
}

// add staff modal
const schema = z.object({
  name: z.string().trim().min(2, 'Enter a name'),
  email: z.email('Enter a valid email'),
  role: z.enum(['STAFF', 'ADMIN']),
  password: passwordSchema,
})
type Schema = z.output<typeof schema>

const open = ref(false)
const saving = ref(false)
const blank = () => ({ name: '', email: '', role: 'STAFF' as const, password: '' })
const state = reactive<{ name: string, email: string, role: 'STAFF' | 'ADMIN', password: string }>(blank())

function openModal() {
  Object.assign(state, blank())
  open.value = true
}

async function onSubmit(event: FormSubmitEvent<Schema>) {
  saving.value = true
  try {
    await api('/users', { method: 'POST', body: event.data })
    toast.add({ title: `${event.data.name} added`, description: 'Share the password with them so they can sign in.', color: 'success' })
    open.value = false
    await refresh()
  } catch (err) {
    toast.add({ title: 'Could not add user', description: apiErrorMessage(err), color: 'error' })
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <AppPage title="Users">
    <template #actions>
      <UButton icon="i-lucide-user-plus" @click="openModal">Add staff</UButton>
    </template>

    <div class="flex flex-wrap gap-2 mb-4">
      <UInput v-model="search" icon="i-lucide-search" placeholder="Search name or email" class="w-64" />
      <USelect v-model="roleFilter" :items="roleOptions" class="w-40" />
    </div>

    <UTable :data="users" :columns="columns" :loading="status === 'pending'">
      <template #name-cell="{ row }">
        <div class="flex items-center gap-3">
          <UAvatar :alt="row.original.name" size="md" />
          <div class="min-w-0">
            <p class="truncate font-medium text-highlighted">{{ row.original.name }}</p>
            <p class="truncate text-xs text-muted">{{ row.original.email }}</p>
          </div>
        </div>
      </template>
      <template #role-cell="{ row }">
        <UBadge :color="row.original.role === 'ADMIN' ? 'primary' : row.original.role === 'STAFF' ? 'info' : 'neutral'" variant="subtle">
          {{ titleCase(row.original.role) }}
        </UBadge>
      </template>
      <template #createdAt-cell="{ row }">{{ formatDate(row.original.createdAt) }}</template>
      <template #active-cell="{ row }">
        <!-- customers sign up themselves and are managed through their own account -->
        <span v-if="row.original.role === 'CUSTOMER'" class="text-muted text-sm">—</span>
        <USwitch
          v-else
          :label="row.original.active ? 'Active' : 'Inactive'"
          :model-value="row.original.active"
          :loading="busyId === row.original.id"
          :disabled="row.original.id === auth.user?.id"
          @update:model-value="setActive(row.original, $event)"
        />
      </template>
      <template #empty>
        <p class="text-muted text-sm py-6 text-center">No users match these filters.</p>
      </template>
    </UTable>

    <UModal v-model:open="open" title="Add staff member">
      <template #body>
        <UForm id="add-user" :schema="schema" :state="state" class="space-y-4" @submit="onSubmit">
          <UFormField label="Name" name="name">
            <UInput v-model="state.name" class="w-full" />
          </UFormField>
          <UFormField label="Email" name="email">
            <UInput v-model="state.email" type="email" class="w-full" />
          </UFormField>
          <UFormField label="Role" name="role">
            <USelect
              v-model="state.role"
              :items="[{ label: 'Staff', value: 'STAFF' }, { label: 'Admin', value: 'ADMIN' }]"
              class="w-full"
            />
          </UFormField>
          <UFormField
            label="Temporary password"
            name="password"
            help="More than 8 characters, with an uppercase letter, a lowercase letter and a special character."
          >
            <UInput v-model="state.password" type="password" autocomplete="new-password" class="w-full" />
          </UFormField>
        </UForm>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2 w-full">
          <UButton color="neutral" variant="ghost" @click="open = false">Cancel</UButton>
          <UButton type="submit" form="add-user" :loading="saving">Add user</UButton>
        </div>
      </template>
    </UModal>
  </AppPage>
</template>
