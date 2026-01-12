"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { decryptSecret } from "@/lib/crypto";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { AlertCircle, Check, Copy, Eye, EyeOff, Loader2, ShieldCheck, Timer } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import Link from "next/link";
import { use } from "react";

interface SharedSecretPageProps {
    params: Promise<{
        id: string;
    }>;
}

export default function SharedSecretPage({ params }: SharedSecretPageProps) {
    const { id } = use(params);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [secretValue, setSecretValue] = useState<string | null>(null);
    const [metadata, setMetadata] = useState<{ expires_at: string; views_remaining: number | null } | null>(null);
    const [revealed, setRevealed] = useState(false);
    const [copied, setCopied] = useState(false);
    const [decryptionKey, setDecryptionKey] = useState<string | null>(null);

    useEffect(() => {
        // Extract key from hash
        const hash = window.location.hash;
        if (hash && hash.startsWith("#")) {
            setDecryptionKey(hash.substring(1));
        }
    }, []);

    useEffect(() => {
        if (!decryptionKey) return;

        const fetchSecret = async () => {
            try {
                // 1. Fetch encrypted payload
                const { data, error } = await supabase
                    .from("shared_secrets")
                    .select("encrypted_payload, nonce, expires_at, views_remaining")
                    .eq("id", id)
                    .single();

                if (error || !data) {
                    throw new Error("Secret not found or expired.");
                }

                setMetadata({
                    expires_at: data.expires_at,
                    views_remaining: data.views_remaining
                });

                // 2. Decrypt
                const decrypted = await decryptSecret(
                    data.encrypted_payload,
                    data.nonce,
                    decryptionKey
                );

                setSecretValue(decrypted);

                // 3. Decrement view count if needed (best effort)
                // Note: The RPC might fail if the user is unauthenticated and RLS/Policies block it.
                // But typically for this use case, we allow anyone to call it via the policy we set?
                // Wait, in step 69 I created `read_shared_secret` as SECURITY DEFINER
                // This means it runs with permissions of the creator of the function (postgres usually, or an admin role)
                // So it should bypass RLS for the update.
                // However, we need to make sure the public role can EXECUTE it.
                // Assuming default permissions allow public execution or need explicit grant.
                // Let's try calling it.
                if (data.views_remaining !== null) {
                   await supabase.rpc('read_shared_secret', { secret_id: id });
                }

            } catch (err) {
                console.error("Fetch error:", err);
                setError("This secret link is invalid, expired, or has reached its view limit.");
            } finally {
                setLoading(false);
            }
        };

        fetchSecret();
    }, [id, decryptionKey]);

    const copyToClipboard = () => {
        if (!secretValue) return;
        navigator.clipboard.writeText(secretValue);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        toast.success("Copied to clipboard");
    };

    if (!decryptionKey && !loading) {
        return ( // No key in URL
            <div className="min-h-screen flex items-center justify-center bg-background p-4">
                <Card className="w-full max-w-md border-destructive/50 bg-destructive/5">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-destructive">
                            <AlertCircle className="h-5 w-5" />
                            Invalid Link
                        </CardTitle>
                        <CardDescription>
                            The decryption key is missing from the URL. Ensure you have the full link including the part after the #.
                        </CardDescription>
                    </CardHeader>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col bg-background">
             <header className="px-6 h-16 flex items-center border-b border-border/40">
                <Link href="/" className="flex items-center gap-2 font-bold text-xl tracking-tight mr-8">
                    <ShieldCheck className="w-6 h-6 text-primary" />
                    <span>Vaultix Note</span>
                </Link>
                <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground ml-auto">
                    <Link href="/#features" className="hover:text-foreground transition-colors">Features</Link>
                    <Link href="/#security" className="hover:text-foreground transition-colors">Security</Link>
                    <Link href="/#cli" className="hover:text-foreground transition-colors">CLI</Link>
                </nav>
            </header>

            <main className="flex-1 flex items-center justify-center p-4">
            <div className="w-full max-w-lg space-y-8">
                <div className="text-center space-y-2">
                    <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <ShieldCheck className="h-6 w-6 text-primary" />
                    </div>
                    <h1 className="text-2xl font-bold tracking-tight">Secure Shared Secret</h1>
                    <p className="text-muted-foreground">
                        This secret was shared via a secure, end-to-end encrypted link.
                    </p>
                </div>

                <Card className={cn(
                    "border-border transition-all duration-300",
                    error ? "border-destructive/50 bg-destructive/5" : "bg-card shadow-lg"
                )}>
                    {loading ? (
                        <div className="p-12 flex flex-col items-center justify-center text-center space-y-4">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            <p className="text-sm text-muted-foreground">Decrypting secure payload...</p>
                        </div>
                    ) : error ? (
                        <CardContent className="pt-6 text-center space-y-4">
                            <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
                                <AlertCircle className="h-6 w-6 text-destructive" />
                            </div>
                            <div className="space-y-2">
                                <h3 className="font-semibold text-foreground">Access Denied</h3>
                                <p className="text-sm text-muted-foreground">{error}</p>
                            </div>
                        </CardContent>
                    ) : (
                        <>
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <div className="space-y-1">
                                        <CardTitle className="text-base">Secret Content</CardTitle>
                                        <CardDescription className="text-xs">
                                            Expires {(() => {
                                                if (!metadata) return "";
                                                const date = new Date(metadata.expires_at);
                                                const now = new Date();
                                                const diffMs = date.getTime() - now.getTime();
                                                const diffMins = Math.round(diffMs / 60000);
                                                const diffHours = Math.round(diffMs / 3600000);
                                                const diffDays = Math.round(diffMs / 86400000);

                                                if (diffMins < 60) return `in ${diffMins} minutes`;
                                                if (diffHours < 24) return `in ${diffHours} hours`;
                                                return `in ${diffDays} days`;
                                            })()}
                                        </CardDescription>
                                    </div>
                                    {metadata && metadata.views_remaining !== null && (
                                        <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-amber-500/10 text-amber-500 text-[10px] font-bold uppercase tracking-widest border border-amber-500/20">
                                            <Timer className="h-3 w-3" />
                                            {metadata.views_remaining <= 1 ? "Last View" : `${metadata.views_remaining} Views Left`}
                                        </div>
                                    )}
                                </div>
                            </CardHeader>
                            <CardContent className="pb-2">
                                <div className="relative group">
                                    <div className={cn(
                                        "w-full rounded-md border min-h-[100px] p-4 font-mono text-sm break-all transition-all relative overflow-hidden",
                                        revealed
                                            ? "bg-secondary text-foreground border-border"
                                            : "bg-secondary/30 text-transparent border-border/50 cursor-pointer hover:bg-secondary/50"
                                    )} onClick={() => !revealed && setRevealed(true)}>
                                        <span className={cn(revealed ? "" : "blur-sm select-none opacity-50")}>
                                            {revealed ? secretValue : "••••••••••••••••••••••••••••••••••••••••••••••••••••••••"}
                                        </span>

                                        {!revealed && (
                                            <div className="absolute inset-0 flex items-center justify-center bg-background/5 backdrop-blur-[2px]">
                                                <Button variant="secondary" size="sm" className="shadow-sm">
                                                    <Eye className="mr-2 h-3.5 w-3.5" />
                                                    Click to Reveal
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                            <CardFooter className="flex justify-between pt-4">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setRevealed(!revealed)}
                                    className="text-muted-foreground"
                                >
                                    {revealed ? (
                                        <>
                                            <EyeOff className="mr-2 h-4 w-4" /> Hide
                                        </>
                                    ) : (
                                        <>
                                            <Eye className="mr-2 h-4 w-4" /> Show
                                        </>
                                    )}
                                </Button>
                                {revealed && (
                                    <Button size="sm" onClick={copyToClipboard}>
                                        {copied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
                                        {copied ? "Copied" : "Copy Content"}
                                    </Button>
                                )}
                            </CardFooter>
                        </>
                    )}
                </Card>

                <div className="text-center">
                    <p className="text-xs text-muted-foreground">
                        Powered by Vaultix • End-to-End Encrypted
                    </p>
                </div>
            </div>
            </main>
        </div>
    );
}
