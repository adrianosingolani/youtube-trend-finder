import { APIError } from 'openai'

/**
 * True when another model in the chain may succeed (rate limits, transient overload).
 * Does not include bad JSON or validation errors from the model output.
 */
export function isRetryableLlmError(err: unknown): boolean {
  if (err instanceof APIError) {
    if (err.status === 429 || err.status === 503) return true
    if (err.status === 408) return true
  }

  if (typeof err === 'object' && err !== null && 'status' in err) {
    const status = (err as { status: unknown }).status
    if (status === 429 || status === 503 || status === 408) return true
  }

  const msg = err instanceof Error ? err.message : String(err)
  if (/timed out|timeout|ETIMEDOUT|ECONNRESET|EAI_AGAIN/i.test(msg)) {
    return true
  }
  return /rate limit|too many requests|quota|overloaded|unavailable|try again|resource exhausted|429|503|408/i.test(
    msg,
  )
}
