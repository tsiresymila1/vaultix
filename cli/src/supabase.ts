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
    getItem: (key: string): string | null => {
        try {
            const config = loadConfig();
            return config.authSession ? JSON.stringify(config.authSession) : null;
        } catch { return null; }
    },
    setItem: (key: string, value: string): void => {
        try {
            const session = JSON.parse(value);
            saveGlobalConfig({ authSession: session, token: session.access_token });
        } catch { }
    },
    removeItem: (key: string): void => {
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
            autoRefreshToken: false,
            persistSession: false,
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
        // If we have a token but no full session (legacy), we might pass it, 
        // but ideally we want to use storage.
        // For now, if we have a legacy flow, we keep passing token if persistSession fails? 
        // Actually, creating client with storage will try to load from it. 
        // If config.authSession is missing but config.token exists, we might need to migrate manually or just let it fail/re-login.
        // Let's stick to standard behavior: if logged in cleanly, authSession exists.
        return createSupabaseClient(config.token, config.projectKey);
    } catch {
        return createSupabaseClient();
    }
}

