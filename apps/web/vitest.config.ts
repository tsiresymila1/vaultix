import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["src/**/*.test.ts"],
    // Baseline env so eagerly-parsed clientEnv (in @/lib/env) resolves at import
    // time. ESM hoists static imports above any in-file `process.env` assignment,
    // so per-file top-of-file sets can't be relied on for import-time parsing.
    // Individual tests still override/delete these to assert validation behavior.
    env: {
      NEXT_PUBLIC_INSTANT_APP_ID: "00000000-0000-0000-0000-000000000000",
      INSTANT_ADMIN_TOKEN: "test-admin-token",
      AUTH_JWT_SECRET: "test-cli-jwt-secret-at-least-32-chars-long",
      CRON_SECRET: "test-cron-secret-16chars",
    },
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
