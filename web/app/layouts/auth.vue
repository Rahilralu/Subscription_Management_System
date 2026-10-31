<script setup lang="ts">
const benefits = [
  { icon: 'i-lucide-repeat', title: 'Invoices that bill themselves', text: 'Every subscription is invoiced on its due date, once, with nothing skipped.' },
  { icon: 'i-lucide-percent', title: 'Taxes and discounts, automatically', text: 'Rules set by the admin apply to every line, so totals are right the first time.' },
  { icon: 'i-lucide-wallet', title: 'Payments matched to invoices', text: 'See what is paid, what is outstanding and what is overdue at a glance.' },
]
</script>

<template>
  <div class="grid min-h-dvh lg:grid-cols-[1.1fr_1fr]">
    <aside class="brand-gradient relative hidden flex-col justify-between overflow-hidden p-12 text-white lg:flex">
      <NuxtLink to="/" aria-label="Brightloop home" class="w-fit"><BrandLogo :size="38" wordmark inverted /></NuxtLink>

      <div class="max-w-lg">
        <h2 class="text-4xl font-semibold leading-tight tracking-tight text-balance">
          Recurring revenue, on autopilot.
        </h2>
        <p class="mt-4 text-lg text-white/75 text-pretty">
          One place for plans, subscriptions, invoices and payments.
        </p>

        <ul class="mt-10 space-y-5">
          <li v-for="b in benefits" :key="b.title" class="flex gap-4">
            <span class="grid size-10 shrink-0 place-items-center rounded-xl bg-white/12 ring-1 ring-white/20 backdrop-blur">
              <UIcon :name="b.icon" class="size-5" />
            </span>
            <div>
              <p class="font-medium">{{ b.title }}</p>
              <p class="mt-0.5 text-sm text-white/70">{{ b.text }}</p>
            </div>
          </li>
        </ul>
      </div>

      <p class="text-sm text-white/55">Brightloop Software · Subscription billing</p>
    </aside>

    <main class="relative flex flex-col items-center justify-center bg-default px-6 py-12">
      <div class="absolute right-4 top-4"><UColorModeButton /></div>
      <NuxtLink to="/" aria-label="Brightloop home" class="mb-10 lg:hidden"><BrandLogo :size="36" wordmark /></NuxtLink>
      <div class="w-full max-w-sm">
        <slot />
      </div>
    </main>
  </div>
</template>
