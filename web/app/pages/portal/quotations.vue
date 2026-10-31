<script setup lang="ts">
import { periodLabel } from '~/types/chat'

// quotations are subscriptions that have not started yet, so they come from the same list as "My subscriptions"
interface QuotationRow {
  id: number
  number: string
  status: string
  createdAt: string
  quotationValidUntil: string | null
  notes: string | null
  recurringTotal: string
  plan: { id: number, name: string, billingPeriod: string }
}

const api = useApi()

const { data, status } = await useAsyncData(
  'portal-quotations',
  () => api<{ data: QuotationRow[] }>('/portal/subscriptions').then((res) => res.data),
  { default: () => [] as QuotationRow[] },
)

const waiting = computed(() => data.value.filter((q) => q.status === 'QUOTATION'))
const accepted = computed(() => data.value.filter((q) => q.status === 'CONFIRMED'))

const isExpired = (q: QuotationRow) => Boolean(q.quotationValidUntil && dateInputValue(q.quotationValidUntil) < todayInputValue())
// the first line of the note is added by the cart itself, so only the customer's own words are shown
const requirements = (q: QuotationRow) => q.notes?.replace(/^Requested from the shopping cart\s*/, '').trim() || null
const period = (q: QuotationRow) => periodLabel[q.plan.billingPeriod] ?? q.plan.billingPeriod
</script>

<template>
  <AppPage title="My quotations" description="Everything you have asked us to quote. Accept a quotation and our team will start your subscription.">
    <div v-if="status !== 'pending' && !waiting.length && !accepted.length" class="rounded-xl border border-dashed border-default p-8 text-center">
      <UIcon name="i-lucide-file-text" class="mx-auto size-8 text-muted" />
      <p class="mt-2 font-medium text-highlighted">No quotations yet</p>
      <p class="mt-1 text-sm text-muted">Choose what you need in the shop and send it to us as a quotation.</p>
      <UButton to="/portal/shop" class="mt-4" icon="i-lucide-store">Go to the shop</UButton>
    </div>

    <section v-if="waiting.length" class="space-y-3">
      <h2 class="text-lg font-semibold text-highlighted">Waiting for your answer</h2>
      <NuxtLink v-for="q in waiting" :key="q.id" :to="`/portal/subscriptions/${q.id}`" class="block">
        <UCard class="transition hover:ring-2 hover:ring-primary">
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p class="font-semibold text-highlighted">{{ q.number }}</p>
              <p class="text-sm text-muted">{{ q.plan.name }} plan, requested {{ formatDate(q.createdAt) }}</p>
            </div>
            <UBadge v-if="isExpired(q)" label="Expired" color="error" variant="subtle" />
            <UBadge v-else label="Ready to accept" color="warning" variant="subtle" />
          </div>

          <p v-if="requirements(q)" class="mt-3 rounded-lg bg-elevated/60 p-3 text-sm text-muted">Your note: {{ requirements(q) }}</p>

          <div class="mt-4 flex flex-wrap items-end justify-between gap-3">
            <p class="text-sm text-muted">
              <span class="text-lg font-semibold text-highlighted tabular-nums">{{ formatMoney(q.recurringTotal) }}</span>
              per {{ period(q) }}, before tax
              <template v-if="q.quotationValidUntil">
                <span v-if="isExpired(q)"> · expired {{ formatDate(q.quotationValidUntil) }}</span>
                <span v-else> · valid until {{ formatDate(q.quotationValidUntil) }}</span>
              </template>
            </p>
            <span class="text-sm font-medium text-primary">{{ isExpired(q) ? 'View' : 'View and accept' }} →</span>
          </div>
        </UCard>
      </NuxtLink>
    </section>

    <section v-if="accepted.length" class="space-y-3">
      <h2 class="text-lg font-semibold text-highlighted">Accepted, starting soon</h2>
      <NuxtLink v-for="q in accepted" :key="q.id" :to="`/portal/subscriptions/${q.id}`" class="block">
        <UCard class="transition hover:ring-2 hover:ring-primary">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p class="font-semibold text-highlighted">{{ q.number }}</p>
              <p class="text-sm text-muted">
                {{ q.plan.name }} plan ·
                <span class="tabular-nums">{{ formatMoney(q.recurringTotal) }}</span> per {{ period(q) }}, before tax
              </p>
            </div>
            <UBadge label="Accepted, our team is starting it" color="info" variant="subtle" />
          </div>
        </UCard>
      </NuxtLink>
    </section>

    <p v-if="waiting.length || accepted.length" class="text-sm text-muted">
      Subscriptions that are already running are under <NuxtLink to="/portal" class="text-primary">My subscriptions</NuxtLink>.
    </p>
  </AppPage>
</template>
