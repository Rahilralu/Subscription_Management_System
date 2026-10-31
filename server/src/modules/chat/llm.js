import { env } from '../../config/env.js'

export class LlmError extends Error {
  constructor(message, status) {
    super(message)
    this.status = status
  }
}

export const llmEnabled = () => Boolean(env.openaiApiKey)

// One call to the OpenAI Chat Completions API. Returns the assistant message
// ({ content, tool_calls }). Errors never include the request, the key or the response body.
export async function chatCompletion({ messages, tools }) {
  let res
  try {
    res = await fetch(`${env.openaiBaseUrl}/chat/completions`, {
      method: 'POST',
      headers: { authorization: `Bearer ${env.openaiApiKey}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        model: env.openaiModel,
        messages,
        ...(tools && { tools, tool_choice: 'auto' }),
        max_completion_tokens: 700,
        // reasoning models reject a custom temperature
        ...(env.openaiModel.startsWith('gpt-4') && { temperature: 0.3 }),
      }),
      signal: AbortSignal.timeout(25_000),
    })
  } catch (err) {
    throw new LlmError(err.name === 'TimeoutError' ? 'The AI service timed out' : 'The AI service is unreachable')
  }

  if (!res.ok) {
    // OpenAI explains problems like an exhausted quota in error.code; log that, not the body
    const code = await res.json().then((body) => body?.error?.code ?? body?.error?.type).catch(() => undefined)
    throw new LlmError(`The AI service returned ${res.status}${code ? ` (${code})` : ''}`, res.status)
  }

  const data = await res.json()
  const message = data.choices?.[0]?.message
  if (!message) throw new LlmError('The AI service sent an empty answer')
  return message
}
