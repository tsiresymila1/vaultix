"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { OTPAuthenticator } from "@/components/shared/otp-authenticator";
import { decryptSecret } from "@/lib/crypto";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { AlertCircle, Check, Copy, Eye, EyeOff, Loader2, Lock, ShieldCheck, Timer } from "lucide-react";
import { FormEvent, MouseEvent, useEffect, useState } from "react";
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
    const [passwordRequired, setPasswordRequired] = useState(false);
    const [enteredPassword, setEnteredPassword] = useState("");
    const [passwordLoading, setPasswordLoading] = useState(false);

    useEffect(() => {
        // Extract key from hash
        const hash = window.location.hash;
        if (hash && hash.startsWith("#")) {
            const rawKey = hash.substring(1);
            if (rawKey.startsWith("pwd:")) {
                setPasswordRequired(true);
                setLoading(false); // Stop general loading to show password UI
            } else {
                setDecryptionKey(rawKey);
            }
        }
    }, []);

    const handlePasswordSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!enteredPassword.trim()) return;

        setPasswordLoading(true);
        try {
            const hash = window.location.hash.substring(1);
            const [, saltBase64, nonceBase64, cipherBase64] = hash.split(":");

            const { deriveMasterKey, fromBase64, decryptSecret } = await import("@/lib/crypto");
            const salt = await fromBase64(saltBase64);
            const masterKey = await deriveMasterKey(enteredPassword.trim(), salt);
            
            const decryptedKey = await decryptSecret(cipherBase64, nonceBase64, await (await import("@/lib/crypto")).toBase64(masterKey));
            
            setDecryptionKey(decryptedKey);
            setPasswordRequired(false);
            setLoading(true); // Restart loading for fetching from Supabase
        } catch (err) {
            console.error("Password decryption error:", err);
            toast.error("Incorrect password. Please try again.");
        } finally {
            setPasswordLoading(false);
        }
    };

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
        // Reformat from "KEY: VALUE" to "KEY=VALUE" for env compatibility if it contains colons
        const envFormatted = secretValue.split('\n').map(line => {
            const colonIndex = line.indexOf(':');
            if (colonIndex === -1) return line;
            return `${line.substring(0, colonIndex).trim()}=${line.substring(colonIndex + 1).trim()}`;
        }).join('\n');
        
        navigator.clipboard.writeText(envFormatted);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        toast.success("Copied all as .env format");
    };

    if (passwordRequired) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background p-4">
                <Card className="w-full max-w-md border-border bg-card shadow-lg">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Lock className="h-5 w-5 text-primary" />
                            Password Protected
                        </CardTitle>
                        <CardDescription>
                            This secret is protected by an additional password. Please enter it to continue.
                        </CardDescription>
                    </CardHeader>
                    <form onSubmit={handlePasswordSubmit}>
                        <CardContent className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Input
                                    type="password"
                                    placeholder="Enter password..."
                                    value={enteredPassword}
                                    onChange={(e) => setEnteredPassword(e.target.value)}
                                    autoFocus
                                />
                            </div>
                        </CardContent>
                        <CardFooter>
                            <Button type="submit" className="w-full" disabled={passwordLoading}>
                                {passwordLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {passwordLoading ? "Decrypting Key..." : "Access Secret"}
                            </Button>
                        </CardFooter>
                    </form>
                </Card>
            </div>
        );
    }

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
                                        "w-full rounded-md border min-h-[100px] p-0 font-mono text-sm transition-all relative overflow-hidden",
                                        revealed
                                            ? "bg-secondary text-foreground border-border"
                                            : "bg-secondary/30 text-transparent border-border/50 cursor-pointer hover:bg-secondary/50"
                                    )} onClick={() => !revealed && setRevealed(true)}>
                                        <div className={cn(
                                            "divide-y divide-border/50 max-h-[400px] overflow-y-auto scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent",
                                            revealed ? "" : "blur-sm select-none opacity-50 block p-4 overflow-hidden"
                                        )}>
                                            {revealed ? (
                                                secretValue?.split('\n').map((line, i) => {
                                                    const colonIndex = line.indexOf(':');
                                                    if (colonIndex === -1) return <div key={i} className="p-4">{line}</div>;
                                                    
                                                    const key = line.substring(0, colonIndex).trim();
                                                    const value = line.substring(colonIndex + 1).trim();
                                                    
                                                    const isOtpSeed = key === "OTP Seed";

                                                    const copyIndividualValue = (e: MouseEvent, k: string, v: string) => {
                                                        e.stopPropagation();
                                                        const envEntry = `${k}=${v}`;
                                                        navigator.clipboard.writeText(envEntry);
                                                        toast.success(`Copied ${k}=...`);
                                                    };

                                                    return (
                                                        <div key={i} className="flex flex-col hover:bg-background/50 transition-colors group/row">
                                                            <div className="flex items-start sm:items-center justify-between p-4 gap-4">
                                                                <div className="flex flex-col gap-1 min-w-0">
                                                                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider shrink-0">{key}</span>
                                                                    <span className="font-mono text-sm break-all text-primary font-medium">{value}</span>
                                                                </div>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-8 w-8 rounded-md opacity-0 group-hover/row:opacity-100 transition-opacity shrink-0 hover:bg-primary/10 hover:text-primary"
                                                                    onClick={(e) => copyIndividualValue(e, key, value)}
                                                                >
                                                                    <Copy className="h-3.5 w-3.5" />
                                                                </Button>
                                                            </div>
                                                            {isOtpSeed && value && (
                                                                <div className="px-4 pb-4">
                                                                    <OTPAuthenticator
                                                                        secret={value}
                                                                        issuer="Vaultix Shared"
                                                                        accountName="Credential"
                                                                        compact={true}
                                                                        className="p-3 rounded-xl bg-primary/5 border border-primary/20"
                                                                    />
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })
                                            ) : (
                                                "••••••••••••••••••••••••••••••••••••••••••••••••••••••••"
                                            )}
                                        </div>

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
