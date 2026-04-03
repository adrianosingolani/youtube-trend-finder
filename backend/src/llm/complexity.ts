import type { ModelEntry } from './types.js'

export type WorkloadComplexity = 'light' | 'heavy'

export interface VideoBatchStats {
  videoCount: number
  totalDescriptionChars: number
}

/**
 * Light workloads start lower in the model chain (cheaper tiers); heavy workloads start at index 0.
 * Thresholds are tunable via env without code changes.
 */
export function estimateComplexity(stats: VideoBatchStats): WorkloadComplexity {
  const maxVideos = Number(process.env.LLM_LIGHT_MAX_VIDEOS ?? '15')
  const maxChars = Number(process.env.LLM_LIGHT_MAX_CHARS ?? '24000')
  if (!Number.isFinite(maxVideos) || !Number.isFinite(maxChars)) return 'heavy'
  if (stats.videoCount <= maxVideos && stats.totalDescriptionChars <= maxChars) {
    return 'light'
  }
  return 'heavy'
}

/**
 * Where to begin in the chain: heavy jobs use the first (best) model;
 * light jobs start at `LLM_LIGHT_ENTRY_MODEL` or `llama-3.1-8b-instant` when present.
 */
export function getChainStartIndex(complexity: WorkloadComplexity, chain: readonly ModelEntry[]): number {
  if (chain.length === 0) return 0
  if (complexity === 'heavy') return 0
  const raw = process.env.LLM_LIGHT_ENTRY_MODEL
  const needle = raw !== undefined && raw.trim() !== '' ? raw.trim() : 'llama-3.1-8b-instant'
  const idx = chain.findIndex((e) => e.model === needle || e.model.includes(needle))
  if (idx === -1) return Math.max(0, chain.length - 1)
  return idx
}
