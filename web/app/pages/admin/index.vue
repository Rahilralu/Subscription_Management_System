<script setup lang="ts">
const auth = useAuthStore()
</script>

<template>
  <AppPage title="Overview">
    <p class="text-muted">Welcome, {{ auth.user?.name }}.</p>
  </AppPage>
</template>
