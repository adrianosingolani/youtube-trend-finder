import 'dotenv/config'
import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { createIngestTrendsService } from './composition.js'
import { logger } from './logger.js'
import { createIngestHandler } from './routes/ingest.js'

const app = new Hono()

const ingestService = createIngestTrendsService()

app.get('/', (c) => {
  return c.text('Hello Hono!')
})

app.post('/api/v1/ingest', createIngestHandler(ingestService))

serve({
  fetch: app.fetch,
  port: 3000
}, (info) => {
  logger.info({ port: info.port }, 'HTTP server listening')
})
