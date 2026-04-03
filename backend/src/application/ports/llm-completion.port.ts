import type { Logger } from 'pino'
import type { VideoBatchStats } from '../../llm/complexity.js'

/** Abstraction over provider routing / fallback so use cases depend on a port, not concrete LLM wiring. */
export interface LlmCompletionPort {
  completeChatWithRouting(params: {
    systemPrompt: string
    userContent: string
    batchStats: VideoBatchStats
    logger: Logger
  }): Promise<string>
}
