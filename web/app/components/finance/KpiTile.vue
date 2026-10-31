<script setup lang="ts">
defineProps<{
  label: string
  value: string
  hint?: string
  icon: string
  tone?: 'default' | 'warning' | 'error'
  loading?: boolean
}>()
</script>

<template>
  <UCard :ui="{ body: 'p-4 sm:p-4' }">
    <div class="flex items-start justify-between gap-3">
      <div class="min-w-0">
        <p class="text-sm text-muted">{{ label }}</p>
        <USkeleton v-if="loading" class="h-8 w-28 mt-1" />
        <p v-else class="text-2xl font-semibold text-highlighted tabular-nums truncate">{{ value }}</p>
        <p v-if="hint && !loading" class="text-xs text-muted mt-1 flex items-center gap-1">
          <UIcon v-if="tone === 'error'" name="i-lucide-alert-triangle" class="text-error size-3.5" />
          {{ hint }}
        </p>
      </div>
      <div
        class="rounded-md p-2 shrink-0"
        :class="tone === 'error' ? 'bg-error/10 text-error' : tone === 'warning' ? 'bg-warning/10 text-warning' : 'bg-primary/10 text-primary'"
      >
        <UIcon :name="icon" class="size-5" />
      </div>
    </div>
  </UCard>
</template>
