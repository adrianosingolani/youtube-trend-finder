# Implementation Plan – YouTube Market Intelligence Engine (Phase 1)

## Backend (Hono + Prisma)

**Style:** Implement ingest and trends flows with **classes** (services, repositories, adapters) and **dependency injection** from a composition root; keep **Hono handlers thin**. Use **pure functions** (or `namespace` helpers) for deterministic transforms such as sampling, truncation, and date normalisation — see [.cursorrules](.cursorrules) §3.

- [ ] 1. **Prisma Schema**  
  - Create `Channel` model with `id` (uuid) as primary key and `youtubeId` as unique (natural key from YouTube).  
  - Create `Video` model with `channelId` foreign key to `Channel.id`.  
  - Create `TrendReport` with `analysisDate` (unique, normalised to start of day).  
  - Create `Trend` model with relation to `TrendReport` and many-to-many to `Video`.  
  - Add indexes: `Video.channelId`, `Video.publishedAt`.  
  - Run migration.

- [ ] 2. **Zod + OpenAPI setup**  
  - Install `zod`, `@hono/zod-openapi`, `@scalar/hono-api-reference`.  
  - Define schemas: `VideoMetadataSchema`, `IngestRequestSchema`, `AITrendSchema`, `AITrendsEnvelopeSchema` (JSON object wrapper for LLM output), `DailyTrendReportSchema`.  
  - Infer TypeScript types from schemas (no `any`).  
  - Register schemas with OpenAPI registry, expose `/openapi.json` and `/docs`.

- [ ] 3. **Ingest endpoint – core logic**  
  - Route: `POST /api/v1/ingest`  
  - Middleware: validate static API key (from env).  
  - Validate request body with `IngestRequestSchema`.  
  - **Sampling**: if videos > 50, sort by `viewCount` desc, take top 50, log warning.  
  - **Truncate** descriptions to 1000 chars.  
  - **LLM call (agnostic routing):**  
    - Use a shared client with adapters for Gemini and OpenAI-compatible APIs (OpenAI, Groq). Model order is configurable (default: Gemini 3.1 Flash Lite first, then fallbacks). On rate limits / quota, advance to the next model in the chain; log provider and model per attempt (Pino).  
    - Light requests (small video count / payload size) may start lower in the chain; heavy requests start at the top.  
    - System prompt: require a single JSON **object** with key `trends` whose value is an array of 3–5 objects (topicName, explanation, associatedVideoIds). No backticks.  
    - Timeout per attempt (e.g. 25s); on rate limits, advance to the next model in the chain (see `LLM_MODEL_CHAIN` / defaults in code).  
    - Parse JSON, validate with `AITrendsEnvelopeSchema` (then use the `trends` array of `AITrendSchema`).  
    - Enforce 3–5 trends – if not, throw error and log.  
  - **Idempotent storage**:  
    - Normalise `analysisDate` to UTC start of day.  
    - Upsert `Channel` by `youtubeId` (use `channelTitle` from payload).  
    - Upsert each `Video` by `videoId` (update viewCount, description).  
    - Upsert `TrendReport` by `analysisDate`. If exists, delete old `Trend` relations and recreate with new trends.  
  - Return `201 Created`.

- [ ] 4. **Fetch trends endpoint**  
  - Route: `GET /api/v1/trends?limit=7&offset=0`  
  - Query validation with Zod.  
  - Return array of `DailyTrendReportSchema` (include trends and videos).  
  - Use Prisma include to load trends and their associated videos.

- [ ] 5. **Error handling & logging**  
  - Use Pino for structured logging.  
  - Log LLM cardinality violations, model fallback events, sampling warnings, API key failures.  
  - Return standard HTTP status codes with user‑friendly messages.  
  - **Secrets:** load API keys, `DATABASE_URL`, and LLM keys only from `.env` (local and deployment); keep `.env` gitignored and never commit secrets.

## Frontend (React + TanStack Query)

- [ ] 6. **Generate OpenAPI client**  
  - Run `openapi-typescript` on `/openapi.json` to produce TypeScript types.  
  - Create a fetcher wrapper for Hono endpoints.

- [ ] 7. **Dashboard component**  
  - Use `useQuery` with `staleTime: 3600000` (1 hour).  
  - Display a chronological list of `TrendReport` cards.  
  - Each card shows date, total videos analysed, and 3–5 trends with explanations and sample video titles.

- [ ] 8. **Styling**  
  - Use shadcn/ui Card, Badge, ScrollArea components.  
  - Tailwind CSS for responsive layout.

## Integration & Deployment

- [ ] 9. **n8n workflow**  
  - Create a manual test workflow that calls `POST /api/v1/ingest` with sample data.  
  - Configure daily cron (e.g., 02:00 UTC) to fetch last 24h videos from YouTube API and send to Hono.

- [ ] 10. **CI / CD**  
    - GitHub Actions: run `tsc --noEmit`, **Vitest** (`vitest run` in backend and frontend), Prisma migrations (with wait‑for‑DB script), and production build.  
    - Deploy to AWS App Runner via Terraform (phase 2).

- [ ] 11. **Observability**  
    - Log ingestion failures, LLM routing and cardinality warnings, unauthorised attempts.  
    - (Optional) Send critical errors to Slack webhook.