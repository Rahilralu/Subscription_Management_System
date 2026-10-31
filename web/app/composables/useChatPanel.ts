// Whether the assistant panel is open. Shared state, so the cart page can open it too.
export function useChatPanel() {
  const open = useState('chat-panel-open', () => false)
  return { open, show: () => (open.value = true), hide: () => (open.value = false) }
}
