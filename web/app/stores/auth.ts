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

  type Session = { data: { token: string, user: AuthUser } }

  function setSession(res: Session) {
    token.value = res.data.token
    user.value = res.data.user
  }

  async function login(email: string, password: string) {
    setSession(await $fetch<Session>('/api/auth/login', { method: 'POST', body: { email, password } }))
  }

  async function signup(name: string, email: string, password: string) {
    setSession(await $fetch<Session>('/api/auth/signup', { method: 'POST', body: { name, email, password } }))
  }

  function logout() {
    token.value = null
    user.value = null
    return navigateTo('/login')
  }

  return { token, user, isLoggedIn, homePath, login, signup, logout }
})
