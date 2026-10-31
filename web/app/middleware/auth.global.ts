const publicPages = ['/login', '/signup', '/forgot-password', '/reset-password']

const allowedAreas: Record<string, string[]> = {
  ADMIN: ['admin', 'staff'],
  STAFF: ['staff'],
  CUSTOMER: ['portal'],
}

export default defineNuxtRouteMiddleware((to) => {
  const auth = useAuthStore()
  const isPublic = publicPages.includes(to.path)

  if (!auth.isLoggedIn) return isPublic ? undefined : navigateTo('/login')
  if (isPublic || to.path === '/') return navigateTo(auth.homePath)

  const area = to.path.split('/')[1] ?? ''
  if (!allowedAreas[auth.user!.role]?.includes(area)) return navigateTo(auth.homePath)
})
