import type { PrismaClient } from '../../generated/prisma/client.js'
import type {
  DailyTrendReportRow,
  TrendReportQueryRepository,
} from '../../application/ports/trend-report-query.repository.port.js'

export class PrismaTrendReportQueryRepository implements TrendReportQueryRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async listReports(params: { limit: number; offset: number }): Promise<DailyTrendReportRow[]> {
    const rows = await this.prisma.trendReport.findMany({
      take: params.limit,
      skip: params.offset,
      orderBy: { analysisDate: 'desc' },
      include: {
        trends: {
          include: {
            videos: {
              select: { videoId: true, title: true },
            },
          },
        },
      },
    })

    return rows.map((r) => ({
      id: r.id,
      analysisDate: r.analysisDate,
      totalVideosAnalyzed: r.totalVideosAnalyzed,
      trends: r.trends.map((t) => ({
        topicName: t.topicName,
        explanation: t.explanation,
        videos: t.videos.map((v) => ({ videoId: v.videoId, title: v.title })),
      })),
    }))
  }
}
