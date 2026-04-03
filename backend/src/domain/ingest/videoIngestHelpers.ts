import type { z } from 'zod'
import { VideoMetadataSchema } from '../../schemas.js'

export type VideoMetadata = z.infer<typeof VideoMetadataSchema>

/** Pure helpers for ingest: sampling, truncation, and LLM output cleanup. */
export namespace VideoIngest {
  export const MAX_VIDEOS = 50
  export const DESCRIPTION_MAX_CHARS = 1000

  export function startOfDayUTC(date: Date): Date {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  }

  export function stripJsonFences(raw: string): string {
    return raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
  }

  /**
   * If there are more than {@link MAX_VIDEOS} items, keeps the top N by `viewCount` descending.
   * @returns Processed videos and how many rows were dropped (0 if no sampling).
   */
  export function sampleTopByViewCount(videos: readonly VideoMetadata[]): {
    videos: VideoMetadata[]
    discarded: number
  } {
    if (videos.length <= MAX_VIDEOS) {
      return { videos: [...videos], discarded: 0 }
    }
    const sorted = [...videos].sort((a, b) => b.viewCount - a.viewCount).slice(0, MAX_VIDEOS)
    return { videos: sorted, discarded: videos.length - MAX_VIDEOS }
  }

  export function truncateDescriptions(
    videos: readonly VideoMetadata[],
    maxChars: number = DESCRIPTION_MAX_CHARS,
  ): VideoMetadata[] {
    return videos.map((v) => ({ ...v, description: v.description.slice(0, maxChars) }))
  }
}
