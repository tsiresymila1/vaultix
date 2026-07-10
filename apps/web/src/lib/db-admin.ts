import "server-only";

import { init } from "@instantdb/admin";
import { schema } from "@vaultix/schema";
import { clientEnv, serverEnv } from "@/lib/env";

/**
 * Server-side InstantDB Admin client. Bypasses permission rules — every query
 * MUST be manually scoped by the authenticated user's id. Used by the CLI /
 * extension proxy routes, the shared-secret read route, and the cleanup cron.
 */
export function createAdminDb() {
  return init({
    appId: clientEnv.NEXT_PUBLIC_INSTANT_APP_ID,
    adminToken: serverEnv().INSTANT_ADMIN_TOKEN,
    schema,
  });
}
