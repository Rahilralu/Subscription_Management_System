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
// 'BANK_TRANSFER' -> 'Bank transfer'
const label = computed(() => {
  const text = shown.value.replaceAll('_', ' ').toLowerCase()
  return text.charAt(0).toUpperCase() + text.slice(1)
})
</script>

<template>
  <UBadge :color="colors[shown] ?? 'neutral'" variant="subtle" class="gap-1.5 rounded-full">
    <span class="size-1.5 rounded-full bg-current" aria-hidden="true" />
    {{ label }}
  </UBadge>
</template>
