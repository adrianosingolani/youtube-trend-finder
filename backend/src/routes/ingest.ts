import type { Context } from 'hono'
import { z } from 'zod'
import type { IngestTrendsService } from '../application/ingest-trends.service.js'
import { logger } from '../logger.js'
import { IngestRequestSchema } from '../schemas.js'

export function createIngestHandler(ingestService: IngestTrendsService) {
  return async function ingestHandler(c: Context) {
    const apiKey = c.req.header('X-API-Key')
    if (apiKey !== process.env.API_KEY) {
      return c.json({ error: 'Unauthorized' }, 401)
    }

    let payload: z.infer<typeof IngestRequestSchema>
    try {
      payload = IngestRequestSchema.parse(await c.req.json())
    } catch (err) {
      logger.error({ err }, 'ingest_validation_failed')
      return c.json({ error: 'Invalid request body' }, 400)
    }

    const result = await ingestService.run(payload)

    switch (result.kind) {
      case 'success':
        return c.json({ message: 'Ingested', reportId: result.reportId }, 201)
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
}
