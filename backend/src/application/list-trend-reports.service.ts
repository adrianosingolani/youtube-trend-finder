import type { z } from 'zod'
import { DailyTrendReportSchema } from '../schemas.js'
import type { TrendReportQueryRepository } from './ports/trend-report-query.repository.port.js'

export type DailyTrendReportDto = z.infer<typeof DailyTrendReportSchema>

export class ListTrendReportsService {
  constructor(
    private readonly deps: {
      repository: TrendReportQueryRepository
    },
  ) {}

  async run(params: { limit: number; offset: number }): Promise<DailyTrendReportDto[]> {
    const rows = await this.deps.repository.listReports(params)
    return rows.map((r) => ({
      id: r.id,
      analysisDate: r.analysisDate.toISOString(),
      totalVideosAnalyzed: r.totalVideosAnalyzed,
      trends: r.trends.map((t) => ({
        topicName: t.topicName,
        explanation: t.explanation,
        videos: t.videos.map((v) => ({
          videoId: v.videoId,
          title: v.title,
        })),
      })),
    }))
  }
}
