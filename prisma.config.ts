import { defineConfig } from "prisma/config";

try {
  process.loadEnvFile(".env.local");
} catch {
  // Env vars may already be provided by the environment (CI, Vercel).
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: {
    // Direct (non-pooled) connection: required for migrations and introspection.
    url: process.env.DATABASE_URL_UNPOOLED!,
  },
});
