import { z } from 'zod'
import { ModelEntrySchema, type ModelEntry } from './types.js'

const ChainSchema = z.array(ModelEntrySchema).min(1)

/**
 * Default priority: Gemini first, then Groq-hosted models (single deduped `openai/gpt-oss-20b`).
 * Override entire chain with `LLM_MODEL_CHAIN` JSON if needed.
 */
export const DEFAULT_MODEL_CHAIN: readonly ModelEntry[] = [
  { provider: 'gemini', model: 'gemini-3.1-flash-lite-preview' },
  { provider: 'groq', model: 'openai/gpt-oss-20b' },
  { provider: 'groq', model: 'groq/compound' },
  { provider: 'groq', model: 'groq/compound-mini' },
  { provider: 'groq', model: 'llama-3.3-70b-versatile' },
  { provider: 'groq', model: 'meta-llama/llama-4-scout-17b-16e-instruct' },
  { provider: 'groq', model: 'openai/gpt-oss-120b' },
  { provider: 'groq', model: 'qwen/qwen3-32b' },
  { provider: 'groq', model: 'llama-3.1-8b-instant' },
]

/** Groq compound models often appear with a vendor prefix; adjust via env chain if your account uses different ids. */
export function loadModelChain(): ModelEntry[] {
  const raw = process.env.LLM_MODEL_CHAIN
  if (raw !== undefined && raw.trim() !== '') {
    const parsed: unknown = JSON.parse(raw)
    return ChainSchema.parse(parsed)
  }
  return [...DEFAULT_MODEL_CHAIN]
}
