import { describe, expect, it } from 'vitest'
import { createApp } from './app.js'

describe('OpenAPI', () => {
  it('serves OpenAPI 3 document at /openapi.json', async () => {
    const app = createApp()
    const res = await app.request('/openapi.json', { method: 'GET' })
    expect(res.status).toBe(200)
    const doc = (await res.json()) as {
      openapi: string
      paths: Record<string, unknown>
    }
    expect(doc.openapi).toMatch(/^3\./)
    expect(doc.paths).toHaveProperty('/api/v1/ingest')
  })

  it('serves Scalar HTML at /docs', async () => {
    const app = createApp()
    const res = await app.request('/docs', { method: 'GET' })
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('text/html')
    const html = await res.text()
    expect(html).toContain('scalar')
  })
})
