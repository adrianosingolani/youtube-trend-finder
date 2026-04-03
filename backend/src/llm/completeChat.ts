import type { Logger } from 'pino'
import { geminiJsonChat } from './adapters/gemini.js'
import { getOpenAICompatibleClient, openAICompatibleJsonChat } from './adapters/openai-compatible.js'
import type { VideoBatchStats } from './complexity.js'
import { estimateComplexity, getChainStartIndex } from './complexity.js'
import { executeWithFallback } from './fallback.js'
import { loadModelChain } from './model-chain.js'
import type { ModelEntry } from './types.js'

const DEFAULT_TIMEOUT_MS = 25_000

function resolveTimeoutMs(): number {
  const raw = process.env.LLM_TIMEOUT_MS
  if (raw === undefined || raw === '') return DEFAULT_TIMEOUT_MS
  const n = Number(raw)
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_TIMEOUT_MS
}

async function completeOne(
  entry: ModelEntry,
  systemPrompt: string,
  userContent: string,
  timeoutMs: number,
): Promise<string> {
  if (entry.provider === 'gemini') {
    const apiKey = process.env.GOOGLE_API_KEY ?? process.env.GEMINI_API_KEY
    if (apiKey === undefined || apiKey === '') {
      throw new Error('GOOGLE_API_KEY or GEMINI_API_KEY is not set for Gemini models')
    }
    return geminiJsonChat({
      apiKey,
      model: entry.model,
      systemPrompt,
      userContent,
      timeoutMs,
    })
  }

  const client = getOpenAICompatibleClient(entry.provider, timeoutMs)
  return openAICompatibleJsonChat(client, entry.model, [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userContent },
  ])
}

/**
 * Picks a starting model from workload complexity, then walks the chain on retryable failures (e.g. rate limits).
 */
export async function completeChatWithRouting(params: {
  systemPrompt: string
  userContent: string
  batchStats: VideoBatchStats
  logger: Logger
  chain?: ModelEntry[]
}): Promise<string> {
  const chain = params.chain ?? loadModelChain()
  const complexity = estimateComplexity(params.batchStats)
  const startIndex = getChainStartIndex(complexity, chain)
  const timeoutMs = resolveTimeoutMs()

  params.logger.info({ complexity, startIndex, chainLength: chain.length }, 'llm_routing')

  return executeWithFallback({
    chain,
    startIndex,
    logger: params.logger,
    run: (entry) => completeOne(entry, params.systemPrompt, params.userContent, timeoutMs),
  })
}
