import path from "node:path";
import dotenv from "dotenv";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { loadConfig } from "./config";

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

export function supabase(): SupabaseClient {
    const config = loadConfig();

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
        throw new Error(
            "Missing Supabase env vars. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY (or VAULTIX_SUPABASE_URL / VAULTIX_SUPABASE_ANON_KEY)."
        );
    }

    return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: {
            headers: {
                "project-key": config.projectKey,
                ...(config.token ? { Authorization: `Bearer ${config.token}` } : {})
            }
        }
    });
}
