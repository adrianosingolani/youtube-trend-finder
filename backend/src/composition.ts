import { IngestTrendsService } from './application/ingest-trends.service.js'
import { LlmCompletionAdapter } from './infrastructure/llm/llm-completion.adapter.js'
import { PrismaTrendIngestRepository } from './infrastructure/persistence/prisma-trend-ingest.repository.js'
import { prisma } from './lib/prisma.js'
import { logger } from './logger.js'

export function createIngestTrendsService(): IngestTrendsService {
  const repository = new PrismaTrendIngestRepository(prisma)
  const llm = new LlmCompletionAdapter()
  return new IngestTrendsService({ repository, llm, logger })
}
