<script setup lang="ts">
// Dashboard tile; the look lives in the shared StatTile
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
  <StatTile v-bind="$props" />
</template>
