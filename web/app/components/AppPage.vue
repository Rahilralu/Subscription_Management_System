<script setup lang="ts">
defineProps<{ title: string, description?: string }>()
</script>

<template>
  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar :title="title">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <slot name="actions" />
          <UColorModeButton />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <Transition name="page" appear>
        <div class="mx-auto w-full max-w-(--ui-container) space-y-6">
          <p v-if="description" class="-mt-1 max-w-2xl text-sm text-muted">{{ description }}</p>
          <slot />
        </div>
      </Transition>
    </template>
  </UDashboardPanel>
</template>
