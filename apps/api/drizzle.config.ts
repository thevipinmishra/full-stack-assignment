import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  dbCredentials: {
    url:
      process.env.DATABASE_URL ??
      'postgres://postgres:postgres@localhost:5432/lead_intake',
  },
  dialect: 'postgresql',
  out: './drizzle',
  schema: './src/db/schema.ts',
  strict: true,
  verbose: true,
})
