<script setup lang="ts">
interface Subscription {
  id: number
  number: string
  status: string
  startDate: string
  expiryDate: string | null
  nextInvoiceDate: string | null
  recurringTotal: string
  plan: { id: number, name: string, billingPeriod: string }
}

const api = useApi()
const { data: subscriptions, status } = await useAsyncData(
  'portal-subscriptions',
  () => api<{ data: Subscription[] }>('/portal/subscriptions').then((res) => res.data),
  { default: () => [] },
)

const periodLabel: Record<string, string> = { DAILY: 'day', WEEKLY: 'week', MONTHLY: 'month', YEARLY: 'year' }
</script>

<template>
  <AppPage title="My subscriptions">
    <div v-if="status === 'pending'" class="grid gap-4 md:grid-cols-2">
      <USkeleton v-for="i in 2" :key="i" class="h-40" />
    </div>

    <UEmpty
      v-else-if="!subscriptions.length"
      icon="i-lucide-repeat"
      title="No subscriptions yet"
      description="Once Brightloop sends you a quotation or starts a subscription, it will show up here."
    />

    <div v-else class="grid gap-4 md:grid-cols-2">
      <NuxtLink v-for="sub in subscriptions" :key="sub.id" :to="`/portal/subscriptions/${sub.id}`">
        <UCard class="h-full hover:ring-primary transition">
          <div class="flex items-start justify-between gap-2">
            <div>
              <p class="font-semibold">{{ sub.plan.name }}</p>
              <p class="text-sm text-muted">{{ sub.number }}</p>
            </div>
            <StatusBadge :status="sub.status" />
          </div>

          <p class="mt-4 text-2xl font-semibold">
            {{ formatMoney(sub.recurringTotal) }}
            <span class="text-sm font-normal text-muted">/ {{ periodLabel[sub.plan.billingPeriod] }} + tax</span>
          </p>

          <dl class="mt-4 grid grid-cols-2 gap-2 text-sm">
            <div>
              <dt class="text-muted">Started</dt>
              <dd>{{ formatDate(sub.startDate) }}</dd>
            </div>
            <div>
              <dt class="text-muted">Next invoice</dt>
              <dd>{{ formatDate(sub.nextInvoiceDate) }}</dd>
            </div>
          </dl>
        </UCard>
      </NuxtLink>
    </div>
  </AppPage>
</template>
