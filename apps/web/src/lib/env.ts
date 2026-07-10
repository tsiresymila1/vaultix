import { z } from "zod";

/**
 * Client-safe environment for the web app. The `NEXT_PUBLIC_*` var is read via
 * explicit property access so Next.js inlines it into the browser bundle.
 * Server-only secrets live in @vaultix/api (`serverEnv`).
 */
const clientSchema = z.object({
  NEXT_PUBLIC_INSTANT_APP_ID: z.string().min(1, "NEXT_PUBLIC_INSTANT_APP_ID is required"),
});

export const clientEnv = clientSchema.parse({
  NEXT_PUBLIC_INSTANT_APP_ID: process.env.NEXT_PUBLIC_INSTANT_APP_ID,
});
