# Architecture Plan: YouTube Market Intelligence Engine (Phase 1)

This document aligns with [.cursorrules](.cursorrules) (project constitution) and [spec.md](spec.md) (implementation checklist).

## 0. Backend Structure (OOP + Pure Helpers)

The Hono backend follows **object-oriented design** for orchestration and persistence: **application services** (use cases), **repository implementations** behind interfaces, and **adapters** for LLM calls. **Route handlers** only validate, authorise, and delegate. **Pure, stateless helpers** (e.g. top-N sampling by view count, description truncation, UTC start-of-day) stay as **plain functions or `namespace` functions** where that keeps the code clearer and easier to test.

## 1. Core Data Contracts (Zod as Source of Truth)

CRITICAL RULE: Do not use raw TypeScript interfaces. Define these primarily as Zod schemas and infer the TypeScript types from them to guarantee runtime validation and OpenAPI compatibility.

- VideoMetadataSchema: `z.object({ videoId, channelId, channelTitle (optional), title, description, publishedAt, viewCount })`
- IngestRequestSchema: `z.object({ videos: z.array(VideoMetadataSchema) })`
- AITrendSchema: `z.object({ topicName, explanation, associatedVideoIds })`
- AITrendsEnvelopeSchema: `z.object({ trends: z.array(AITrendSchema).min(3).max(5) })` — LLM JSON output before persistence
- DailyTrendReportSchema: `z.object({ id, analysisDate, trends: z.array(AITrendSchema), totalVideosAnalyzed })`

## 2. API Endpoints (Hono + OpenAPI)

CRITICAL RULE: Use `@hono/zod-openapi` for all routes. Expose `/openapi.json` and mount `@scalar/hono-api-reference` at `/docs`.

**AI / LLM boundaries (constitution):** Use the **OpenAI SDK** for OpenAI-compatible APIs (including **Groq** via `baseURL`) and **`@google/generative-ai`** for **Gemini**. Do **not** use **Flowise** or **LangChain** for LLM calls unless explicitly added later.

### Endpoint A: Ingest YouTube Data (Internal)

* Route: `POST /api/v1/ingest`
* Security: Static API key via **middleware** (and/or handler); read `API_KEY` from environment variables.
* Process Flow:
  1. Runtime validation: validate payload using `IngestRequestSchema`.
  2. Batching & truncation:
     - If **> 50** videos: **sort by `viewCount` descending, keep the top 50**, log a sampling warning (same behaviour as “cap at 50” for LLM input).
     - Truncate every video description to **1,000** characters.
  3. AI analysis (provider-agnostic LLM layer in Hono — **not** in n8n):
     - **Providers:** Gemini (Google Generative AI SDK) plus OpenAI-compatible calls (OpenAI and Groq via the OpenAI SDK with per-host `baseURL`).
     - **Model chain:** Configurable ordered list (env `LLM_MODEL_CHAIN` JSON or defaults in code; default: Gemini 3.1 Flash Lite first, then Groq/OpenAI models). On rate limits / quota (429, etc.), try the **next** model in the chain. Log each attempt with **Pino**.
     - **Complexity routing:** Light workloads may start at a cheaper model in the chain; heavy workloads start at the top. Same failover rules apply.
     - **Pre-parser:** strip markdown / code fences from LLM output before `JSON.parse`.
     - **Cardinality:** Enforce **3–5** trends: if **fewer than 3** after parse, **fail the request** (4xx/5xx) and log; if **more than 5**, **slice** to 5 and log a warning.
  4. Idempotent storage:
     - Upsert `Channel` (keyed by `youtubeId`; link `Video` via internal `Channel.id`).
     - Upsert `Video` records (update `viewCount` / description when `videoId` exists).
     - Upsert `TrendReport` by `analysisDate` (UTC start of day); if it exists, replace trend relations for that day.
* Performance: Synchronous for Phase 1 with a strict **per-attempt** timeout on LLM calls (e.g. **25s**), configurable via `LLM_TIMEOUT_MS`, inside the shared LLM client.

### Endpoint B: Fetch Daily Trends (Dashboard)

* Route: `GET /api/v1/trends`
* Query params: `limit` (default **7**), `offset`.
* Response: array of `DailyTrendReportSchema` (include trends and associated videos as needed).

## 3. Frontend (Phase 1)

Aligned with [.cursorrules](.cursorrules) §2:

* **Stack:** React (Vite), TypeScript, **Tailwind CSS**, **shadcn/ui**, **TanStack Query**.
* **Types:** Generate client types with **`openapi-typescript`** from the backend `/openapi.json`; use a small fetcher wrapper for Hono APIs.
* **Dashboard:** `useQuery` with **`staleTime: 3600000` (1 hour)** for trend data; chronological list of trend-report cards (date, videos analysed, 3–5 trends with explanations and sample video titles).

## 4. Database Schema (Prisma)

PostgreSQL + Prisma ORM ([.cursorrules](.cursorrules)). Prisma 7 may use a driver adapter (e.g. `@prisma/adapter-pg` with `pg`); connection URL from `.env` (`DATABASE_URL`).

```prisma
model Channel {
  id            String   @id @default(uuid())
  youtubeId     String   @unique
  name          String?
  customUrl     String?
  thumbnailUrl  String?
  isActive      Boolean  @default(true)
  createdAt     DateTime @default(now())
  videos        Video[]
}

model Video {
  id          String   @id @default(uuid())
  videoId     String   @unique
  title       String
  description String?  @db.Text
  viewCount   Int
  publishedAt DateTime
  createdAt   DateTime @default(now())
  channelId   String
  channel     Channel  @relation(fields: [channelId], references: [id])
  trends      Trend[]
  @@index([channelId])
  @@index([publishedAt])
}

model TrendReport {
  id                  String   @id @default(uuid())
  analysisDate        DateTime @unique
  totalVideosAnalyzed Int
  createdAt           DateTime @default(now())
  trends              Trend[]
}

model Trend {
  id          String      @id @default(uuid())
  topicName   String
  explanation String      @db.Text
  reportId    String
  report      TrendReport @relation(fields: [reportId], references: [id], onDelete: Cascade)
  videos      Video[]
}
```

## 5. Orchestration (n8n)

Aligned with [.cursorrules](.cursorrules): **n8n is for I/O and orchestration only** (e.g. cron, webhooks, calling YouTube APIs). It must **not** host complex transforms or LLM prompts — those live in **Hono**.

* Manual test workflow calling `POST /api/v1/ingest` with sample payloads.
* Scheduled job (e.g. **02:00 UTC**) to pull recent videos and send batches to Hono.

## 6. Infrastructure, CI/CD, Security & Observability

**Secrets ([.cursorrules](.cursorrules) §4):** Load secrets and environment-specific values **only** from **`.env`** (local and deployment). Keep `.env` **gitignored**; never commit secrets. Document keys in **`.env.example`** (e.g. `DATABASE_URL`, `API_KEY`, `GOOGLE_API_KEY` / `GEMINI_API_KEY`, `GROQ_API_KEY`, `OPENAI_API_KEY`, optional `LLM_MODEL_CHAIN`, `LLM_*` tuning).

**CI/CD ([spec.md](spec.md)):** GitHub Actions should run:

* `tsc --noEmit` (backend and frontend as applicable),
* **Vitest** (`vitest run` in **backend** and **frontend**),
* **Wait-for-DB** script (~60s loop) before `prisma migrate deploy`,
* production **build**.

**Cloud ([.cursorrules](.cursorrules)):** AWS (e.g. RDS, S3, App Runner or ECS) managed via **Terraform** — **phase 2** for full deploy (e.g. App Runner).

**Observability:** **Pino** for structured logs: ingestion failures, **LLM routing** and fallback events, cardinality issues, unauthorised attempts. Optional: Slack webhook for critical errors ([spec.md](spec.md)).

**Testing:** **Vitest** for unit/integration tests in backend and frontend ([.cursorrules](.cursorrules) §2).
