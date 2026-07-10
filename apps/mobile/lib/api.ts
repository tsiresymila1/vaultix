import { createApiClient, bearer } from "@vaultix/api-client";

// Points at the deployed Vaultix backend (override with EXPO_PUBLIC_VAULTIX_URL
// for local dev, e.g. http://<your-lan-ip>:3000).
const BASE_URL =
  process.env.EXPO_PUBLIC_VAULTIX_URL ?? "https://vaultix-secure.vercel.app";

/** Typed Hono RPC client — same one the web + extension use. */
export const rpc = createApiClient(BASE_URL);
export const api = rpc.api;
export { bearer, BASE_URL };
