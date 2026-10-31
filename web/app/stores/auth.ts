export type Role = 'ADMIN' | 'STAFF' | 'CUSTOMER'

export interface AuthUser {
  id: number
  name: string
  email: string
  role: Role
  customerId: number | null
}

const homeByRole: Record<Role, string> = {
  ADMIN: '/admin',
  STAFF: '/staff',
  CUSTOMER: '/portal',
}

export const useAuthStore = defineStore('auth', () => {
  const cookieOptions = { sameSite: 'strict', maxAge: 60 * 60 * 8 } as const
  const token = useCookie<string | null>('token', cookieOptions)
  const user = useCookie<AuthUser | null>('user', cookieOptions)

  const isLoggedIn = computed(() => Boolean(token.value && user.value))
  const homePath = computed(() => (user.value ? homeByRole[user.value.role] : '/login'))

  async function login(email: string, password: string) {
    const res = await $fetch<{ data: { token: string, user: AuthUser } }>('/api/auth/login', {
      method: 'POST',
      body: { email, password },
    })
    token.value = res.data.token
    user.value = res.data.user
  }

  function logout() {
    token.value = null
    user.value = null
    return navigateTo('/login')
  }

  return { token, user, isLoggedIn, homePath, login, logout }
})
