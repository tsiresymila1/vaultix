import dotenv from "dotenv";
import path from "node:path";
import { createApiClient } from "@vaultix/api-client";
import { loadConfig } from "./config";

dotenv.config({ path: path.resolve(process.cwd(), ".env"), quiet: true });

// Typed Hono RPC call to the /api/cli proxy. Returns the { data, error } shape
// the CLI commands consume.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type CliApiResult = { data: any; error: any };

export async function callCliApi(
  action: string,
  params: Record<string, unknown> = {},
): Promise<CliApiResult> {
  const config = loadConfig();
  const token = config.token;
  const APP_URL = process.env.VAULTIX_APP_URL || "https://vaultix-secure.vercel.app";

  if (!token) {
    return { error: "Not logged in. Please run `vaultix login` first.", data: null };
  }

  try {
    const api = createApiClient(APP_URL).api;
    const res = await api.cli.$post(
      // action is validated server-side against the CliAction enum.
      { json: { action, params } as never },
      { headers: { Authorization: `Bearer ${token}` } },
    );

    if (!res.ok) {
      const err = (await res.json().catch(() => ({ error: "API request failed" }))) as {
        error?: string;
      };
      return { error: err.error || "API request failed", data: null };
    }
    return (await res.json()) as CliApiResult;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { error: message, data: null };
  }
}
