import { createApiClient, bearer } from "@vaultix/api-client";

export { bearer };

export const VAULTIX_URL =
  import.meta.env.VITE_VAULTIX_URL || "https://vaultix-secure.vercel.app";

/** Typed Hono RPC client for the Vaultix API (basePath /api). */
export const api = createApiClient(VAULTIX_URL).api;
