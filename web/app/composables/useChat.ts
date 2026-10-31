import type { ChatMessage, Proposal } from '~/types/chat'

const MAX_LENGTH = 1000
const MAX_HISTORY = 20

// The conversation with the shopping assistant. Shared state, so it survives moving between pages.
export function useChat() {
  const api = useApi()
  const auth = useAuthStore()

  const messages = useState<ChatMessage[]>('chat-messages', () => [])
  const loading = useState('chat-loading', () => false)
  const error = useState('chat-error', () => '')
  const owner = useState<number | null>('chat-owner', () => null)

  function reset() {
    messages.value = []
    error.value = ''
    loading.value = false
  }

  // logging out and in as someone else in the same tab must never show the previous person's chat
  if (owner.value !== (auth.user?.id ?? null)) {
    reset()
    owner.value = auth.user?.id ?? null
  }

  // only plain text goes back to the server, never the cart menus
  async function request() {
    loading.value = true
    error.value = ''
    try {
      const history = messages.value.slice(-MAX_HISTORY).map(({ role, content }) => ({ role, content }))
      const res = await api<{ data: { reply: string, proposal: Proposal | null, mode: 'ai' | 'basic' } }>('/chat/message', {
        method: 'POST',
        body: { messages: history },
      })
      messages.value.push({ role: 'assistant', content: res.data.reply, proposal: res.data.proposal, mode: res.data.mode })
    } catch (err) {
      error.value = apiErrorMessage(err)
    } finally {
      loading.value = false
    }
  }

  async function send(text: string) {
    const content = text.trim().slice(0, MAX_LENGTH)
    if (!content || loading.value) return
    messages.value.push({ role: 'user', content })
    await request()
  }

  // asks again after a failure, without repeating the customer's message
  async function retry() {
    if (loading.value || messages.value.at(-1)?.role !== 'user') return
    await request()
  }

  return { messages, loading, error, send, retry, reset, maxLength: MAX_LENGTH }
}
