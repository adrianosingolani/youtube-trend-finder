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

/** Video snippet embedded in a trend on read APIs (dashboard). */
export const TrendVideoSnippetSchema = z
  .object({
    videoId: z.string().min(1),
    title: z.string().min(1),
  })
  .openapi('TrendVideoSnippet')

/** One trend row with linked videos as returned by `GET /api/v1/trends`. */
export const TrendReportTrendSchema = z
  .object({
    topicName: z.string().min(1),
    explanation: z.string().min(1),
    videos: z.array(TrendVideoSnippetSchema),
  })
  .openapi('TrendReportTrend')

export const DailyTrendReportSchema = z
  .object({
    id: z.string().uuid(),
    analysisDate: z.string().datetime(),
    trends: z.array(TrendReportTrendSchema),
    totalVideosAnalyzed: z.number().int().nonnegative(),
  })
  .openapi('DailyTrendReport')

export const TrendsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(7).openapi({
    param: { name: 'limit', in: 'query' },
    example: 7,
  }),
  offset: z.coerce.number().int().min(0).default(0).openapi({
    param: { name: 'offset', in: 'query' },
    example: 0,
  }),
})
