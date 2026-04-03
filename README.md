# YouTube Trend Finder

Monorepo for a **YouTube market intelligence** pipeline: something (for example **n8n**) sends video metadata to a **Hono** API, the backend calls **LLMs** to infer trends, results are stored in **PostgreSQL** via **Prisma**, and a **React** app will eventually show them (dashboard work is still in progress—see [`spec.md`](spec.md)).

This repository has **no root `package.json`**. You work in **`backend/`** and **`frontend/`** as two separate Node projects (two terminals in daily use).

---

## What you need installed

| Requirement | Why | Suggested version |
|-------------|-----|-------------------|
| **Node.js** | npm scripts, Prisma, Vite | **20.x or 22.x** (CI uses 22) |
| **PostgreSQL** | Prisma + app data | **14+** (CI uses 16) |
| **npm** | Comes with Node | Current |

Optional: **Docker** if you prefer running Postgres in a container instead of a local install.

You do **not** need n8n or the YouTube API on your machine to run the API and UI—only to exercise the full production-style flow.

---

## First-time setup (from zero)

### 1. Get the code

```bash
git clone https://github.com/adrianosingolani/youtube-trend-finder.git
cd youtube-trend-finder
```

Use your fork’s URL if you forked the repository.

### 2. Run PostgreSQL and create a database

Pick **one** approach.

**A — Postgres already installed (Homebrew, Postgres.app, Linux package, etc.)**

```bash
# Example: create DB (name can be anything; match it in DATABASE_URL below)
createdb youtube_trends
# or: psql -U postgres -c "CREATE DATABASE youtube_trends;"
```

**B — Docker (no local Postgres install)**

```bash
docker run --name youtube-trend-finder-pg \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=youtube_trends \
  -p 5432:5432 \
  -d postgres:16-alpine
```

Then your URL will look like:

`postgresql://postgres:postgres@localhost:5432/youtube_trends`

Keep Postgres running whenever you work on the backend.

### 3. Backend: environment, dependencies, database schema

```bash
cd backend
cp .env.example .env
```

Edit **`.env`** and set at minimum:

1. **`DATABASE_URL`** — must point at the database you created (same host, port, user, password, database name).
2. **`API_KEY`** — any secret string you choose; clients must send it as the `X-API-Key` header on ingest.
3. **At least one LLM key** — otherwise **`POST /api/v1/ingest` will fail** when it tries to analyse videos. Set **`GOOGLE_API_KEY`** and/or **`GROQ_API_KEY`** (and/or **`OPENAI_API_KEY`** if your model chain uses OpenAI). See comments in `.env.example` and `src/llm/model-chain.ts` for defaults.

Install and apply migrations:

```bash
npm install
npx prisma generate
npx prisma migrate dev
```

- **`prisma generate`** — generates the Prisma client into `src/generated/prisma` (gitignored).
- **`prisma migrate dev`** — applies SQL in `prisma/migrations` to your database. The first run applies the initial migration; later, if you change `schema.prisma`, it can create new migrations interactively.

Start the API:

```bash
npm run dev
```

You should see a log line that the server is listening on port **3000**. In a browser or with curl:

```bash
curl -sS http://localhost:3000/
# Expected: plain text "Hello Hono!"
```

Leave this terminal running.

### 4. Frontend: install and dev server

Open a **second** terminal:

```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173** — you should see the Vite/React starter page. The frontend does not talk to the backend by default yet (dashboard/API wiring is still per [`spec.md`](spec.md)); this step confirms the UI toolchain works.

---

## How to run the project day to day

1. Start **PostgreSQL** (if it is not always on).
2. Terminal A — `cd backend && npm run dev` → API at **http://localhost:3000**
3. Terminal B — `cd frontend && npm run dev` → UI at **http://localhost:5173**

---

## Default ports

| Service  | URL | How it is started |
|----------|-----|-------------------|
| Backend  | http://localhost:3000 | `cd backend && npm run dev` (or `npm start` after `npm run build`) |
| Frontend | http://localhost:5173 | `cd frontend && npm run dev` |

---

## Try the ingest API (optional)

Requires **backend running**, **valid `DATABASE_URL`**, **`API_KEY`**, and **working LLM credentials** in `.env`.

Replace `change-me` with the same value as `API_KEY` in your `.env`:

```bash
curl -sS -X POST http://localhost:3000/api/v1/ingest \
  -H "Content-Type: application/json" \
  -H "X-API-Key: change-me" \
  -d '{
    "videos": [
      {
        "videoId": "demo-video-1",
        "channelId": "demo-channel-1",
        "channelTitle": "Demo Channel",
        "title": "Demo video",
        "description": "Short description for trend analysis.",
        "publishedAt": "2026-04-03T12:00:00.000Z",
        "viewCount": 1000
      }
    ]
  }'
```

- **`201`** with a JSON body — ingest and persistence succeeded.
- **`401`** — wrong or missing `X-API-Key`.
- **`400`** — body does not match the expected shape (see `backend/src/schemas.ts`).
- **`500`** — often LLM failure, parsing, or DB issues; check backend logs (Pino).

---

## OpenAPI types (frontend)

When the backend exposes **`GET /openapi.json`** (planned in [`spec.md`](spec.md) slice 1), you can regenerate TypeScript types:

```bash
cd frontend
# Backend must be running on port 3000 first
npm run openapi:types
```

This waits up to **120 seconds** for the OpenAPI document, then writes **`frontend/src/api/schema.d.ts`**.

---

## Useful commands (cheat sheet)

**Backend** (`cd backend`)

| Command | Purpose |
|---------|---------|
| `npm run dev` | Dev server with reload (`tsx watch`) |
| `npm run build` | TypeScript compile to `dist/` |
| `npm start` | Run compiled app (`node dist/index.js`) |
| `npm test` | Vitest |
| `npx prisma migrate dev` | Apply/create migrations (development) |
| `npx prisma migrate deploy` | Apply migrations only (production/CI, no prompts) |
| `npx prisma generate` | Regenerate client after schema changes |

**Frontend** (`cd frontend`)

| Command | Purpose |
|---------|---------|
| `npm run dev` | Vite dev server |
| `npm run build` | Production build |
| `npm test` | Vitest |
| `npm run openapi:types` | Fetch OpenAPI → `src/api/schema.d.ts` (needs backend) |

---

## Troubleshooting

| Symptom | What to check |
|---------|----------------|
| `DATABASE_URL is not set` or Prisma “Can’t reach database server” | Postgres is running; `.env` exists in **`backend/`**; `DATABASE_URL` host/port/user/password/database are correct. |
| `prisma migrate dev` errors about objects already existing | You may have used **`db push`** on this DB before migrations existed. Use a **fresh database**, or learn [baselining / `migrate resolve`](https://www.prisma.io/docs/guides/migrate/developing-with-prisma-migrate/add-prisma-migrate-to-a-project) for existing data. |
| Ingest returns **401** | `X-API-Key` header must exactly match **`API_KEY`** in `backend/.env`. |
| Ingest returns **500** “AI analysis failed” | LLM keys and model chain in `.env`; quota/network; see logs. |
| Frontend shows a blank or build error | Run `npm install` in **`frontend/`**; use Node 20+. |

---

## Continuous integration

On **push** and **pull requests** to **`main`**, [`.github/workflows/ci.yml`](.github/workflows/ci.yml) spins up **PostgreSQL 16**, runs **`prisma migrate deploy`**, **`prisma generate`**, backend **build + tests**, then frontend **build + tests**.

---

## Repository layout

| Path | Role |
|------|------|
| `backend/` | Hono API, Prisma, ingest route, LLM adapters, Pino |
| `frontend/` | Vite, React, TypeScript, Tailwind |
| `spec.md` | Roadmap, vertical slices, detailed API checklist |
| `.cursorrules` | Engineering conventions for this repo |

---

## Architecture (short)

- **n8n** (later) is meant to fetch YouTube metadata on a schedule and **`POST`** to this API; business logic stays in the backend ([`.cursorrules`](.cursorrules)).
- **LLMs** (Gemini, Groq/OpenAI-compatible, etc.) are called from the backend with a configurable fallback chain.

---

## License

[MIT](LICENSE)
