import { createApiClient, bearer } from "@vaultix/api-client";

const baseUrl =
  typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";

/** Typed Hono RPC client for internal web-app calls. */
export const rpc = createApiClient(baseUrl);
export const api = rpc.api;
export { bearer };
