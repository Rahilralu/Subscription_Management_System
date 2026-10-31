<script setup lang="ts">
import type { DropdownMenuItem, NavigationMenuItem } from '@nuxt/ui'

const auth = useAuthStore()
const colorMode = useColorMode()

const adminLinks: NavigationMenuItem[] = [
  { label: 'Admin', type: 'label' },
  { label: 'Overview', icon: 'i-lucide-layout-dashboard', to: '/admin', exact: true },
  { label: 'Products', icon: 'i-lucide-package', to: '/admin/products' },
  { label: 'Plans', icon: 'i-lucide-calendar-sync', to: '/admin/plans' },
  { label: 'Taxes', icon: 'i-lucide-percent', to: '/admin/taxes' },
  { label: 'Discounts', icon: 'i-lucide-tag', to: '/admin/discounts' },
  { label: 'Templates', icon: 'i-lucide-file-text', to: '/admin/templates' },
  { label: 'Users', icon: 'i-lucide-users', to: '/admin/users' },
  { label: 'Audit log', icon: 'i-lucide-scroll-text', to: '/admin/audit' },
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
  { label: 'Account', type: 'label' },
  { label: 'My subscriptions', icon: 'i-lucide-repeat', to: '/portal', exact: true },
  { label: 'My invoices', icon: 'i-lucide-receipt', to: '/portal/invoices' },
]

const links = computed(() => {
  if (auth.user?.role === 'ADMIN') return [adminLinks, staffLinks]
  if (auth.user?.role === 'STAFF') return [staffLinks]
  return [portalLinks]
})

const roleLabel = computed(() => {
  const role = auth.user?.role ?? ''
  return role.charAt(0) + role.slice(1).toLowerCase()
})

const menu = computed<DropdownMenuItem[][]>(() => [
  [{ label: auth.user?.name, description: auth.user?.email, type: 'label' }],
  [
    { label: 'Light', icon: 'i-lucide-sun', type: 'checkbox', checked: colorMode.preference === 'light', onSelect: (e) => { e.preventDefault(); colorMode.preference = 'light' } },
    { label: 'Dark', icon: 'i-lucide-moon', type: 'checkbox', checked: colorMode.preference === 'dark', onSelect: (e) => { e.preventDefault(); colorMode.preference = 'dark' } },
    { label: 'System', icon: 'i-lucide-monitor', type: 'checkbox', checked: colorMode.preference === 'system', onSelect: (e) => { e.preventDefault(); colorMode.preference = 'system' } },
  ],
  [{ label: 'Log out', icon: 'i-lucide-log-out', color: 'error', onSelect: () => auth.logout() }],
])
</script>

<template>
  <UDashboardSidebar collapsible>
    <template #header="{ collapsed }">
      <NuxtLink :to="auth.homePath" class="flex items-center" aria-label="Brightloop home">
        <BrandLogo :wordmark="!collapsed" />
      </NuxtLink>
    </template>

    <template #default="{ collapsed }">
      <UNavigationMenu :items="links" :collapsed="collapsed" :tooltip="collapsed" orientation="vertical" />
    </template>

    <template #footer="{ collapsed }">
      <UDropdownMenu
        :items="menu"
        :content="{ align: 'start', side: collapsed ? 'right' : 'top', collisionPadding: 12 }"
        :ui="{ content: 'w-60' }"
      >
        <button
          type="button"
          class="flex w-full items-center gap-2.5 rounded-lg p-2 text-left transition-colors hover:bg-elevated data-[state=open]:bg-elevated focus-visible:outline-2 focus-visible:outline-primary"
          :class="{ 'justify-center': collapsed }"
          aria-label="Account menu"
        >
          <UAvatar :alt="auth.user?.name" size="sm" />
          <template v-if="!collapsed">
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-medium text-highlighted">{{ auth.user?.name }}</p>
              <p class="truncate text-xs text-muted">{{ roleLabel }}</p>
            </div>
            <UIcon name="i-lucide-chevrons-up-down" class="size-4 shrink-0 text-dimmed" />
          </template>
        </button>
      </UDropdownMenu>
    </template>
  </UDashboardSidebar>
</template>
