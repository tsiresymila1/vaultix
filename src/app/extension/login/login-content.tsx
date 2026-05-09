"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { deriveMasterKey, decryptPrivateKey, fromBase64 } from "@/lib/crypto";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Key, Loader2 } from "lucide-react";
import { toast } from "sonner";

function LoginContent() {
    const searchParams = useSearchParams();
    const supabase = createClient();
    
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState<"idle" | "decrypting" | "redirecting">("idle");

    useEffect(() => {
        const emailParam = searchParams.get("email");
        if (emailParam) setEmail(emailParam);
    }, [searchParams]);

    const handleAuthorize = async (e: React.FormEvent) => {
        e.preventDefault();
        
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

            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                toast.error("Please sign in first");
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

            const salt = await fromBase64(userData.master_key_salt as string);
            const masterKey = await deriveMasterKey(password, salt);
            const privateKey = await decryptPrivateKey(
                userData.encrypted_private_key as string,
                userData.private_key_nonce as string,
                masterKey
            );

            setStatus("redirecting");
            
            const redirectUrl = new URL(callback);
            redirectUrl.searchParams.set("token", token);
            redirectUrl.searchParams.set("email", email);
            redirectUrl.searchParams.set("private_key", privateKey);
            redirectUrl.searchParams.set("master_key_salt", userData.master_key_salt as string);
            redirectUrl.searchParams.set("encrypted_private_key", userData.encrypted_private_key as string);
            redirectUrl.searchParams.set("private_key_nonce", userData.private_key_nonce as string);

            window.location.href = redirectUrl.toString();
        } catch (error) {
            console.error("Auth error:", error);
            setStatus("idle");
            const message = error instanceof Error ? error.message : "Decryption failed. Please check your master password.";
            toast.error(message);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
            <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-4">
                        <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center">
                            <Shield className="h-8 w-8 text-primary" />
                        </div>
                    </div>
                    <CardTitle className="text-2xl">Vaultix Extension</CardTitle>
                    <p className="text-muted-foreground text-sm mt-2">
                        Authorize your browser extension
                    </p>
                    <p className="text-muted-foreground text-xs mt-1">
                        Logged in as <span className="font-medium text-foreground">{email}</span>
                    </p>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleAuthorize} className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium flex items-center gap-2">
                                <Key className="h-3 w-3" /> Master Password
                            </label>
                            <Input
                                type="password"
                                placeholder="Enter your master password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                disabled={status !== "idle"}
                                autoFocus
                            />
                            <p className="text-[10px] text-muted-foreground">
                                Required to decrypt your private key for the extension.
                            </p>
                        </div>
                        <Button
                            type="submit"
                            className="w-full"
                            disabled={status !== "idle" || !password}
                        >
                            {status === "idle" ? (
                                "Authorize"
                            ) : (
                                <span className="flex items-center gap-2">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    {status === "decrypting" ? "Decrypting..." : "Redirecting..."}
                                </span>
                            )}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}

export default function ExtensionLoginContent() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-background">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        }>
            <LoginContent />
        </Suspense>
    );
}