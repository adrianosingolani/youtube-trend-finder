# Phase 1 implementation checklist – YouTube Market Intelligence Engine (Phase 1)

## Vertical slices (recommended order)

Work in **one slice at a time** end-to-end before starting the next. This keeps OpenAPI, generated types, and the UI aligned.

| Slice | Goal | Outcome |
|-------|------|--------|
| **1 — API contract & client types** | **Complete:** `@hono/zod-openapi`, `GET /openapi.json`, `/docs` (Scalar), ingest in OpenAPI | Frontend `npm run openapi:types` produces `schema.d.ts`; optional thin `fetch` wrapper |
| **2 — Read path + minimal UI** | `GET /api/v1/trends?limit=&offset=` with Zod query + response schema | Dashboard (or list page) with TanStack Query `staleTime: 3600000` |

**Defer until after slices 1–2:** n8n workflows, AWS/Terraform, Slack alerts. Those are integration and ops layers on top of a stable HTTP surface.

**Style:** Ingest and trends flows use **classes** (services, repositories, adapters), **dependency injection** from a composition root, and **thin Hono handlers**. Deterministic helpers (sampling, truncation, date normalisation) stay as pure functions — see [.cursorrules](.cursorrules).

---

## Backend (Hono + Prisma)

- [x] 1. **Prisma schema**  
  - [x] `Channel` (`id` uuid PK, `youtubeId` unique), `Video` (`channelId` FK), `TrendReport` (`analysisDate` unique), `Trend` with M:N to `Video`.  
  - [x] Indexes on `Video.channelId`, `Video.publishedAt`.  
  - [x] **Migrations:** `prisma/migrations` with initial SQL; local `migrate dev`, deploy/CI `migrate deploy`.

- [x] 2. **Zod + OpenAPI setup**  
  - [x] Zod: `VideoMetadataSchema`, `IngestRequestSchema`, `AITrendSchema`, `AITrendsEnvelopeSchema`; response DTOs for trends list still to align with persisted models.  
  - [x] Register routes and schemas with `@hono/zod-openapi`, expose `/openapi.json` and `/docs` (Scalar).

- [x] 3. **Ingest endpoint — core logic** (`POST /api/v1/ingest`)  
  - [x] `X-API-Key` vs `API_KEY`.  
  - [x] Body validation with `IngestRequestSchema`.  
  - [x] Sampling (>50 → top 50 by `viewCount`), description truncation, LLM chain with logging/timeouts.  
  - [x] JSON parse + `AITrendsEnvelopeSchema`; enforce 3–5 trends.  
  - [x] Idempotent-ish persist via repository (analysis day UTC, upsert channels/videos, replace trends for that report).  
  - [x] `201` on success.  
  - [x] Register in OpenAPI (slice 1).

- [ ] 4. **Fetch trends endpoint**  
  - [ ] `GET /api/v1/trends?limit=7&offset=0` with Zod query validation.  
  - [ ] Response: daily reports with trends and related videos (Prisma `include`).  
  - [ ] Register in OpenAPI (slice 1).

- [x] 5. **Error handling & logging** (ongoing)  
  - [x] Pino; structured logs for validation, LLM failures, sampling.  
  - [ ] Tighten user-facing messages and status codes across all routes.  
  - [x] Secrets from `.env` only; never commit secrets.

## Frontend (React + TanStack Query)

- [ ] 6. **OpenAPI-driven types**  
  - [x] Script: `openapi-typescript` after `wait-on` (see `frontend/package.json`).  
  - [x] Backend serves `/openapi.json` (slice 1).  
  - [ ] Small fetcher helper for typed paths (optional in slice 1).

- [ ] 7. **Dashboard** (slice 2)  
  - [ ] `useQuery` for trends, `staleTime: 3600000`.  
  - [ ] Cards: date, videos analysed, 3–5 trends + sample titles.

- [ ] 8. **Styling**  
  - [ ] shadcn Card, Badge, ScrollArea; responsive Tailwind.

## Integration & deployment

- [ ] 9. **n8n** — manual ingest test workflow; daily cron + YouTube → Hono.

- [x] 10. **CI (minimal)**  
  - [x] GitHub Actions: Postgres service, `prisma migrate deploy`, `prisma generate`, backend `tsc` build + Vitest; frontend build + Vitest.

- [ ] 11. **Observability** — ingestion/LLM/auth logging hardening; optional Slack webhook.
