<script setup lang="ts">
withDefaults(defineProps<{
  label: string
  value: string
  hint?: string
  icon: string
  tone?: 'default' | 'success' | 'warning' | 'error'
  loading?: boolean
}>(), { tone: 'default' })

const chip = {
  default: 'bg-primary/10 text-primary',
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning',
  error: 'bg-error/10 text-error',
}
</script>

<template>
  <UCard :ui="{ body: 'p-4 sm:p-5' }" class="transition-shadow hover:shadow-(--shadow-lift)">
    <div class="flex items-start justify-between gap-3">
      <div class="min-w-0">
        <p class="text-sm text-muted">{{ label }}</p>
        <USkeleton v-if="loading" class="mt-2 h-8 w-28" />
        <p v-else class="mt-1 truncate text-2xl font-semibold tracking-tight text-highlighted tabular-nums">{{ value }}</p>
        <p v-if="hint && !loading" class="mt-1.5 flex items-center gap-1 text-xs text-muted">
          <UIcon v-if="tone === 'error'" name="i-lucide-triangle-alert" class="size-3.5 shrink-0 text-error" />
          {{ hint }}
        </p>
      </div>
      <span class="grid size-10 shrink-0 place-items-center rounded-xl" :class="chip[tone]">
        <UIcon :name="icon" class="size-5" />
      </span>
    </div>
  </UCard>
</template>
