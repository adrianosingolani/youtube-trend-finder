import type { Logger } from 'pino'
import type { z } from 'zod'
import { AITrendSchema, AITrendsEnvelopeSchema, IngestRequestSchema } from '../schemas.js'
import { VideoIngest } from '../domain/ingest/videoIngestHelpers.js'
import type { LlmCompletionPort } from './ports/llm-completion.port.js'
import type { TrendIngestRepository } from './ports/trend-ingest.repository.port.js'

export type IngestRunResult =
  | { kind: 'success'; reportId: string }
  | { kind: 'llm_failed' }
  | { kind: 'ai_parse_failed' }
  | { kind: 'cardinality_too_low'; count: number }

export class IngestTrendsService {
  constructor(
    private readonly deps: {
      repository: TrendIngestRepository
      llm: LlmCompletionPort
      logger: Logger
    },
  ) {}

  async run(payload: z.infer<typeof IngestRequestSchema>): Promise<IngestRunResult> {
    const { logger, llm, repository } = this.deps

    let { videos, discarded } = VideoIngest.sampleTopByViewCount(payload.videos)
    if (discarded > 0) {
      logger.warn({ discarded }, 'ingest_sampled_top_50_by_view_count')
    }

    videos = VideoIngest.truncateDescriptions(videos)

    const totalDescriptionChars = videos.reduce((sum, v) => sum + v.description.length, 0)

    const systemPrompt = `You are a YouTube trend analyst. Given the list of videos (each with title, description, viewCount), identify exactly 3 to 5 emerging topics.
Return a single JSON object with one key "trends" whose value is an array of objects. Each object must have: topicName (string), explanation (string), associatedVideoIds (array of video id strings from the input). Do not use markdown or code fences.`

    const userContent = videos
      .map((v) => `${v.videoId} | ${v.title}: ${v.description} (${v.viewCount} views)`)
      .join('\n---\n')

    let rawLlm: string
    try {
      rawLlm = await llm.completeChatWithRouting({
        systemPrompt,
        userContent,
        batchStats: {
          videoCount: videos.length,
          totalDescriptionChars,
        },
        logger,
      })
    } catch (err) {
      logger.error({ err }, 'ingest_llm_failed')
      return { kind: 'llm_failed' }
    }

    let trends: z.infer<typeof AITrendSchema>[]
    try {
      const cleaned = VideoIngest.stripJsonFences(rawLlm)
      const parsed: unknown = JSON.parse(cleaned)
      const envelope = AITrendsEnvelopeSchema.parse(parsed)
      trends = envelope.trends
      if (trends.length > 5) {
        logger.warn({ count: trends.length }, 'ingest_trend_cardinality_sliced')
        trends = trends.slice(0, 5)
      }
      if (trends.length < 3) {
        logger.error({ count: trends.length }, 'ingest_trend_cardinality_too_low')
        return { kind: 'cardinality_too_low', count: trends.length }
      }
    } catch (err) {
      logger.error({ err }, 'ingest_ai_parse_failed')
      return { kind: 'ai_parse_failed' }
    }

    const todayUTC = VideoIngest.startOfDayUTC(new Date())

    const { reportId } = await repository.persistIngest({
      analysisDate: todayUTC,
      videos,
      trends,
    })

    logger.info({ reportId, trendCount: trends.length }, 'ingest_ok')
    return { kind: 'success', reportId }
  }
}
