import type { Context } from 'hono'
import type { z } from 'zod'
import type { IngestTrendsService } from '../application/ingest-trends.service.js'
import { IngestRequestSchema } from '../schemas.js'

export type IngestPayload = z.infer<typeof IngestRequestSchema>

/** Shared handler after auth and JSON validation (OpenAPI route). */
export async function runIngestAndRespond(
  c: Context,
  ingestService: IngestTrendsService,
  payload: IngestPayload,
) {
  const result = await ingestService.run(payload)

  switch (result.kind) {
    case 'success':
      return c.json({ message: 'Ingested' as const, reportId: result.reportId }, 201)
    case 'llm_failed':
      return c.json({ error: 'AI analysis failed' }, 500)
    case 'ai_parse_failed':
      return c.json({ error: 'AI response could not be validated' }, 500)
    case 'cardinality_too_low':
      return c.json({ error: 'AI returned too few trends' }, 500)
    default: {
      const _exhaustive: never = result
      return _exhaustive
    }
  }
}
