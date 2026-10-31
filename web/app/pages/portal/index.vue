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

interface InvoiceSummary {
  status: string
  total: string
  amountPaid: string
  overdue: boolean
}

const api = useApi()
const auth = useAuthStore()

const { data: subscriptions, status } = await useAsyncData(
  'portal-subscriptions',
  () => api<{ data: Subscription[] }>('/portal/subscriptions').then((res) => res.data),
  { default: () => [] },
)
const { data: invoices } = await useAsyncData(
  'portal-home-invoices',
  () => api<{ data: InvoiceSummary[] }>('/portal/invoices', { query: { status: 'CONFIRMED' } }).then((res) => res.data),
  { default: () => [] },
)

const loading = computed(() => status.value === 'pending')
const firstName = computed(() => auth.user?.name?.split(' ')[0] ?? '')
const greeting = computed(() => {
  const hour = new Date().getHours()
  return hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
})

const active = computed(() => subscriptions.value.filter((s) => s.status === 'ACTIVE'))
const nextInvoice = computed(() =>
  active.value
    .filter((s) => s.nextInvoiceDate)
    .sort((a, b) => a.nextInvoiceDate!.localeCompare(b.nextInvoiceDate!))[0],
)
const outstanding = computed(() => invoices.value.reduce((sum, i) => sum + Number(i.total) - Number(i.amountPaid), 0))
const overdueCount = computed(() => invoices.value.filter((i) => i.overdue).length)

const periodLabel: Record<string, string> = { DAILY: 'day', WEEKLY: 'week', MONTHLY: 'month', YEARLY: 'year' }
const periodIcon: Record<string, string> = {
  DAILY: 'i-lucide-sun',
  WEEKLY: 'i-lucide-calendar-days',
  MONTHLY: 'i-lucide-calendar-sync',
  YEARLY: 'i-lucide-calendar-range',
}

const DAY = 86_400_000
const daysUntil = (value: string) => Math.ceil((new Date(value).getTime() - Date.now()) / DAY)

// how far through the current billing cycle we are, from the previous invoice date to the next
function cycleProgress(sub: Subscription) {
  if (sub.status !== 'ACTIVE' || !sub.nextInvoiceDate) return null
  const next = new Date(sub.nextInvoiceDate)
  const start = new Date(next)
  if (sub.plan.billingPeriod === 'DAILY') start.setUTCDate(start.getUTCDate() - 1)
  else if (sub.plan.billingPeriod === 'WEEKLY') start.setUTCDate(start.getUTCDate() - 7)
  else if (sub.plan.billingPeriod === 'MONTHLY') start.setUTCMonth(start.getUTCMonth() - 1)
  else start.setUTCFullYear(start.getUTCFullYear() - 1)
  const done = (Date.now() - start.getTime()) / (next.getTime() - start.getTime())
  return Math.min(100, Math.max(0, Math.round(done * 100)))
}

function nextLine(sub: Subscription) {
  if (sub.status === 'PAUSED') return 'Billing is paused'
  if (!sub.nextInvoiceDate) return sub.status === 'CLOSED' ? 'This subscription has ended' : 'No invoice scheduled yet'
  const days = daysUntil(sub.nextInvoiceDate)
  return days <= 0 ? 'Next invoice is due today' : `Next invoice in ${days} day${days === 1 ? '' : 's'}`
}
</script>

<template>
  <AppPage title="My subscriptions">
    <div>
      <h2 class="text-2xl font-semibold tracking-tight text-highlighted">{{ greeting }}, {{ firstName }}</h2>
      <p class="mt-1 text-sm text-muted">Here is where your subscriptions and invoices stand today.</p>
    </div>

    <div class="grid gap-4 sm:grid-cols-3">
      <StatTile
        label="Active subscriptions"
        icon="i-lucide-repeat"
        :loading="loading"
        :value="String(active.length)"
        :hint="`${subscriptions.length} in total`"
      />
      <StatTile
        label="Next invoice"
        icon="i-lucide-calendar-clock"
        :loading="loading"
        :value="nextInvoice ? formatDate(nextInvoice.nextInvoiceDate) : '—'"
        :hint="nextInvoice ? `${nextInvoice.plan.name} · ${nextInvoice.number}` : 'Nothing scheduled'"
      />
      <StatTile
        label="Outstanding balance"
        :icon="overdueCount ? 'i-lucide-clock-alert' : 'i-lucide-wallet'"
        :tone="overdueCount ? 'error' : outstanding ? 'warning' : 'success'"
        :loading="loading"
        :value="formatMoney(outstanding)"
        :hint="overdueCount ? `${overdueCount} overdue invoice${overdueCount === 1 ? '' : 's'}` : outstanding ? 'Not yet due' : 'You are all paid up'"
      />
    </div>

    <div v-if="loading" class="grid gap-4 md:grid-cols-2">
      <USkeleton v-for="i in 2" :key="i" class="h-52 rounded-xl" />
    </div>

    <UEmpty
      v-else-if="!subscriptions.length"
      icon="i-lucide-repeat"
      title="No subscriptions yet"
      description="Once Brightloop sends you a quotation or starts a subscription, it will show up here."
    />

    <div v-else class="grid gap-4 md:grid-cols-2">
      <NuxtLink
        v-for="sub in subscriptions"
        :key="sub.id"
        :to="`/portal/subscriptions/${sub.id}`"
        class="group rounded-xl focus-visible:outline-2 focus-visible:outline-primary"
      >
        <UCard class="h-full transition group-hover:shadow-(--shadow-lift) group-hover:ring-primary/40">
          <div class="flex items-start gap-3">
            <span class="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
              <UIcon :name="periodIcon[sub.plan.billingPeriod] ?? 'i-lucide-repeat'" class="size-5" />
            </span>
            <div class="min-w-0 flex-1">
              <p class="truncate font-semibold text-highlighted">{{ sub.plan.name }}</p>
              <p class="truncate font-mono text-xs text-muted">{{ sub.number }}</p>
            </div>
            <StatusBadge :status="sub.status" />
          </div>

          <p class="mt-5 text-3xl font-semibold tracking-tight text-highlighted tabular-nums">
            {{ formatMoney(sub.recurringTotal) }}
            <span class="text-sm font-normal text-muted">/ {{ periodLabel[sub.plan.billingPeriod] }} + tax</span>
          </p>

          <div class="mt-5">
            <div v-if="cycleProgress(sub) !== null" class="h-1.5 overflow-hidden rounded-full bg-accented" role="progressbar" :aria-valuenow="cycleProgress(sub)!" aria-valuemin="0" aria-valuemax="100" aria-label="Progress through the billing cycle">
              <div class="h-full rounded-full bg-primary transition-all" :style="{ width: `${cycleProgress(sub)}%` }" />
            </div>
            <div class="mt-2 flex items-center justify-between text-xs text-muted">
              <span>{{ nextLine(sub) }}</span>
              <span class="inline-flex items-center gap-1 font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
                View <UIcon name="i-lucide-arrow-right" class="size-3.5" />
              </span>
            </div>
          </div>
        </UCard>
      </NuxtLink>
    </div>
  </AppPage>
</template>
