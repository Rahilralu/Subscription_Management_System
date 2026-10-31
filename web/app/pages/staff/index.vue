<script setup lang="ts">
const auth = useAuthStore()
</script>

<template>
  <AppPage title="Dashboard">
    <p class="text-muted">Welcome, {{ auth.user?.name }}.</p>
  </AppPage>
</template>
