<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'

const auth = useAuthStore()

const adminLinks: NavigationMenuItem[] = [
  { label: 'Admin', type: 'label' },
  { label: 'Overview', icon: 'i-lucide-layout-dashboard', to: '/admin', exact: true },
  { label: 'Products', icon: 'i-lucide-package', to: '/admin/products' },
  { label: 'Plans', icon: 'i-lucide-calendar-sync', to: '/admin/plans' },
  { label: 'Taxes', icon: 'i-lucide-percent', to: '/admin/taxes' },
  { label: 'Discounts', icon: 'i-lucide-tag', to: '/admin/discounts' },
  { label: 'Templates', icon: 'i-lucide-file-text', to: '/admin/templates' },
  { label: 'Users', icon: 'i-lucide-users', to: '/admin/users' },
]

const staffLinks: NavigationMenuItem[] = [
  { label: 'Operations', type: 'label' },
  { label: 'Dashboard', icon: 'i-lucide-chart-line', to: '/staff', exact: true },
  { label: 'Subscriptions', icon: 'i-lucide-repeat', to: '/staff/subscriptions' },
  { label: 'Invoices', icon: 'i-lucide-receipt', to: '/staff/invoices' },
  { label: 'Payments', icon: 'i-lucide-wallet', to: '/staff/payments' },
  { label: 'Requests', icon: 'i-lucide-inbox', to: '/staff/requests' },
  { label: 'Customers', icon: 'i-lucide-contact', to: '/staff/customers' },
]

const portalLinks: NavigationMenuItem[] = [
  { label: 'My subscriptions', icon: 'i-lucide-repeat', to: '/portal', exact: true },
  { label: 'My invoices', icon: 'i-lucide-receipt', to: '/portal/invoices' },
]

const links = computed(() => {
  if (auth.user?.role === 'ADMIN') return [adminLinks, staffLinks]
  if (auth.user?.role === 'STAFF') return [staffLinks]
  return [portalLinks]
})
</script>

<template>
  <UDashboardSidebar collapsible :ui="{ footer: 'border-t border-default' }">
    <template #header="{ collapsed }">
      <span class="font-semibold text-highlighted truncate">{{ collapsed ? 'B' : 'Brightloop' }}</span>
    </template>

    <template #default="{ collapsed }">
      <UNavigationMenu :items="links" :collapsed="collapsed" orientation="vertical" />
    </template>

    <template #footer="{ collapsed }">
      <div class="flex items-center gap-2 w-full">
        <UAvatar :alt="auth.user?.name" size="sm" />
        <div v-if="!collapsed" class="min-w-0 flex-1">
          <p class="text-sm font-medium truncate">{{ auth.user?.name }}</p>
          <p class="text-xs text-muted truncate">{{ auth.user?.email }}</p>
        </div>
        <UButton
          icon="i-lucide-log-out"
          color="neutral"
          variant="ghost"
          aria-label="Log out"
          @click="auth.logout()"
        />
      </div>
    </template>
  </UDashboardSidebar>
</template>
