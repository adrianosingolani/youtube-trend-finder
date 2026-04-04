import { createRoute, z, type OpenAPIHono } from '@hono/zod-openapi'
import type { IngestTrendsService } from '../application/ingest-trends.service.js'
import { IngestRequestSchema } from '../schemas.js'
import { runIngestAndRespond } from './ingest.js'

const IngestCreatedResponseSchema = z
  .object({
    message: z.literal('Ingested'),
    reportId: z.string().uuid(),
  })
  .openapi('IngestCreatedResponse')

const ErrorBodySchema = z
  .object({
    error: z.string(),
  })
  .openapi('ErrorBody')

export const ingestOpenApiRoute = createRoute({
  method: 'post',
  path: '/api/v1/ingest',
  tags: ['Ingest'],
  summary: 'Ingest video metadata and run AI trend analysis',
  description:
    'Accepts YouTube video metadata (e.g. from n8n), samples to the top 50 by view count, runs the configured LLM chain, and upserts an idempotent daily trend report. Send `X-API-Key` matching the server `API_KEY` environment variable.',
  security: [{ ApiKey: [] }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: IngestRequestSchema,
        },
      },
      required: true,
    },
  },
  responses: {
    201: {
      content: {
        'application/json': {
          schema: IngestCreatedResponseSchema,
        },
      },
      description: 'Trend report created or replaced for the UTC analysis day',
    },
    400: {
      content: {
        'application/json': {
          schema: ErrorBodySchema,
        },
      },
      description: 'Invalid JSON body or validation failed',
    },
    401: {
      content: {
        'application/json': {
          schema: ErrorBodySchema,
        },
      },
      description: 'Missing or invalid X-API-Key',
    },
    500: {
      content: {
        'application/json': {
          schema: ErrorBodySchema,
        },
      },
      description: 'LLM, parse, or persistence failure',
    },
  },
})

export function registerIngestOpenApiRoute(
  app: OpenAPIHono,
  ingestService: IngestTrendsService,
): void {
  app.openapi(ingestOpenApiRoute, async (c) => {
    const apiKey = c.req.header('X-API-Key')
    if (apiKey !== process.env.API_KEY) {
      return c.json({ error: 'Unauthorized' }, 401)
    }
    const payload = c.req.valid('json')
    return runIngestAndRespond(c, ingestService, payload)
  })
}
