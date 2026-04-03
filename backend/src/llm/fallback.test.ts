import pino from 'pino'
import { describe, expect, it, vi } from 'vitest'
import { executeWithFallback } from './fallback.js'
import type { ModelEntry } from './types.js'

const silentLogger = pino({ level: 'silent' })

describe('executeWithFallback', () => {
  it('returns first successful result', async () => {
    const chain: ModelEntry[] = [
      { provider: 'groq', model: 'a' },
      { provider: 'groq', model: 'b' },
    ]
    const result = await executeWithFallback({
      chain,
      startIndex: 0,
      logger: silentLogger,
      run: async () => 'ok',
    })
    expect(result).toBe('ok')
  })

  it('advances to next model on retryable error', async () => {
    const chain: ModelEntry[] = [
      { provider: 'groq', model: 'a' },
      { provider: 'groq', model: 'b' },
    ]
    const rateLimited = Object.assign(new Error('429 rate limit'), { status: 429 })
    const run = vi
      .fn()
      .mockRejectedValueOnce(rateLimited)
      .mockResolvedValueOnce('recovered')

    const result = await executeWithFallback({
      chain,
      startIndex: 0,
      logger: silentLogger,
      run,
    })

    expect(result).toBe('recovered')
    expect(run).toHaveBeenCalledTimes(2)
  })

  it('throws on non-retryable error without advancing', async () => {
    const chain: ModelEntry[] = [
      { provider: 'groq', model: 'a' },
      { provider: 'groq', model: 'b' },
    ]
    const fatal = new Error('bad request')
    const run = vi.fn().mockRejectedValue(fatal)

    await expect(
      executeWithFallback({
        chain,
        startIndex: 0,
        logger: silentLogger,
        run,
      }),
    ).rejects.toThrow('bad request')

    expect(run).toHaveBeenCalledTimes(1)
  })
})
