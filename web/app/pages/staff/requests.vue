<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'

interface Request {
  id: number
  type: 'PAUSE' | 'UPGRADE'
  status: string
  note: string | null
  decisionNote: string | null
  createdAt: string
  decidedAt: string | null
  subscription: { id: number, number: string, status: string, plan: { id: number, name: string } }
  customer: { id: number, name: string, email: string }
  plan: { id: number, name: string } | null
  decidedBy: { id: number, name: string } | null
}

const api = useApi()
const toast = useToast()

const filter = ref<'PENDING' | 'APPROVED' | 'REJECTED'>('PENDING')
const tabs = [
  { label: 'Pending', value: 'PENDING' },
  { label: 'Approved', value: 'APPROVED' },
  { label: 'Rejected', value: 'REJECTED' },
]

const { data: requests, status, refresh } = await useAsyncData(
  'staff-requests',
  () => api<{ data: Request[] }>('/subscription-requests', { query: { status: filter.value } }).then((res) => res.data),
  { watch: [filter], default: () => [] },
)

const columns: TableColumn<Request>[] = [
  { id: 'customer', header: 'Customer' },
  { id: 'subscription', header: 'Subscription' },
  { id: 'request', header: 'Request' },
  { accessorKey: 'createdAt', header: 'Asked' },
  { id: 'decision', header: '' },
]

// decision modal
const open = ref(false)
const current = ref<Request>()
const approving = ref(true)
const decisionNote = ref('')
const saving = ref(false)

function decide(request: Request, approve: boolean) {
  current.value = request
  approving.value = approve
  decisionNote.value = ''
  open.value = true
}

async function submit() {
  if (!current.value) return
  saving.value = true
  try {
    await api(`/subscription-requests/${current.value.id}/${approving.value ? 'approve' : 'reject'}`, {
      method: 'POST',
      body: { decisionNote: decisionNote.value || undefined },
    })
    toast.add({
      title: approving.value ? 'Request approved' : 'Request rejected',
      description: approving.value ? `Apply the change on ${current.value.subscription.number}.` : undefined,
      color: 'success',
    })
    open.value = false
    await refresh()
  } catch (err) {
    toast.add({ title: 'Could not save decision', description: apiErrorMessage(err), color: 'error' })
  } finally {
    saving.value = false
  }
}

const requestLabel = (r: Request) => (r.type === 'PAUSE' ? 'Pause' : `Change plan to ${r.plan?.name ?? '—'}`)
</script>

<template>
  <AppPage title="Customer requests">
    <UTabs v-model="filter" :items="tabs" :content="false" size="sm" class="mb-4 w-fit" />

    <UTable :data="requests" :columns="columns" :loading="status === 'pending'">
      <template #customer-cell="{ row }">
        <p class="font-medium">{{ row.original.customer.name }}</p>
        <p class="text-xs text-muted">{{ row.original.customer.email }}</p>
      </template>
      <template #subscription-cell="{ row }">
        <p>{{ row.original.subscription.number }}</p>
        <p class="text-xs text-muted">{{ row.original.subscription.plan.name }}</p>
      </template>
      <template #request-cell="{ row }">
        <p>{{ requestLabel(row.original) }}</p>
        <p v-if="row.original.note" class="text-xs text-muted max-w-xs truncate">"{{ row.original.note }}"</p>
      </template>
      <template #createdAt-cell="{ row }">{{ formatDate(row.original.createdAt) }}</template>
      <template #decision-cell="{ row }">
        <div v-if="row.original.status === 'PENDING'" class="flex justify-end gap-2">
          <UButton size="sm" color="neutral" variant="outline" @click="decide(row.original, false)">Reject</UButton>
          <UButton size="sm" @click="decide(row.original, true)">Approve</UButton>
        </div>
        <div v-else class="text-right text-xs text-muted">
          <StatusBadge :status="row.original.status" />
          <p class="mt-1">{{ row.original.decidedBy?.name }} · {{ formatDate(row.original.decidedAt) }}</p>
        </div>
      </template>
      <template #empty>
        <p class="text-muted text-sm py-6 text-center">No {{ filter.toLowerCase() }} requests.</p>
      </template>
    </UTable>

    <UModal v-model:open="open" :title="approving ? 'Approve request' : 'Reject request'">
      <template #body>
        <p v-if="current" class="text-sm mb-4">
          {{ requestLabel(current) }} for <strong>{{ current.customer.name }}</strong> ({{ current.subscription.number }})
        </p>
        <UFormField :label="approving ? 'Note to customer (optional)' : 'Reason (shown to the customer)'">
          <UTextarea v-model="decisionNote" :rows="3" class="w-full" />
        </UFormField>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2 w-full">
          <UButton color="neutral" variant="ghost" @click="open = false">Cancel</UButton>
          <UButton :color="approving ? 'primary' : 'error'" :loading="saving" @click="submit">
            {{ approving ? 'Approve' : 'Reject' }}
          </UButton>
        </div>
      </template>
    </UModal>
  </AppPage>
</template>
