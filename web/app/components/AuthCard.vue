<script setup lang="ts">
defineProps<{ title: string, subtitle?: string }>()
</script>

<template>
  <div class="w-full">
    <header class="mb-8">
      <h1 class="text-2xl font-semibold tracking-tight text-highlighted">{{ title }}</h1>
      <p v-if="subtitle" class="mt-1.5 text-sm text-muted">{{ subtitle }}</p>
    </header>

    <slot />

    <footer v-if="$slots.footer" class="mt-8 text-center text-sm text-muted">
      <slot name="footer" />
    </footer>
  </div>
</template>
