import { z } from "zod";

/**
 * Validated server-only environment for the API package. Fail-fast on missing /
 * invalid vars. Throws if called in a browser (server infra must never leak).
 */
const serverSchema = z.object({
  NEXT_PUBLIC_INSTANT_APP_ID: z.string().min(1, "NEXT_PUBLIC_INSTANT_APP_ID is required"),
  INSTANT_ADMIN_TOKEN: z.string().min(1, "INSTANT_ADMIN_TOKEN is required"),
  CLI_JWT_SECRET: z
    .string()
    .min(32, "CLI_JWT_SECRET must be at least 32 chars (no insecure default allowed)"),
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
    CLI_JWT_SECRET: process.env.CLI_JWT_SECRET,
    CRON_SECRET: process.env.CRON_SECRET,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
    UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
  });
  return _serverEnv;
}
