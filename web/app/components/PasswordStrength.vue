<script setup lang="ts">
const props = defineProps<{ password: string }>()

const checks = computed(() => passwordRules.map((rule) => ({ label: rule.label, ok: rule.test(props.password) })))
const score = computed(() => checks.value.filter((c) => c.ok).length)
const meter = computed(() => (score.value <= 2 ? 'bg-error' : score.value === 3 ? 'bg-warning' : 'bg-success'))
</script>

<template>
  <div v-if="password" class="space-y-2" aria-live="polite">
    <div class="flex gap-1" aria-hidden="true">
      <span v-for="i in 4" :key="i" class="h-1 flex-1 rounded-full transition-colors" :class="i <= score ? meter : 'bg-accented'" />
    </div>
    <ul class="grid grid-cols-2 gap-x-3 gap-y-1">
      <li v-for="c in checks" :key="c.label" class="flex items-center gap-1.5 text-xs" :class="c.ok ? 'text-success' : 'text-muted'">
        <UIcon :name="c.ok ? 'i-lucide-circle-check' : 'i-lucide-circle'" class="size-3.5 shrink-0" />
        {{ c.label }}
      </li>
    </ul>
  </div>
</template>
