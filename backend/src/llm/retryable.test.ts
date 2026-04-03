import { APIError } from 'openai'
import { describe, expect, it } from 'vitest'
import { isRetryableLlmError } from './retryable.js'

describe('isRetryableLlmError', () => {
  it('returns true for OpenAI APIError 429', () => {
    const err = new APIError(429, undefined, 'rate limit', undefined)
    expect(isRetryableLlmError(err)).toBe(true)
  })

  it('returns true for plain object with status 503', () => {
    expect(isRetryableLlmError({ status: 503 })).toBe(true)
  })

  it('returns false for generic Error without signals', () => {
    expect(isRetryableLlmError(new Error('invalid json'))).toBe(false)
  })
})
