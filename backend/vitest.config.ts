import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    passWithNoTests: true,
    // Prisma is imported by the app graph; OpenAPI tests instantiate `createApp` without hitting the DB.
    env: {
      DATABASE_URL:
        process.env.DATABASE_URL ?? 'postgresql://localhost:5432/youtube_trend_vitest',
    },
  },
})
