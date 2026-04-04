import { z } from '@hono/zod-openapi'

/** One video row from n8n / YouTube metadata */
export const VideoMetadataSchema = z
  .object({
    videoId: z.string().min(1),
    channelId: z.string().min(1),
    channelTitle: z.string().optional(),
    title: z.string().min(1),
    description: z.string(),
    publishedAt: z.string().datetime(),
    viewCount: z.number().int().nonnegative(),
  })
  .openapi('VideoMetadata')

export const IngestRequestSchema = z
  .object({
    videos: z.array(VideoMetadataSchema).min(1),
  })
  .openapi('IngestRequest')

export const AITrendSchema = z
  .object({
    topicName: z.string().min(1),
    explanation: z.string().min(1),
    associatedVideoIds: z.array(z.string().min(1)).min(1),
  })
  .openapi('AITrend')

/** LLM must return a JSON object with this shape (works with `json_object` / Gemini JSON mode). */
export const AITrendsEnvelopeSchema = z.object({
  trends: z.array(AITrendSchema).min(3).max(5),
})

export const DailyTrendReportSchema = z
  .object({
    id: z.string().uuid(),
    analysisDate: z.string().datetime(),
    trends: z.array(AITrendSchema),
    totalVideosAnalyzed: z.number().int().nonnegative(),
  })
  .openapi('DailyTrendReport')
