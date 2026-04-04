import { OpenAPIHono } from '@hono/zod-openapi'
import { Scalar } from '@scalar/hono-api-reference'
import { createIngestTrendsService } from './composition.js'
import { logger } from './logger.js'
import { registerIngestOpenApiRoute } from './routes/ingest-openapi.js'

export function createApp(): OpenAPIHono {
  const app = new OpenAPIHono({
    defaultHook: (result, c) => {
      if (!result.success) {
        logger.error({ err: result.error }, 'request_validation_failed')
        return c.json({ error: 'Invalid request body' }, 400)
      }
    },
  })

  app.openAPIRegistry.registerComponent('securitySchemes', 'ApiKey', {
    type: 'apiKey',
    in: 'header',
    name: 'X-API-Key',
  })

  const ingestService = createIngestTrendsService()
  registerIngestOpenApiRoute(app, ingestService)

  app.doc('/openapi.json', (c) => ({
    openapi: '3.0.0',
    info: {
      title: 'YouTube Market Intelligence API',
      version: '1.0.0',
    },
    servers: [
      {
        url: new URL(c.req.url).origin,
        description: 'Current server',
      },
    ],
  }))

  app.get(
    '/docs',
    Scalar((c) => ({
      pageTitle: 'YouTube Market Intelligence API',
      url: new URL('/openapi.json', c.req.url).href,
    })),
  )

  app.get('/', (c) => c.text('Hello Hono!'))

  return app
}
