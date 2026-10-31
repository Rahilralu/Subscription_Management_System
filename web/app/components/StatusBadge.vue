<script setup lang="ts">
const props = defineProps<{ status: string }>()

type Color = 'neutral' | 'info' | 'primary' | 'success' | 'warning' | 'error'

// shared by subscription, invoice and request statuses
const colors: Record<string, Color> = {
  DRAFT: 'neutral',
  QUOTATION: 'info',
  CONFIRMED: 'primary',
  ACTIVE: 'success',
  PAUSED: 'warning',
  CLOSED: 'neutral',
  PAID: 'success',
  CANCELLED: 'neutral',
  OVERDUE: 'error',
  PENDING: 'warning',
  APPROVED: 'success',
  REJECTED: 'error',
}

const label = computed(() => props.status.charAt(0) + props.status.slice(1).toLowerCase())
</script>

<template>
  <UBadge :color="colors[status] ?? 'neutral'" variant="subtle">{{ label }}</UBadge>
</template>
