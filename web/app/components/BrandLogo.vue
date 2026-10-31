<script setup lang="ts">
// Brightloop mark: a loop with an arrow (recurring billing), on a brand gradient tile
withDefaults(defineProps<{ size?: number, wordmark?: boolean, inverted?: boolean }>(), { size: 32, wordmark: false, inverted: false })
const id = useId()
</script>

<template>
  <span class="inline-flex items-center gap-2.5">
    <svg :width="size" :height="size" viewBox="0 0 32 32" fill="none" aria-hidden="true" class="shrink-0">
      <defs>
        <linearGradient :id="`${id}-g`" x1="2" y1="2" x2="30" y2="30" gradientUnits="userSpaceOnUse">
          <stop stop-color="#8f90f9" />
          <stop offset="1" stop-color="#4a45dc" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" :fill="`url(#${id}-g)`" />
      <path d="M21.6 10.4A7.6 7.6 0 1 0 23.6 16" stroke="#fff" stroke-width="2.6" stroke-linecap="round" />
      <path d="M23.8 7.6v4.6h-4.6" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" />
    </svg>
    <span v-if="wordmark" class="text-[15px] font-semibold tracking-tight" :class="inverted ? 'text-white' : 'text-highlighted'">Brightloop</span>
  </span>
</template>
