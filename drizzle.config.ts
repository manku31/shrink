import { defineConfig } from "drizzle-kit";

try {
  process.loadEnvFile(".env.local");
} catch {
  // Env vars may already be provided by the environment (CI, Vercel).
}

export default defineConfig({
  schema: "./db/schema.ts",
  out: "./db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    // Direct (non-pooled) connection: required for migrations.
    url: process.env.DATABASE_URL_UNPOOLED!,
  },
});
