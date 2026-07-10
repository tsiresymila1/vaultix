import { hc } from "hono/client";
import type { AppType } from "@vaultix/api";

/**
 * Typed Hono RPC client for the Vaultix API. Works in the browser (web,
 * extension) and Node (CLI). The AppType import is type-only, so no server code
 * is bundled into clients.
 */
export function createApiClient(baseUrl: string) {
  return hc<AppType>(baseUrl);
}

export type ApiClient = ReturnType<typeof createApiClient>;

/** Bearer header helper for authenticated RPC calls. */
export function bearer(token: string | null | undefined) {
  return { Authorization: `Bearer ${token ?? ""}` };
}
