<script setup lang="ts">
// overdue replaces the shown status, for confirmed invoices that are past their due date
const props = defineProps<{ status: string, overdue?: boolean }>()

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

const shown = computed(() => (props.overdue ? 'OVERDUE' : props.status))
const label = computed(() => shown.value.charAt(0) + shown.value.slice(1).toLowerCase())
</script>

<template>
  <UBadge :color="colors[shown] ?? 'neutral'" variant="subtle">{{ label }}</UBadge>
</template>
