<script setup lang="ts">
// Static illustration of the finance dashboard for the hero (not live data)
const id = useId()
const nav = ['i-lucide-layout-dashboard', 'i-lucide-repeat', 'i-lucide-receipt', 'i-lucide-wallet', 'i-lucide-users']
const tiles = [
  { label: 'Monthly recurring revenue', value: '₹4,20,000', icon: 'i-lucide-trending-up', chip: 'bg-primary/10 text-primary' },
  { label: 'Revenue collected', value: '₹3,18,500', icon: 'i-lucide-wallet', chip: 'bg-success/10 text-success' },
  { label: 'Overdue', value: '₹48,200', icon: 'i-lucide-clock-alert', chip: 'bg-error/10 text-error' },
]
</script>

<template>
  <div class="relative">
    <div class="overflow-hidden rounded-2xl bg-default shadow-(--shadow-lift) ring ring-default">
      <div class="flex items-center gap-1.5 border-b border-default bg-elevated/40 px-4 py-3" aria-hidden="true">
        <span class="size-2.5 rounded-full bg-accented" /><span class="size-2.5 rounded-full bg-accented" /><span class="size-2.5 rounded-full bg-accented" />
        <span class="ms-3 rounded-md bg-default px-3 py-0.5 text-[11px] text-dimmed ring ring-default">brightloop.app/staff</span>
      </div>

      <div class="grid grid-cols-[3.25rem_1fr]" aria-hidden="true">
        <div class="flex flex-col items-center gap-3 border-e border-default py-4">
          <BrandLogo :size="24" />
          <span
            v-for="(icon, i) in nav"
            :key="icon"
            class="grid size-8 place-items-center rounded-lg"
            :class="i === 0 ? 'bg-elevated text-primary' : 'text-dimmed'"
          >
            <UIcon :name="icon" class="size-4" />
          </span>
        </div>

        <div class="space-y-4 p-4 sm:p-5">
          <p class="text-sm font-semibold text-highlighted">Overview</p>

          <div class="grid grid-cols-3 gap-2 sm:gap-3">
            <div v-for="tile in tiles" :key="tile.label" class="rounded-xl p-3 ring ring-default">
              <div class="flex items-start justify-between gap-1">
                <p class="text-[10px] leading-tight text-muted sm:text-xs">{{ tile.label }}</p>
                <span class="hidden size-6 shrink-0 place-items-center rounded-lg sm:grid" :class="tile.chip">
                  <UIcon :name="tile.icon" class="size-3.5" />
                </span>
              </div>
              <p class="mt-1.5 text-sm font-semibold tracking-tight text-highlighted tabular-nums sm:text-lg">{{ tile.value }}</p>
            </div>
          </div>

          <div class="rounded-xl p-3 ring ring-default sm:p-4">
            <div class="mb-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-[11px] text-muted sm:text-xs">
              <span class="font-medium text-highlighted">Invoiced vs collected</span>
              <span class="flex items-center gap-3">
                <span class="flex items-center gap-1"><span class="h-0.5 w-3 rounded bg-primary" />Collected</span>
                <span class="flex items-center gap-1"><span class="h-0.5 w-3 rounded" style="background: #d97706" />Invoiced</span>
              </span>
            </div>
            <svg viewBox="0 0 400 130" class="h-auto w-full" role="img" aria-label="Illustrative revenue chart">
              <defs>
                <linearGradient :id="`${id}-a`" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stop-color="var(--ui-primary)" stop-opacity="0.28" />
                  <stop offset="1" stop-color="var(--ui-primary)" stop-opacity="0" />
                </linearGradient>
              </defs>
              <g stroke="currentColor" class="text-default" stroke-opacity="0.12">
                <line x1="0" y1="25" x2="400" y2="25" /><line x1="0" y1="65" x2="400" y2="65" /><line x1="0" y1="105" x2="400" y2="105" />
              </g>
              <path d="M0 105 C40 100 60 92 100 88 S170 70 210 62 S290 48 330 34 S380 26 400 20 V130 H0 Z" :fill="`url(#${id}-a)`" />
              <path d="M0 105 C40 100 60 92 100 88 S170 70 210 62 S290 48 330 34 S380 26 400 20" fill="none" stroke="var(--ui-primary)" stroke-width="2.5" stroke-linecap="round" />
              <path d="M0 98 C40 96 70 84 100 82 S170 74 210 70 S290 58 330 50 S380 40 400 36" fill="none" stroke="#d97706" stroke-width="2" stroke-dasharray="6 5" stroke-linecap="round" />
            </svg>
          </div>
        </div>
      </div>
    </div>

    <div class="absolute -bottom-5 -left-3 hidden items-center gap-2.5 rounded-xl bg-default px-3.5 py-2.5 shadow-(--shadow-lift) ring ring-default sm:flex" aria-hidden="true">
      <span class="grid size-8 place-items-center rounded-lg bg-success/10 text-success"><UIcon name="i-lucide-circle-check" class="size-4" /></span>
      <div>
        <p class="text-xs font-medium text-highlighted">Invoice paid</p>
        <p class="text-[11px] text-muted">Matched to INV/2026/00042</p>
      </div>
    </div>
    <div class="absolute -right-3 -top-4 hidden items-center gap-2.5 rounded-xl bg-default px-3.5 py-2.5 shadow-(--shadow-lift) ring ring-default sm:flex" aria-hidden="true">
      <span class="grid size-8 place-items-center rounded-lg bg-primary/10 text-primary"><UIcon name="i-lucide-repeat" class="size-4" /></span>
      <div>
        <p class="text-xs font-medium text-highlighted">Billing run complete</p>
        <p class="text-[11px] text-muted">Every due subscription invoiced</p>
      </div>
    </div>
  </div>
</template>
