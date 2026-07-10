import { hc } from "hono/client";
import type { AppType } from "@/lib/http/app";

const baseUrl =
  typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";

/** Typed Hono RPC client. Internal web-app calls go through `api`. */
export const rpc = hc<AppType>(baseUrl);
export const api = rpc.api;

/** Bearer header helper for authenticated RPC calls. */
export function bearer(token: string | null | undefined) {
  return { Authorization: `Bearer ${token ?? ""}` };
}
