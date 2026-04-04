import { createRoute, z, type OpenAPIHono } from '@hono/zod-openapi'
import type { ListTrendReportsService } from '../application/list-trend-reports.service.js'
import { DailyTrendReportSchema, TrendsQuerySchema } from '../schemas.js'

const ErrorBodySchema = z
  .object({
    error: z.string(),
  })
  .openapi('TrendsErrorBody')

export const trendsListOpenApiRoute = createRoute({
  method: 'get',
  path: '/api/v1/trends',
  tags: ['Trends'],
  summary: 'List daily trend reports',
  description:
    'Returns recent trend reports (newest first), each with 3–5 trends and the YouTube videos linked to each trend.',
  request: {
    query: TrendsQuerySchema,
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.array(DailyTrendReportSchema),
        },
      },
      description: 'Paginated list of daily reports',
    },
    400: {
      content: {
        'application/json': {
          schema: ErrorBodySchema,
        },
      },
      description: 'Invalid query parameters',
    },
  },
})

export function registerTrendsOpenApiRoute(
  app: OpenAPIHono,
  listTrendReports: ListTrendReportsService,
): void {
  app.openapi(trendsListOpenApiRoute, async (c) => {
    const { limit, offset } = c.req.valid('query')
    const reports = await listTrendReports.run({ limit, offset })
    return c.json(reports, 200)
  })
}
