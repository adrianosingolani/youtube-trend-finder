export type TrendReportTrendRow = {
  topicName: string
  explanation: string
  videos: Array<{ videoId: string; title: string }>
}

export type DailyTrendReportRow = {
  id: string
  analysisDate: Date
  totalVideosAnalyzed: number
  trends: TrendReportTrendRow[]
}

export interface TrendReportQueryRepository {
  listReports(params: { limit: number; offset: number }): Promise<DailyTrendReportRow[]>
}
