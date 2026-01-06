"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

function LoginContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [status, setStatus] = useState("Authenticating...");
    const supabase = createClient();

    useEffect(() => {
        const handleLogin = async () => {
            const callback = searchParams.get("callback");
            if (!callback) {
                setStatus("Error: No callback URL provided.");
                return;
            }

            const { data: { session } } = await supabase.auth.getSession();

            // Check session first, then fallback to URL params
            const token = session?.access_token || searchParams.get("access_token") || searchParams.get("token");
            const refreshToken = session?.refresh_token || searchParams.get("refresh_token");
            const email = session?.user?.email || searchParams.get("email");

            if (!token) {
                // Not logged in and no tokens in URL, redirect to main login
                const currentUrl = window.location.href;
                router.push(`/login?returnTo=${encodeURIComponent(currentUrl)}`);
                return;
            }

            // Logged in, redirect back to CLI
            const redirectUrl = new URL(callback);

            // Forward tokens if we have them
            if (token && token !== "null") {
                redirectUrl.searchParams.set("token", token);
            }
            if (refreshToken && refreshToken !== "null") {
                redirectUrl.searchParams.set("refresh_token", refreshToken);
            }
            if (email && email !== "null") {
                redirectUrl.searchParams.set("email", email);
            }

            setStatus("Redirecting back to CLI...");
            window.location.href = redirectUrl.toString();
        };

        handleLogin();
    }, [router, searchParams, supabase]);

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white p-4">
            <div className="max-w-md w-full glass p-8 rounded-2xl border border-white/10 text-center">
                <h1 className="text-2xl font-bold mb-4 bg-gradient-to-r from-green-700 to-purple-500 bg-clip-text text-transparent">
                    Vaultix CLI Login
                </h1>
                <p className="text-gray-400">{status}</p>
                <div className="mt-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto"></div>
                </div>
            </div>
        </div>
    );
}

export default function CliLoginPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <LoginContent />
        </Suspense>
    );
}
