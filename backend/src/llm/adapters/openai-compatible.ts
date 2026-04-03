import OpenAI from 'openai'
import type { ChatMessage } from '../types.js'

const OPENAI_BASE = 'https://api.openai.com/v1'
const GROQ_BASE = 'https://api.groq.com/openai/v1'

export function getOpenAICompatibleClient(provider: 'openai' | 'groq', timeoutMs: number): OpenAI {
  if (provider === 'openai') {
    const apiKey = process.env.OPENAI_API_KEY
    if (apiKey === undefined || apiKey === '') {
      throw new Error('OPENAI_API_KEY is not set')
    }
    return new OpenAI({ apiKey, baseURL: OPENAI_BASE, timeout: timeoutMs })
  }
  const apiKey = process.env.GROQ_API_KEY
  if (apiKey === undefined || apiKey === '') {
    throw new Error('GROQ_API_KEY is not set')
  }
  return new OpenAI({ apiKey, baseURL: GROQ_BASE, timeout: timeoutMs })
}

export async function openAICompatibleJsonChat(
  client: OpenAI,
  model: string,
  messages: ChatMessage[],
): Promise<string> {
  const completion = await client.chat.completions.create({
    model,
    messages,
    response_format: { type: 'json_object' },
    temperature: 0.3,
  })
  const raw = completion.choices[0]?.message?.content ?? ''
  if (raw === '') {
    throw new Error('Empty response from OpenAI-compatible chat completion')
  }
  return raw
}
