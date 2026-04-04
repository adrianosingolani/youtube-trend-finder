import { describe, expect, it } from 'vitest'
import { ListTrendReportsService } from './list-trend-reports.service.js'
import type { TrendReportQueryRepository } from './ports/trend-report-query.repository.port.js'

describe('ListTrendReportsService', () => {
  it('maps repository rows to API DTOs with ISO datetimes', async () => {
    const repository: TrendReportQueryRepository = {
      async listReports() {
        return [
          {
            id: '550e8400-e29b-41d4-a716-446655440000',
            analysisDate: new Date('2026-04-01T12:00:00.000Z'),
            totalVideosAnalyzed: 2,
            trends: [
              {
                topicName: 'Topic',
                explanation: 'Why it matters',
                videos: [
                  { videoId: 'vid1', title: 'First video' },
                  { videoId: 'vid2', title: 'Second' },
                ],
              },
            ],
          },
        ]
      },
    }

    const svc = new ListTrendReportsService({ repository })
    const out = await svc.run({ limit: 7, offset: 0 })

    expect(out).toHaveLength(1)
    expect(out[0].id).toBe('550e8400-e29b-41d4-a716-446655440000')
    expect(out[0].analysisDate).toBe('2026-04-01T12:00:00.000Z')
    expect(out[0].totalVideosAnalyzed).toBe(2)
    expect(out[0].trends[0].topicName).toBe('Topic')
    expect(out[0].trends[0].videos.map((v) => v.videoId)).toEqual(['vid1', 'vid2'])
  })
})
