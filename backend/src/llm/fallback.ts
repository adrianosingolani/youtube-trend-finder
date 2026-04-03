import type { Logger } from 'pino'
import type { ModelEntry } from './types.js'
import { isRetryableLlmError } from './retryable.js'

export async function executeWithFallback<T>(params: {
  chain: readonly ModelEntry[]
  startIndex: number
  logger: Logger
  run: (entry: ModelEntry, chainIndex: number) => Promise<T>
}): Promise<T> {
  const { chain, logger, run } = params
  if (chain.length === 0) {
    throw new Error('LLM model chain is empty')
  }
  const start = Math.min(Math.max(0, params.startIndex), chain.length - 1)
  let lastError: unknown

  for (let i = start; i < chain.length; i++) {
    const entry = chain[i]!
    try {
      logger.info(
        { provider: entry.provider, model: entry.model, chainIndex: i },
        'llm_attempt',
      )
      return await run(entry, i)
    } catch (err) {
      lastError = err
      if (!isRetryableLlmError(err)) {
        logger.error(
          { err, provider: entry.provider, model: entry.model, chainIndex: i },
          'llm_non_retryable',
        )
        throw err
      }
      if (i >= chain.length - 1) {
        logger.error(
          { err, provider: entry.provider, model: entry.model, chainIndex: i },
          'llm_retryable_exhausted',
        )
        throw err
      }
      logger.warn(
        { err, provider: entry.provider, model: entry.model, chainIndex: i, nextIndex: i + 1 },
        'llm_fallback',
      )
    }
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError))
}
