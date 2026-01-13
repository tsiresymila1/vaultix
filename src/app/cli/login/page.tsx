"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { deriveMasterKey, decryptPrivateKey, fromBase64 } from "@/lib/crypto";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Shield, Key, Loader2, LogIn } from "lucide-react";

function LoginContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [status, setStatus] = useState("idle"); // idle, decrypting, redirecting, error
    const [password, setPassword] = useState("");
    const [email, setEmail] = useState("");
    const supabase = createClient();

    useEffect(() => {
        const emailParam = searchParams.get("email");
        if (emailParam) setEmail(emailParam);
    }, [searchParams]);

    const handleAuthorize = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        
        const callback = searchParams.get("callback");
        const token = searchParams.get("token");

        if (!callback || !token) {
            toast.error("Invalid request: Missing callback or token.");
            return;
        }

        if (!password) {
            toast.error("Master password is required.");
            return;
        }

        try {
            setStatus("decrypting");
            
            // 1. Fetch user crypto data
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                router.push("/login?returnTo=" + encodeURIComponent(window.location.href));
                return;
            }

            const { data: userData, error: userError } = await supabase
                .from('users')
                .select('encrypted_private_key, master_key_salt, private_key_nonce, public_key')
                .eq('id', user.id)
                .single();

            if (userError || !userData) {
                throw new Error("Could not fetch your encryption data.");
            }

            // 2. Decrypt private key
            const salt = await fromBase64(userData.master_key_salt as string);
            const masterKey = await deriveMasterKey(password, salt);
            const privateKey = await decryptPrivateKey(
                userData.encrypted_private_key as string,
                userData.private_key_nonce as string,
                masterKey
            );

            // 3. Redirect back to CLI
            setStatus("redirecting");
            const redirectUrl = new URL(callback);
            redirectUrl.searchParams.set("token", token);
            redirectUrl.searchParams.set("email", email);
            redirectUrl.searchParams.set("private_key", privateKey);

            window.location.href = redirectUrl.toString();
        } catch (error: unknown) {
            console.error("Auth error:", error);
            setStatus("idle");
            const message = error instanceof Error ? error.message : "Decryption failed. Please check your master password.";
            toast.error(message);
        }
    };

    const handleSkip = () => {
        const callback = searchParams.get("callback");
        const token = searchParams.get("token");
        if (!callback || !token) return;

        const redirectUrl = new URL(callback);
        redirectUrl.searchParams.set("token", token);
        redirectUrl.searchParams.set("email", email);
        window.location.href = redirectUrl.toString();
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white p-4">
            <div className="max-w-md w-full glass p-8 rounded-2xl border border-white/10 shadow-2xl">
                <div className="flex justify-center mb-6">
                    <div className="p-3 bg-green-500/10 rounded-xl border border-green-500/20">
                        <Shield className="w-8 h-8 text-green-500" />
                    </div>
                </div>

                <div className="text-center mb-8">
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-green-400 to-purple-500 bg-clip-text text-transparent mb-2">
                        Authorize CLI
                    </h1>
                    <p className="text-gray-400">
                        Log in as <span className="text-white font-medium">{email}</span>
                    </p>
                </div>

                <form onSubmit={handleAuthorize} className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm text-gray-400 flex items-center gap-2">
                            <Key className="w-3 h-3" /> Master Password
                        </label>
                        <Input
                            type="password"
                            placeholder="Enter your master password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="bg-white/5 border-white/10 text-white placeholder:text-gray-600 focus:border-green-500/50 transition-all"
                            disabled={status !== "idle"}
                            autoFocus
                        />
                        <p className="text-[10px] text-gray-500">
                            Required to decrypt your private key for the CLI.
                        </p>
                    </div>

                    <Button 
                        type="submit"
                        className="w-full bg-green-600 hover:bg-green-500 text-white font-medium h-11 transition-all"
                        disabled={status !== "idle"}
                    >
                        {status === "idle" ? (
                            <span className="flex items-center gap-2"><LogIn className="w-4 h-4" /> Authorize</span>
                        ) : (
                            <span className="flex items-center gap-2">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                {status === "decrypting" ? "Decrypting..." : "Redirecting..."}
                            </span>
                        )}
                    </Button>

                    <button
                        type="button"
                        onClick={handleSkip}
                        className="w-full text-xs text-gray-500 hover:text-white transition-colors py-2"
                        disabled={status !== "idle"}
                    >
                        Skip and prompt in terminal
                    </button>
                </form>
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
