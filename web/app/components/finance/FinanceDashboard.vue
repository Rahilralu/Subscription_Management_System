<script setup lang="ts">
import { methodLabel, type Charts, type Summary } from '~/types/finance'
import type { DashboardFilterValue } from './DashboardFilters.vue'

const api = useApi()
const toast = useToast()

const now = new Date()
const filters = ref<DashboardFilterValue>({
  from: isoDate(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))),
  to: todayIso(),
  planId: 'all',
  customerId: undefined,
})
const planId = computed(() => (filters.value.planId === 'all' ? undefined : Number(filters.value.planId)))
const query = computed(() => ({ from: filters.value.from, to: filters.value.to, planId: planId.value, customerId: filters.value.customerId }))

const { data: summary, status: summaryStatus, refresh: refreshSummary, error: summaryError } = await useAsyncData(
  'dashboard-summary',
  () => api<{ data: Summary }>('/dashboard/summary', { query: query.value }).then(r => r.data),
  { watch: [query] },
)
const { data: charts, status: chartsStatus, refresh: refreshCharts } = await useAsyncData(
  'dashboard-charts',
  () => api<{ data: Charts }>('/dashboard/charts', { query: query.value }).then(r => r.data),
  { watch: [query] },
)
watch(summaryError, (err) => {
  if (err) toast.add({ title: 'Could not load dashboard', description: apiErrorMessage(err), color: 'error' })
})

const loading = computed(() => summaryStatus.value === 'pending' && !summary.value)
const s = computed(() => summary.value)

const statusLabels: Record<string, string> = {
  DRAFT: 'Draft', QUOTATION: 'Quotation', CONFIRMED: 'Confirmed', ACTIVE: 'Active', PAUSED: 'Paused', CLOSED: 'Closed',
}
const subscriptionBars = computed(() => (charts.value?.subscriptionsByStatus ?? []).map(r => ({ label: statusLabels[r.status] ?? r.status, value: r.count })))
const methodBars = computed(() => (charts.value?.paymentsByMethod ?? []).map(r => ({ label: methodLabel(r.method), value: r.amount, detail: `${r.count} payments` })))
const agingBars = computed(() => (charts.value?.aging ?? []).map(r => ({ label: `${r.bucket} days`, value: r.amount, detail: `${r.count} invoices` })))

const showTable = ref(false)

async function refreshAll() {
  await Promise.all([refreshSummary(), refreshCharts()])
}
</script>

<template>
  <div class="space-y-6">
    <FinanceDashboardFilters v-model="filters" />

    <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
      <FinanceKpiTile
        label="Active subscriptions" icon="i-lucide-repeat" :loading="loading"
        :value="formatNumber(s?.activeSubscriptions)" :hint="`${formatNumber(s?.newSubscriptions)} started in this period`"
      />
      <FinanceKpiTile
        label="Monthly recurring revenue" icon="i-lucide-trending-up" :loading="loading"
        :value="formatMoney(s?.mrr)" :hint="`${formatMoney(s?.arr)} annual run rate · before tax`"
      />
      <FinanceKpiTile
        label="Revenue collected" icon="i-lucide-wallet" :loading="loading"
        :value="formatMoney(s?.revenue)" :hint="`${formatNumber(s?.paymentsCount)} payments in this period`"
      />
      <FinanceKpiTile
        label="Invoiced" icon="i-lucide-receipt" :loading="loading"
        :value="formatMoney(s?.invoiced)"
        :hint="`${formatNumber(s?.invoicesCount)} invoices · ${s?.collectionRate ?? 0}% collected`"
      />
      <FinanceKpiTile
        label="Outstanding" icon="i-lucide-hourglass" tone="warning" :loading="loading"
        :value="formatMoney(s?.outstanding)" :hint="`${formatNumber(s?.outstandingCount)} unpaid invoices, all dates`"
      />
      <FinanceKpiTile
        label="Overdue" icon="i-lucide-clock-alert" tone="error" :loading="loading"
        :value="formatMoney(s?.overdue)" :hint="`${formatNumber(s?.overdueCount)} invoices past their due date`"
      />
    </div>

    <UCard>
      <template #header>
        <div class="flex items-center justify-between gap-2">
          <div>
            <h3 class="font-semibold text-highlighted">Invoiced vs collected</h3>
            <p class="text-sm text-muted">12 months to {{ formatDate(filters.to) }}</p>
          </div>
          <UButton size="sm" color="neutral" variant="ghost" :icon="showTable ? 'i-lucide-chart-line' : 'i-lucide-table'" @click="showTable = !showTable">
            {{ showTable ? 'Chart' : 'Table' }}
          </UButton>
        </div>
      </template>
      <USkeleton v-if="chartsStatus === 'pending' && !charts" class="h-72 w-full" />
      <template v-else-if="charts">
        <FinanceTrendChart v-if="!showTable" :monthly="charts.monthly" />
        <div v-else class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="text-muted text-left">
              <tr><th class="py-1 font-medium">Month</th><th class="py-1 font-medium text-right">Invoiced</th><th class="py-1 font-medium text-right">Collected</th></tr>
            </thead>
            <tbody>
              <tr v-for="m in charts.monthly" :key="m.month" class="border-t border-default">
                <td class="py-1">{{ formatMonth(m.month) }}</td>
                <td class="py-1 text-right tabular-nums">{{ formatMoney(m.invoiced) }}</td>
                <td class="py-1 text-right tabular-nums">{{ formatMoney(m.collected) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>
    </UCard>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <UCard>
        <template #header>
          <h3 class="font-semibold text-highlighted">Overdue by age</h3>
          <p class="text-sm text-muted">Balance still owed, by days past due</p>
        </template>
        <FinanceBarList v-if="charts" label="Overdue" :items="agingBars" format="money" series="series2" />
      </UCard>
      <UCard>
        <template #header>
          <h3 class="font-semibold text-highlighted">Payments by method</h3>
          <p class="text-sm text-muted">Collected in the selected period</p>
        </template>
        <FinanceBarList v-if="charts && methodBars.length" label="Collected" :items="methodBars" format="money" />
        <UEmpty v-else-if="charts" icon="i-lucide-wallet" title="No payments in this period" />
      </UCard>
      <UCard>
        <template #header>
          <h3 class="font-semibold text-highlighted">Subscriptions by status</h3>
          <p class="text-sm text-muted">All subscriptions matching plan/customer</p>
        </template>
        <FinanceBarList v-if="charts" label="Subscriptions" :items="subscriptionBars" />
      </UCard>
    </div>

    <div class="grid grid-cols-1 xl:grid-cols-4 gap-4">
      <div class="xl:col-span-3 min-w-0">
        <FinanceOverdueTable :plan-id="planId" :customer-id="filters.customerId" @changed="refreshAll" />
      </div>
      <UCard>
        <template #header>
          <h3 class="font-semibold text-highlighted">Customers to chase</h3>
          <p class="text-sm text-muted">Largest overdue balances</p>
        </template>
        <ul v-if="charts?.topOverdueCustomers.length" class="space-y-3">
          <li v-for="c in charts.topOverdueCustomers" :key="c.id" class="flex items-center justify-between gap-2 text-sm">
            <div class="min-w-0">
              <p class="truncate text-highlighted">{{ c.name }}</p>
              <p class="text-xs text-muted">{{ c.invoices }} invoice{{ c.invoices === 1 ? '' : 's' }}</p>
            </div>
            <span class="tabular-nums font-medium">{{ formatMoney(c.amount) }}</span>
          </li>
        </ul>
        <UEmpty v-else icon="i-lucide-check-circle" title="No overdue customers" />
      </UCard>
    </div>
  </div>
</template>
