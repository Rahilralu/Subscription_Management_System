<script setup lang="ts">
const { open, show, hide } = useChatPanel()
const { messages, loading, error, send, retry, reset, maxLength } = useChat()
const cart = useCartStore()

const draft = ref('')
const scroller = ref<HTMLElement>()
const field = ref<{ textareaRef?: HTMLTextAreaElement }>()

const examples = [
  'I run a retail shop with 20 staff and need stock tracking and GST accounting',
  'We are a small agency and want a CRM with priority support',
  'What add-ons do you offer?',
]

async function submit(text = draft.value) {
  const message = text.trim()
  if (!message || loading.value) return
  draft.value = ''
  await send(message)
}

function scrollToEnd() {
  nextTick(() => scroller.value?.scrollTo({ top: scroller.value.scrollHeight, behavior: 'smooth' }))
}
watch([() => messages.value.length, loading, error], scrollToEnd)

watch(open, (isOpen) => {
  if (!isOpen) return
  nextTick(() => {
    field.value?.textareaRef?.focus()
    scroller.value?.scrollTo({ top: scroller.value.scrollHeight })
  })
})
</script>

<template>
  <div>
    <UButton
      v-if="!open"
      size="xl"
      icon="i-lucide-sparkles"
      class="fixed bottom-4 right-4 z-50 rounded-full shadow-lg"
      aria-label="Open the shopping assistant"
      @click="show()"
    >
      <span class="hidden sm:inline">Ask the assistant</span>
    </UButton>

    <Transition
      enter-active-class="transition duration-150 ease-out"
      enter-from-class="opacity-0 translate-y-2"
      leave-active-class="transition duration-100 ease-in"
      leave-to-class="opacity-0 translate-y-2"
    >
      <section
        v-if="open"
        role="dialog"
        aria-label="Shopping assistant"
        class="fixed inset-x-2 bottom-2 top-16 z-50 flex flex-col overflow-hidden rounded-xl border border-default bg-default shadow-2xl sm:inset-auto sm:bottom-4 sm:right-4 sm:h-[40rem] sm:max-h-[calc(100dvh-2rem)] sm:w-[26rem]"
        @keydown.esc="hide()"
      >
        <header class="flex items-center gap-2 border-b border-default px-4 py-3">
          <UIcon name="i-lucide-sparkles" class="size-5 text-primary" />
          <div class="min-w-0 flex-1">
            <p class="font-semibold leading-tight">Shopping assistant</p>
            <p class="text-xs text-muted">Describe what you need, I'll suggest products</p>
          </div>
          <UButton v-if="messages.length" color="neutral" variant="ghost" size="sm" icon="i-lucide-rotate-ccw" aria-label="Start a new chat" @click="reset()" />
          <UButton color="neutral" variant="ghost" size="sm" icon="i-lucide-x" aria-label="Close the assistant" @click="hide()" />
        </header>

        <div ref="scroller" class="flex-1 space-y-4 overflow-y-auto px-4 py-4" aria-live="polite">
          <div v-if="!messages.length" class="space-y-3">
            <div class="max-w-[90%] rounded-2xl rounded-tl-sm bg-elevated px-3 py-2 text-sm">
              Hi! Tell me about your business and what you need the software to do, and I'll find options and add-ons for you.
            </div>
            <div class="flex flex-col items-start gap-2">
              <UButton v-for="example in examples" :key="example" color="neutral" variant="outline" size="sm" class="h-auto whitespace-normal text-left" @click="submit(example)">
                {{ example }}
              </UButton>
            </div>
          </div>

          <div v-for="(message, i) in messages" :key="i" :class="message.role === 'user' ? 'flex justify-end' : ''">
            <div v-if="message.role === 'user'" class="max-w-[85%] whitespace-pre-wrap break-words rounded-2xl rounded-tr-sm bg-primary px-3 py-2 text-sm text-inverted">
              {{ message.content }}
            </div>
            <div v-else class="w-full">
              <div class="max-w-[90%] whitespace-pre-wrap break-words rounded-2xl rounded-tl-sm bg-elevated px-3 py-2 text-sm">
                {{ message.content }}
              </div>
              <p v-if="message.mode === 'basic'" class="mt-1 flex items-center gap-1 text-xs text-muted">
                <UIcon name="i-lucide-info" class="size-3.5" /> Basic mode: matched by keywords because the AI is unavailable
              </p>
              <ChatCartProposalCard v-if="message.proposal" :proposal="message.proposal" />
            </div>
          </div>

          <div v-if="loading" class="flex items-center gap-2 text-sm text-muted" role="status">
            <span class="flex gap-1" aria-hidden="true">
              <span v-for="n in 3" :key="n" class="size-1.5 animate-bounce rounded-full bg-muted" :style="{ animationDelay: `${n * 120}ms` }" />
            </span>
            Looking through the catalog…
          </div>

          <UAlert v-if="error" color="error" variant="subtle" icon="i-lucide-triangle-alert" :title="error" :actions="[{ label: 'Try again', color: 'neutral', variant: 'outline', onClick: () => retry() }]" />
        </div>

        <form class="border-t border-default p-3" @submit.prevent="submit()">
          <div class="flex items-end gap-2">
            <UTextarea
              ref="field"
              v-model="draft"
              :rows="1"
              autoresize
              :maxrows="5"
              :maxlength="maxLength"
              placeholder="e.g. 20 staff, need inventory and accounting"
              aria-label="Your message"
              class="flex-1"
              :disabled="loading"
              @keydown.enter.exact.prevent="submit()"
            />
            <UButton type="submit" icon="i-lucide-send" aria-label="Send" :loading="loading" :disabled="!draft.trim()" />
          </div>
          <p class="mt-2 flex items-center justify-between text-xs text-muted">
            <span>AI suggestions can be wrong. Check the cart before requesting a quotation.</span>
            <NuxtLink v-if="cart.count" to="/portal/cart" class="shrink-0 font-medium text-primary" @click="hide()">Cart ({{ cart.count }})</NuxtLink>
          </p>
        </form>
      </section>
    </Transition>
  </div>
</template>
