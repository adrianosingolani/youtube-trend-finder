import type { z } from 'zod'
import { AITrendSchema } from '../../schemas.js'
import type { VideoMetadata } from '../../domain/ingest/videoIngestHelpers.js'

export type AITrend = z.infer<typeof AITrendSchema>

export interface TrendIngestRepository {
  persistIngest(params: {
    analysisDate: Date
    videos: VideoMetadata[]
    trends: AITrend[]
  }): Promise<{ reportId: string }>
}
