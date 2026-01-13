import dotenv from "dotenv";
import path from "node:path";
import { loadConfig } from "./config";

dotenv.config({ path: path.resolve(process.cwd(), ".env"), quiet: true });

export async function callCliApi(action: string, params: Record<string, unknown> = {}) {
    const config = loadConfig();
    const token = config.token;
    // Prefer using the same URL as login.ts
    const APP_URL = process.env.VAULTIX_APP_URL || "https://vaultix-secure.vercel.app";

    if (!token) return { error: "Not logged in. Please run `vaultix login` first.", data: null };

    try {
        const response = await fetch(`${APP_URL}/api/cli`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({ action, params })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: "API request failed" })) as { error?: string };
            return { error: errorData.error || "API request failed", data: null };
        }

        return await response.json();
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        return { error: message, data: null };
    }
}
