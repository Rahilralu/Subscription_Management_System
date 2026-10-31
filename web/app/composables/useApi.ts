export function useApi() {
  const auth = useAuthStore()

  return $fetch.create({
    baseURL: '/api',
    onRequest({ options }) {
      if (auth.token) options.headers.set('Authorization', `Bearer ${auth.token}`)
    },
    onResponseError({ response }) {
      if (response.status === 401) auth.logout()
    },
  })
}

export function apiErrorMessage(err: unknown) {
  const data = (err as { data?: { error?: { message?: string } } })?.data
  return data?.error?.message ?? 'Something went wrong'
}
