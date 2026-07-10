import { z } from "zod";

/**
 * Centralized, validated environment access.
 *
 * - Client-safe (`NEXT_PUBLIC_*`) vars are read via explicit property access so
 *   Next.js can statically inline them into the browser bundle.
 * - Server-only vars are validated lazily and ONLY on the server, so importing
 *   this module in a client component never throws on missing server secrets.
 *
 * Fail-fast: a missing/invalid required var throws at first access instead of
 * surfacing as an undefined-at-runtime bug (this replaces every `process.env.X!`).
 */

const clientSchema = z.object({
  NEXT_PUBLIC_INSTANT_APP_ID: z.string().min(1, "NEXT_PUBLIC_INSTANT_APP_ID is required"),
});

const serverSchema = z.object({
  INSTANT_ADMIN_TOKEN: z.string().min(1, "INSTANT_ADMIN_TOKEN is required"),
  CLI_JWT_SECRET: z
    .string()
    .min(32, "CLI_JWT_SECRET must be at least 32 chars (no insecure default allowed)"),
  CRON_SECRET: z.string().min(16, "CRON_SECRET must be at least 16 chars"),
  // Optional integrations — validated only when present.
  RESEND_API_KEY: z.string().min(1).optional(),
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1).optional(),
});

// Explicit references so Next.js inlines the public value at build time.
export const clientEnv = clientSchema.parse({
  NEXT_PUBLIC_INSTANT_APP_ID: process.env.NEXT_PUBLIC_INSTANT_APP_ID,
});

let _serverEnv: z.infer<typeof serverSchema> | null = null;

/**
 * Validated server-only env. Call from server components, route handlers, and
 * server actions. Throws in the browser to prevent leaking server config.
 */
export function serverEnv(): z.infer<typeof serverSchema> {
  if (typeof window !== "undefined") {
    throw new Error("serverEnv() must not be called on the client");
  }
  if (_serverEnv) return _serverEnv;
  _serverEnv = serverSchema.parse({
    INSTANT_ADMIN_TOKEN: process.env.INSTANT_ADMIN_TOKEN,
    CLI_JWT_SECRET: process.env.CLI_JWT_SECRET,
    CRON_SECRET: process.env.CRON_SECRET,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
    UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
  });
  return _serverEnv;
}
