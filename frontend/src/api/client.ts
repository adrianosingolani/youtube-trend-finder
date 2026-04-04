import type { paths } from './schema'

export type TrendsListResponse =
  paths['/api/v1/trends']['get']['responses']['200']['content']['application/json']

export type TrendsQueryParams = NonNullable<
  paths['/api/v1/trends']['get']['parameters']['query']
>

/** Base URL without trailing slash. Empty string = same origin (Vite dev proxy). */
export function getApiBaseUrl(): string {
  const raw = import.meta.env.VITE_API_BASE_URL
  if (typeof raw === 'string' && raw !== '') {
    return raw.replace(/\/$/, '')
  }
  return ''
}

function buildTrendsUrl(query?: TrendsQueryParams): URL {
  const base = getApiBaseUrl()
  const origin =
    base !== ''
      ? base
      : typeof globalThis.location !== 'undefined'
        ? globalThis.location.origin
        : 'http://localhost:5173'
  const url = new URL('/api/v1/trends', origin)
  if (query?.limit != null) {
    url.searchParams.set('limit', String(query.limit))
  }
  if (query?.offset != null) {
    url.searchParams.set('offset', String(query.offset))
  }
  return url
}

export async function fetchTrendReports(
  query?: TrendsQueryParams,
): Promise<TrendsListResponse> {
  const url = buildTrendsUrl(query)
  const res = await fetch(url.toString(), {
    headers: { Accept: 'application/json' },
  })

  if (!res.ok) {
    const errBody = (await res.json().catch(() => null)) as { error?: string } | null
    const msg = errBody?.error ?? `Request failed (${res.status})`
    throw new Error(msg)
  }

  return res.json() as Promise<TrendsListResponse>
}
