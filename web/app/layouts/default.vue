<script setup lang="ts">
const auth = useAuthStore()
</script>

<template>
  <UDashboardGroup>
    <AppSidebar />
    <slot />
    <!-- the shopping assistant and cart are for customers only -->
    <ChatWidget v-if="auth.user?.role === 'CUSTOMER'" />
  </UDashboardGroup>
</template>
