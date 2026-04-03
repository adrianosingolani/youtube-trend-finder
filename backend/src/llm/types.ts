import { z } from 'zod'

export const LlmProviderSchema = z.enum(['gemini', 'openai', 'groq'])
export type LlmProvider = z.infer<typeof LlmProviderSchema>

export const ModelEntrySchema = z.object({
  provider: LlmProviderSchema,
  /** Provider-specific model id (e.g. `gemini-3.1-flash-lite-preview`, `llama-3.3-70b-versatile`). */
  model: z.string().min(1),
})

export type ModelEntry = z.infer<typeof ModelEntrySchema>

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}
