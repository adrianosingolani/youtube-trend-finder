import { describe, expect, it } from 'vitest'
import { estimateComplexity, getChainStartIndex } from './complexity.js'
import type { ModelEntry } from './types.js'

describe('estimateComplexity', () => {
  it('returns light when under default thresholds', () => {
    expect(
      estimateComplexity({ videoCount: 10, totalDescriptionChars: 1000 }),
    ).toBe('light')
  })

  it('returns heavy when video count exceeds threshold', () => {
    const prev = process.env.LLM_LIGHT_MAX_VIDEOS
    process.env.LLM_LIGHT_MAX_VIDEOS = '5'
    expect(
      estimateComplexity({ videoCount: 6, totalDescriptionChars: 100 }),
    ).toBe('heavy')
    process.env.LLM_LIGHT_MAX_VIDEOS = prev
  })

  it('returns heavy when char total exceeds threshold', () => {
    const prev = process.env.LLM_LIGHT_MAX_CHARS
    process.env.LLM_LIGHT_MAX_CHARS = '100'
    expect(
      estimateComplexity({ videoCount: 1, totalDescriptionChars: 200 }),
    ).toBe('heavy')
    process.env.LLM_LIGHT_MAX_CHARS = prev
  })
})

describe('getChainStartIndex', () => {
  const chain: ModelEntry[] = [
    { provider: 'gemini', model: 'gemini-pro' },
    { provider: 'groq', model: 'mid' },
    { provider: 'groq', model: 'llama-3.1-8b-instant' },
  ]

  it('starts at 0 for heavy', () => {
    expect(getChainStartIndex('heavy', chain)).toBe(0)
  })

  it('starts at light entry model when present', () => {
    expect(getChainStartIndex('light', chain)).toBe(2)
  })
})
