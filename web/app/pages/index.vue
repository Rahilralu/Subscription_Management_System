<script setup lang="ts">
// Public landing page. Logged-in users never see it: the route middleware sends them to their dashboard.
definePageMeta({ layout: 'landing' })
useSeoMeta({
  title: 'Brightloop: subscription billing on autopilot',
  description: 'Plans, subscriptions, recurring invoices, taxes, discounts and payments in one place.',
})

const promises = [
  { icon: 'i-lucide-shield-check', text: 'Each invoice is created once per billing period' },
  { icon: 'i-lucide-percent', text: 'Taxes and discounts applied automatically' },
  { icon: 'i-lucide-users', text: 'One login, three roles: admin, staff, customer' },
]

const features = [
  {
    icon: 'i-lucide-package',
    title: 'Products, variants and plans',
    text: 'Sell software by the month or year. Brand variants add to the price, and plans carry minimum quantities and availability dates.',
  },
  {
    icon: 'i-lucide-file-text',
    title: 'Quotations to subscriptions',
    text: 'Start from a template, then move through Draft, Quotation, Confirmed, Active and Closed. Everyone sees where each one stands.',
  },
  {
    icon: 'i-lucide-repeat',
    title: 'Billing that runs itself',
    text: 'Invoices are generated from subscriptions on billing day, each period exactly once, with catch-up for anything that was missed.',
  },
  {
    icon: 'i-lucide-percent',
    title: 'Taxes and discounts',
    text: 'Rules set by the admin apply to every line, show up on the next invoice, and stop when they expire or run out.',
  },
  {
    icon: 'i-lucide-wallet',
    title: 'Payments and overdue tracking',
    text: 'Record payments against invoices, see what is paid and what is outstanding, and send reminders before it becomes lost revenue.',
  },
  {
    icon: 'i-lucide-layout-dashboard',
    title: 'A finance dashboard',
    text: 'Active subscriptions, recurring revenue, collections and overdue invoices in one view, with filters and a summary.',
  },
]

const steps = [
  { title: 'Set up the catalog', text: 'Add products, variants, plans, taxes and discount rules once.' },
  { title: 'Create subscriptions', text: 'Quote from a template, then confirm and activate with a click.' },
  { title: 'Bill automatically', text: 'Invoices appear on their due dates, ready to confirm, send or print as a PDF.' },
  { title: 'Collect and report', text: 'Match payments to invoices and watch revenue and overdue balances update.' },
]

const roles = [
  {
    icon: 'i-lucide-shield-check',
    name: 'Admin',
    tagline: 'Controls the whole system',
    points: ['Products, plans, taxes and discounts', 'Staff accounts and access', 'Full audit log of changes'],
  },
  {
    icon: 'i-lucide-briefcase',
    name: 'Staff',
    tagline: 'Runs the day-to-day',
    points: ['Subscriptions and quotations', 'Invoices, payments and reminders', 'Customer pause and plan requests'],
  },
  {
    icon: 'i-lucide-user',
    name: 'Customer',
    tagline: 'Self-service portal',
    points: ['See their own subscriptions', 'Download invoices as PDF', 'Request a pause or plan change'],
  },
]
</script>

<template>
  <main>
    <!-- hero -->
    <section class="hero-glow relative overflow-hidden">
      <div class="mx-auto grid max-w-6xl items-center gap-14 px-4 pb-20 pt-14 sm:px-6 lg:grid-cols-[1fr_1.1fr] lg:gap-10 lg:pb-28 lg:pt-20">
        <div>
          <p class="rise inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary ring-1 ring-inset ring-primary/20">
            <UIcon name="i-lucide-sparkles" class="size-3.5" /> Subscription billing for Brightloop Software
          </p>

          <h1 class="rise rise-2 mt-5 text-4xl font-semibold leading-[1.1] tracking-tight text-highlighted text-balance sm:text-5xl lg:text-6xl">
            Recurring revenue, <span class="text-primary">on autopilot.</span>
          </h1>

          <p class="rise rise-3 mt-5 max-w-xl text-lg text-muted text-pretty">
            Plans, quotations, subscriptions, invoices, taxes, discounts and payments in one place. Brightloop bills every
            customer on time, and shows you exactly how much revenue is coming in.
          </p>

          <div class="rise rise-4 mt-8 flex flex-wrap items-center gap-3">
            <UButton to="/signup" size="xl" trailing-icon="i-lucide-arrow-right">Get started</UButton>
            <UButton to="/login" size="xl" color="neutral" variant="outline">Sign in</UButton>
          </div>

          <ul class="rise rise-4 mt-10 space-y-3">
            <li v-for="p in promises" :key="p.text" class="flex items-center gap-3 text-sm text-default">
              <span class="grid size-7 shrink-0 place-items-center rounded-lg bg-success/10 text-success">
                <UIcon :name="p.icon" class="size-4" />
              </span>
              {{ p.text }}
            </li>
          </ul>
        </div>

        <div class="rise rise-3 lg:pl-4">
          <LandingMock />
        </div>
      </div>
    </section>

    <!-- features -->
    <section id="features" class="border-t border-default bg-muted/50 py-20 lg:py-24">
      <div class="mx-auto max-w-6xl px-4 sm:px-6">
        <div class="mx-auto max-w-2xl text-center">
          <p class="text-sm font-medium text-primary">Features</p>
          <h2 class="mt-2 text-3xl font-semibold tracking-tight text-highlighted text-balance sm:text-4xl">
            Everything a subscription business runs on
          </h2>
          <p class="mt-4 text-muted text-pretty">
            Replace the spreadsheet, the hand-typed invoices and the quarter-end revenue scramble.
          </p>
        </div>

        <div class="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <UCard v-for="f in features" :key="f.title" class="transition-shadow hover:shadow-(--shadow-lift)" :ui="{ body: 'p-6' }">
            <span class="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary">
              <UIcon :name="f.icon" class="size-5" />
            </span>
            <h3 class="mt-5 font-semibold tracking-tight text-highlighted">{{ f.title }}</h3>
            <p class="mt-2 text-sm leading-relaxed text-muted">{{ f.text }}</p>
          </UCard>
        </div>
      </div>
    </section>

    <!-- how it works -->
    <section id="how" class="py-20 lg:py-24">
      <div class="mx-auto max-w-6xl px-4 sm:px-6">
        <div class="mx-auto max-w-2xl text-center">
          <p class="text-sm font-medium text-primary">How it works</p>
          <h2 class="mt-2 text-3xl font-semibold tracking-tight text-highlighted text-balance sm:text-4xl">
            From a new product to money in the bank
          </h2>
        </div>

        <ol class="mt-14 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <li v-for="(step, i) in steps" :key="step.title" class="relative">
            <div
              v-if="i < steps.length - 1"
              class="absolute left-12 top-5 hidden h-px w-[calc(100%-2rem)] bg-gradient-to-r from-primary/40 to-transparent lg:block"
              aria-hidden="true"
            />
            <span class="relative grid size-10 place-items-center rounded-full bg-primary text-sm font-semibold text-white ring-8 ring-default">
              {{ i + 1 }}
            </span>
            <h3 class="mt-5 font-semibold tracking-tight text-highlighted">{{ step.title }}</h3>
            <p class="mt-2 text-sm leading-relaxed text-muted">{{ step.text }}</p>
          </li>
        </ol>
      </div>
    </section>

    <!-- roles -->
    <section id="roles" class="border-t border-default bg-muted/50 py-20 lg:py-24">
      <div class="mx-auto max-w-6xl px-4 sm:px-6">
        <div class="mx-auto max-w-2xl text-center">
          <p class="text-sm font-medium text-primary">Built for your whole team</p>
          <h2 class="mt-2 text-3xl font-semibold tracking-tight text-highlighted text-balance sm:text-4xl">
            One sign-in, the right view for everyone
          </h2>
          <p class="mt-4 text-muted text-pretty">
            Each person lands on a workspace made for their job, and only sees what they should.
          </p>
        </div>

        <div class="mt-14 grid gap-5 md:grid-cols-3">
          <UCard v-for="role in roles" :key="role.name" :ui="{ body: 'p-6' }">
            <div class="flex items-center gap-3">
              <span class="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary">
                <UIcon :name="role.icon" class="size-5" />
              </span>
              <div>
                <h3 class="font-semibold tracking-tight text-highlighted">{{ role.name }}</h3>
                <p class="text-sm text-muted">{{ role.tagline }}</p>
              </div>
            </div>
            <ul class="mt-5 space-y-2.5">
              <li v-for="point in role.points" :key="point" class="flex items-start gap-2.5 text-sm text-default">
                <UIcon name="i-lucide-check" class="mt-0.5 size-4 shrink-0 text-success" />
                {{ point }}
              </li>
            </ul>
          </UCard>
        </div>
      </div>
    </section>

    <!-- closing call to action -->
    <section class="px-4 py-20 sm:px-6 lg:py-24">
      <div class="brand-gradient relative mx-auto max-w-5xl overflow-hidden rounded-3xl px-6 py-14 text-center text-white sm:px-12 sm:py-16">
        <h2 class="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">Ready to put your billing on autopilot?</h2>
        <p class="mx-auto mt-4 max-w-xl text-white/75 text-pretty">
          Create an account to see your subscriptions and invoices, or sign in to pick up where you left off.
        </p>
        <div class="mt-8 flex flex-wrap items-center justify-center gap-3">
          <UButton to="/signup" size="xl" color="neutral" variant="solid" class="!bg-white !text-brand-700 hover:!bg-white/90">
            Get started
          </UButton>
          <UButton to="/login" size="xl" variant="outline" class="!text-white !ring-white/40 hover:!bg-white/10">Sign in</UButton>
        </div>
      </div>
    </section>
  </main>
</template>
