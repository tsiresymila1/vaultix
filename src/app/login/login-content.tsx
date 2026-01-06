"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { deriveMasterKey, decryptPrivateKey, fromBase64 } from "@/lib/crypto";
import { useAuth } from "@/context/auth-context";
import Link from "next/link";
import { Shield, Loader2 } from "lucide-react";

export default function LoginPageContent() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const { setKeys } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (authError) throw authError;
            console.info('Getting user profile ....')
            // Fetch user profile using secure RPC to bypass potential RLS issues
            const { data: userRows, error: userError } = await supabase.rpc("get_my_profile", {
                p_uid: authData.user.id
            });

            console.info('User profile fetched successfully')
            if (userError) throw userError;

            if (!userRows || userRows.length === 0) {
                console.error("Profile missing for ID:", authData.user.id);
                // This means the auth user exists but the public profile (keys) is missing
                await supabase.auth.signOut();
                throw new Error(`Account setup incomplete (Profile missing for ${authData.user.id}). Please register again.`);
            }

            const userData = userRows[0];

            const salt = await fromBase64(userData.master_key_salt);
            const masterKey = await deriveMasterKey(password, salt);
            const privateKey = await decryptPrivateKey(
                userData.encrypted_private_key,
                userData.private_key_nonce,
                masterKey
            );

            setKeys(masterKey, privateKey);
            toast.success("Welcome back to Vaultix");

            // Explicitly get fresh session to ensure refresh_token is available
            const { data: { session: freshSession } } = await supabase.auth.getSession();
            const currentSession = freshSession || authData.session;

            const returnTo = searchParams.get("returnTo");
            if (returnTo) {
                // If it's a CLI login callback, we need to append the session data
                if (returnTo.includes("callback=")) {
                    // It's highly likely an API route or another handler
                    // We append tokens to the returnTo URL so the destination can pick them up
                    const returnUrl = new URL(returnTo, window.location.href);
                    // Supabase session tokens - be extremely explicit to avoid passing "null" as a string
                    const accessToken = currentSession?.access_token || "";
                    const refreshToken = currentSession?.refresh_token || "";
                    const userEmail = authData.user?.email || "";

                    if (accessToken) {
                        returnUrl.searchParams.set("access_token", accessToken);
                    }
                    if (refreshToken && refreshToken !== "null") {
                        returnUrl.searchParams.set("refresh_token", refreshToken);
                    }
                    if (userEmail) {
                        returnUrl.searchParams.set("email", userEmail);
                    }

                    // For the specific /api/auth/cli case, it expects 'callback' param to be preserved
                    // which is already in 'returnTo'. The API route logic will grab session from cookie 
                    // or we can pass it explicitly if we want to be doubly sure, but 
                    // since we just signed in, the cookie is set. 

                    // HOWEVER, if the downstream is a non-cookie based CLI callback directly (unlikely given previous step),
                    // we might need to be careful.

                    // The previous step established /api/auth/cli?callback=...
                    // So we are redirecting to that.

                    router.push(returnUrl.toString());
                } else {
                    router.push(returnTo);
                }
            } else {
                router.push("/vaults");
            }
        } catch (error) {

            console.error(error)
            const message = error instanceof Error ? error.message : "Invalid credentials";
            toast.error(message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-full lg:grid lg:min-h-screen lg:grid-cols-2 xl:min-h-screen">
            <div className="hidden bg-muted lg:block relative h-full">
                <div className="absolute inset-0 bg-zinc-900 border-l border-white/10" />
                <div className="relative h-full flex flex-col justify-between p-10 text-white z-20">
                    <div className="flex items-center gap-2 text-lg font-medium">
                        <Shield className="w-6 h-6" /> Vaultix
                    </div>
                    <div className="space-y-2 max-w-lg">
                        <blockquote className="space-y-2">
                            <p className="text-sm">
                                &ldquo;This library has saved me countless hours of work and helped me deliver stunning designs to my clients faster than ever before.&rdquo;
                            </p>
                            <footer className="text-sm text-white/60">Sofia Davis</footer>
                        </blockquote>
                    </div>
                </div>
            </div>
            <div className="flex items-center justify-center py-12 min-h-screen">
                <div className="mx-auto w-full max-w-[350px] space-y-6">
                    <div className="text-center space-y-2">
                        <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 mb-2">
                            <Shield className="w-5 h-5 text-primary" />
                        </div>
                        <h1 className="text-2xl font-bold tracking-tight text-foreground">
                            Welcome back
                        </h1>
                        <p className="text-muted-foreground text-sm">
                            Enter your email to sign in to your account
                        </p>
                    </div>

                    <form onSubmit={handleLogin} id="login-form" className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Email</label>
                            <Input
                                type="email"
                                placeholder="name@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="h-9 rounded-md focus-visible:ring-1 focus-visible:ring-primary focus-visible:ring-offset-0"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Password</label>
                            </div>
                            <Input
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="h-9 rounded-md focus-visible:ring-1 focus-visible:ring-primary focus-visible:ring-offset-0"
                                required
                            />
                        </div>

                        <Button
                            type="submit"
                            form="login-form"
                            className="w-full h-9 rounded-md text-sm font-medium"
                            disabled={loading}
                        >
                            {loading ? (
                                <div className="flex items-center gap-2">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    <span>Signing in...</span>
                                </div>
                            ) : (
                                "Sign In"
                            )}
                        </Button>
                    </form>

                    <p className="px-8 text-center text-sm text-muted-foreground">
                        <Link href="/register" className="hover:text-brand underline underline-offset-4">
                            Don&apos;t have an account? Sign Up
                        </Link>
                    </p>
                </div>
            </div>

        </div>
    );
}
