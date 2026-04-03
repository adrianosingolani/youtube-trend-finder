import type { PrismaClient } from '../../generated/prisma/client.js'
import type { TrendIngestRepository } from '../../application/ports/trend-ingest.repository.port.js'
import type { VideoMetadata } from '../../domain/ingest/videoIngestHelpers.js'
import type { AITrend } from '../../application/ports/trend-ingest.repository.port.js'

export class PrismaTrendIngestRepository implements TrendIngestRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async persistIngest(params: {
    analysisDate: Date
    videos: VideoMetadata[]
    trends: AITrend[]
  }): Promise<{ reportId: string }> {
    const { analysisDate, videos, trends } = params

    const channelIdByYoutube = new Map<string, string>()

    const resolveChannelInternalId = async (
      youtubeId: string,
      name: string | undefined,
    ): Promise<string> => {
      const cached = channelIdByYoutube.get(youtubeId)
      if (cached !== undefined) return cached
      const ch = await this.prisma.channel.upsert({
        where: { youtubeId },
        update: { name: name ?? null },
        create: { youtubeId, name: name ?? null },
      })
      channelIdByYoutube.set(youtubeId, ch.id)
      return ch.id
    }

    for (const v of videos) {
      const channelInternalId = await resolveChannelInternalId(v.channelId, v.channelTitle)
      await this.prisma.video.upsert({
        where: { videoId: v.videoId },
        update: {
          viewCount: v.viewCount,
          description: v.description,
          channelId: channelInternalId,
        },
        create: {
          videoId: v.videoId,
          title: v.title,
          description: v.description,
          viewCount: v.viewCount,
          publishedAt: new Date(v.publishedAt),
          channelId: channelInternalId,
        },
      })
    }

    const report = await this.prisma.trendReport.upsert({
      where: { analysisDate },
      update: {
        totalVideosAnalyzed: videos.length,
        trends: {
          deleteMany: {},
          create: trends.map((trend) => ({
            topicName: trend.topicName,
            explanation: trend.explanation,
            videos: {
              connect: trend.associatedVideoIds.map((videoId) => ({ videoId })),
            },
          })),
        },
      },
      create: {
        analysisDate,
        totalVideosAnalyzed: videos.length,
        trends: {
          create: trends.map((trend) => ({
            topicName: trend.topicName,
            explanation: trend.explanation,
            videos: {
              connect: trend.associatedVideoIds.map((videoId) => ({ videoId })),
            },
          })),
        },
      },
    })

    return { reportId: report.id }
  }
}
