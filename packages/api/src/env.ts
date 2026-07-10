import { z } from "zod";

/**
 * Validated server-only environment for the API package. Fail-fast on missing /
 * invalid vars. Throws if called in a browser (server infra must never leak).
 */
const serverSchema = z.object({
  NEXT_PUBLIC_INSTANT_APP_ID: z.string().min(1, "NEXT_PUBLIC_INSTANT_APP_ID is required"),
  INSTANT_ADMIN_TOKEN: z.string().min(1, "INSTANT_ADMIN_TOKEN is required"),
  AUTH_JWT_SECRET: z
    .string()
    .min(32, "AUTH_JWT_SECRET must be at least 32 chars (no insecure default allowed)"),
  // App key that wraps each user's private key at rest (base64 of 32 bytes).
  // Generate: openssl rand -base64 32
  SECRETS_ENC_KEY: z
    .string()
    .refine((v) => Buffer.from(v, "base64").length === 32, "SECRETS_ENC_KEY must be base64 of 32 bytes"),
  CRON_SECRET: z.string().min(16, "CRON_SECRET must be at least 16 chars"),
  RESEND_API_KEY: z.string().min(1).optional(),
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1).optional(),
});

let _serverEnv: z.infer<typeof serverSchema> | null = null;

export function serverEnv(): z.infer<typeof serverSchema> {
  if (typeof window !== "undefined") {
    throw new Error("serverEnv() must not be called on the client");
  }
  if (_serverEnv) return _serverEnv;
  _serverEnv = serverSchema.parse({
    NEXT_PUBLIC_INSTANT_APP_ID: process.env.NEXT_PUBLIC_INSTANT_APP_ID,
    INSTANT_ADMIN_TOKEN: process.env.INSTANT_ADMIN_TOKEN,
    AUTH_JWT_SECRET: process.env.AUTH_JWT_SECRET,
    SECRETS_ENC_KEY: process.env.SECRETS_ENC_KEY,
    CRON_SECRET: process.env.CRON_SECRET,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
    UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
  });
  return _serverEnv;
}
