<script setup lang="ts">
defineProps<{ title: string, description: string, confirmLabel: string, loading?: boolean }>()
const open = defineModel<boolean>('open', { required: true })
const emit = defineEmits<{ confirm: [] }>()
</script>

<template>
  <UModal v-model:open="open" :title="title" :description="description">
    <template #footer>
      <div class="flex w-full justify-end gap-2">
        <UButton color="neutral" variant="outline" @click="open = false">Keep it</UButton>
        <UButton color="error" :loading="loading" @click="emit('confirm')">{{ confirmLabel }}</UButton>
      </div>
    </template>
  </UModal>
</template>
