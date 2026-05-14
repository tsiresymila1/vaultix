"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Key, Loader2, CheckCircle } from "lucide-react";
import { toast } from "sonner";

function LoginContent() {
    const searchParams = useSearchParams();
    
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState<"idle" | "decrypting" | "success">("idle");

    useEffect(() => {
        const emailParam = searchParams.get("email");
        if (emailParam) setEmail(emailParam);
    }, [searchParams]);

    const handleAuthorize = async (e: React.FormEvent) => {
        e.preventDefault();
        
        const token = searchParams.get("token");

        if (!token) {
            toast.error("Invalid request: Missing token.");
            return;
        }

        if (!password) {
            toast.error("Master password is required.");
            return;
        }

        try {
            setStatus("decrypting");

            const response = await fetch("/api/extension/decrypt", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token, masterPassword: password })
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || "Decryption failed");
            }

            // Store auth data in localStorage
            localStorage.setItem("vaultix_extension_auth", JSON.stringify({
                token,
                email,
                privateKey: result.data.privateKey,
                masterKeySalt: result.data.masterKeySalt,
                encryptedPrivateKey: result.data.encryptedPrivateKey,
                privateKeyNonce: result.data.privateKeyNonce
            }));

            // Send auth data via postMessage to the content script (which forwards to background)
            window.postMessage({
                action: 'VAULTIX_AUTH_FROM_PAGE',
                token,
                email,
                privateKey: result.data.privateKey,
                masterKeySalt: result.data.masterKeySalt,
                encryptedPrivateKey: result.data.encryptedPrivateKey,
                privateKeyNonce: result.data.privateKeyNonce
            }, '*');
            
            // Also store in localStorage as backup
            localStorage.setItem("vaultix_extension_auth", JSON.stringify({
                token,
                email,
                privateKey: result.data.privateKey,
                masterKeySalt: result.data.masterKeySalt,
                encryptedPrivateKey: result.data.encryptedPrivateKey,
                privateKeyNonce: result.data.privateKeyNonce
            }));

            setStatus("success");
            toast.success("Extension authorized successfully!");
        } catch (error) {
            console.error("Auth error:", error);
            setStatus("idle");
            const message = error instanceof Error ? error.message : "Decryption failed. Please check your master password.";
            toast.error(message);
        }
    };

    if (status === "success") {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background p-4">
                <Card className="w-full max-w-md">
                    <CardHeader className="text-center">
                        <div className="flex justify-center mb-4">
                            <div className="w-16 h-16 rounded-xl bg-green-500/10 flex items-center justify-center">
                                <CheckCircle className="h-8 w-8 text-green-500" />
                            </div>
                        </div>
                        <CardTitle className="text-2xl">Extension Authorized!</CardTitle>
                        <p className="text-muted-foreground text-sm mt-2">
                            Your extension is now connected to your vault.
                        </p>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p className="text-sm text-muted-foreground text-center">
                            You can now close this tab and use the Vaultix extension.
                        </p>
                        <Button 
                            className="w-full" 
                            onClick={() => window.close()}
                        >
                            Close Tab
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

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
                                    Authorizing...
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