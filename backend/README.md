# Backend (Hono + Prisma)

Setup, environment variables, Prisma commands, and ingest examples are documented in the **[root README](../README.md)** (start there).

Quick dev server:

```bash
npm install
cp .env.example .env   # then edit DATABASE_URL, API_KEY, LLM keys
npx prisma generate && npx prisma migrate dev
npm run dev
```

API default: http://localhost:3000
