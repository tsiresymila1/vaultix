import path from "node:path";
import dotenv from "dotenv";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { loadConfig, saveGlobalConfig } from "./config";

// Ensure we load the repo root `.env` even when running from `cli/`.
dotenv.config({ path: path.resolve(process.cwd(), "../.env"), quiet: true });
// Fallback: if user runs from repo root, this will also work.
dotenv.config({ path: path.resolve(process.cwd(), ".env"), quiet: true });

function getEnv(name: string, defaultValue?: string): string | undefined {
    return process.env[name] ?? defaultValue;
}

// Prefer using the same .env vars as the Next.js app, but allow dedicated CLI vars too.
const SUPABASE_URL =
    getEnv("NEXT_PUBLIC_SUPABASE_URL", "https://gnliznrccormuxaxgwtj.supabase.co") ||
    getEnv("VAULTIX_SUPABASE_URL", "");

const SUPABASE_ANON_KEY =
    getEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdubGl6bnJjY29ybXV4YXhnd3RqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc2MTQ0MDYsImV4cCI6MjA4MzE5MDQwNn0.l4mKB6VhyXP6DaVo2pRKwIrP00KkwqBJipKqYybIB-0") ||
    getEnv("VAULTIX_SUPABASE_ANON_KEY", "");

const customStorage = {
    getItem: (_key: string): string | null => {
        try {
            const config = loadConfig();
            if (config.authSession) {
                return JSON.stringify(config.authSession);
            }
            // Fallback for legacy token-only config
            if (config.token) {
                return JSON.stringify({
                    access_token: config.token,
                    refresh_token: "",
                    user: { email: config.email }
                });
            }
            return null;
        } catch { return null; }
    },
    setItem: (_key: string, value: string): void => {
        try {
            const session = JSON.parse(value);
            if (session && session.access_token) {
                saveGlobalConfig({
                    authSession: session,
                    token: session.access_token,
                    email: session.user?.email
                });
            }
        } catch { }
    },
    removeItem: (_key: string): void => {
        saveGlobalConfig({ authSession: undefined, token: undefined });
    }
};

export function createSupabaseClient(token?: string, projectKey?: string): SupabaseClient {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
        throw new Error(
            "Missing Supabase env vars. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY (or VAULTIX_SUPABASE_URL / VAULTIX_SUPABASE_ANON_KEY)."
        );
    }

    return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: {
            storage: customStorage,
            autoRefreshToken: true,
            persistSession: true,
            detectSessionInUrl: false
        },
        global: {
            headers: {
                ...(token ? { "Authorization": `Bearer ${token}` } : {}),
                ...(projectKey ? { "project-key": projectKey } : {})
            }
        }
    });
}

export function supabase(): SupabaseClient {
    try {
        const config = loadConfig();
        // Rely on persistSession/customStorage for auth. 
        // Passing config.token (which might be expired) in global headers can break token refresh.
        return createSupabaseClient(undefined, config.projectKey);
    } catch {
        return createSupabaseClient();
    }
}

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
