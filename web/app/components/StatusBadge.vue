<script setup lang="ts">
const props = defineProps<{ status: string, overdue?: boolean }>()

const shown = computed(() => (props.overdue ? 'OVERDUE' : props.status))
const color = computed(() => statusColors[shown.value as keyof typeof statusColors] ?? 'neutral')
</script>

<template>
  <UBadge :color="color" variant="subtle">{{ titleCase(shown) }}</UBadge>
</template>
