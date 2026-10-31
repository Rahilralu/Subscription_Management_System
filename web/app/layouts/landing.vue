<script setup lang="ts">
const links = [
  { label: 'Features', href: '#features' },
  { label: 'How it works', href: '#how' },
  { label: 'Roles', href: '#roles' },
]
</script>

<template>
  <div class="min-h-dvh bg-default">
    <header class="sticky top-0 z-40 border-b border-default/60 bg-default/80 backdrop-blur">
      <div class="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <NuxtLink to="/" aria-label="Brightloop home"><BrandLogo wordmark /></NuxtLink>

        <nav class="hidden items-center gap-1 md:flex" aria-label="Sections">
          <a
            v-for="link in links"
            :key="link.href"
            :href="link.href"
            class="rounded-lg px-3 py-2 text-sm font-medium text-muted transition-colors hover:bg-elevated hover:text-highlighted"
          >
            {{ link.label }}
          </a>
        </nav>

        <div class="flex items-center gap-1.5">
          <UColorModeButton />
          <UButton to="/login" color="neutral" variant="ghost" class="hidden sm:inline-flex">Sign in</UButton>
          <UButton to="/signup">Get started</UButton>
        </div>
      </div>
    </header>

    <slot />

    <footer class="border-t border-default">
      <div class="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 text-sm text-muted sm:flex-row sm:px-6">
        <BrandLogo :size="26" wordmark />
        <p>© 2026 Brightloop Software · Built for the Odoo × VIT Pune Hackathon</p>
        <div class="flex gap-4">
          <NuxtLink to="/login" class="hover:text-highlighted">Sign in</NuxtLink>
          <NuxtLink to="/signup" class="hover:text-highlighted">Create account</NuxtLink>
        </div>
      </div>
    </footer>
  </div>
</template>
