# YouTube Trend Finder

Monorepo for a **YouTube market intelligence** pipeline: ingest video metadata (typically from n8n or another orchestrator), analyse trends with configurable LLM routing, persist results in PostgreSQL, and surface them in a React dashboard.

## Repository layout

| Path        | Role |
|------------|------|
| `backend/` | Hono API, Prisma, Zod/OpenAPI, Pino logging |
| `frontend/`| Vite + React + TypeScript, Tailwind, TanStack Query |

Implementation checklist and API behaviour are tracked in [`spec.md`](spec.md).

## Default ports

| Service  | URL                      | Notes                                      |
|----------|--------------------------|--------------------------------------------|
| Backend  | http://localhost:3000    | Hono (`backend` `npm run dev` / `start`) |
| Frontend | http://localhost:5173    | Vite dev server (default)                  |

## Prerequisites

- **Node.js** (current LTS recommended)
- **PostgreSQL** for Prisma

## Backend

```bash
cd backend
cp .env.example .env   # edit DATABASE_URL, API_KEY, LLM keys
npm install
npx prisma generate
npx prisma db push     # or `migrate dev` once migrations exist
npm run dev
```

The API listens on port **3000** by default (see table above).

- Ingest: `POST /api/v1/ingest` (protected with `X-API-Key`)
- See `backend/.env.example` for `DATABASE_URL`, ingest `API_KEY`, and LLM-related variables.

```bash
npm run build
npm start
npm test
```

## Frontend

```bash
cd frontend
npm install
npm run dev
```

Regenerate OpenAPI TypeScript types. This waits up to **120s** for `GET /openapi.json` on the backend (start `backend` in another terminal first), then writes `src/api/schema.d.ts`:

```bash
npm run openapi:types
```

```bash
npm run build
npm test
```

## Architecture notes

- **n8n** is intended for scheduled YouTube fetches and calling the ingest API; heavy logic stays in this backend ([`.cursorrules`](.cursorrules)).
- LLM calls support Gemini and OpenAI-compatible providers (e.g. Groq) with a configurable fallback chain.
