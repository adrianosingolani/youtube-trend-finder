import 'dotenv/config'
import { serve } from '@hono/node-server'
import { createApp } from './app.js'
import { logger } from './logger.js'

const app = createApp()

serve(
  {
    fetch: app.fetch,
    port: 3000,
  },
  (info) => {
    logger.info({ port: info.port }, 'HTTP server listening')
  },
)
