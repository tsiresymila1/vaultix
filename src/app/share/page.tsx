"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { encryptSecret, generateVaultKey } from "@/lib/crypto";
import { supabase } from "@/lib/supabase";
import { Check, Copy, Link as LinkIcon, Loader2, Share2, Shield } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

export default function CreateSharePage() {
    const [secretValue, setSecretValue] = useState("");
    const [duration, setDuration] = useState("3600");
    const [views, setViews] = useState("unlimited");
    const [loading, setLoading] = useState(false);
    const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    const handleCreateLink = async () => {
        if (!secretValue.trim()) {
            toast.error("Please enter a secret to share.");
            return;
        }

        setLoading(true);
        try {
            // 1. Generate ephemeral key
            const ephemeralKeyBase64 = await generateVaultKey();

            // 2. Encrypt secret
            const { cipher, nonce } = await encryptSecret(secretValue, ephemeralKeyBase64);

            // 3. Calculate expiration
            const expirationDate = new Date();
            expirationDate.setSeconds(expirationDate.getSeconds() + parseInt(duration));

            // 4. Store in Supabase
            const { data, error } = await supabase
                .from("shared_secrets")
                .insert({
                    encrypted_payload: cipher,
                    nonce: nonce,
                    expires_at: expirationDate.toISOString(),
                    views_remaining: views === "unlimited" ? null : parseInt(views),
                })
                .select("id")
                .single();

            if (error) throw error;

            // 5. Generate URL
            const url = `${window.location.origin}/share/${data.id}#${ephemeralKeyBase64}`;
            setGeneratedUrl(url);
            toast.success("Secret link created!");

        } catch (error) {
            console.error("Error creating share link:", error);
            toast.error("Failed to create share link. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = () => {
        if (!generatedUrl) return;
        navigator.clipboard.writeText(generatedUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        toast.success("Link copied to clipboard");
    };

    const reset = () => {
        setGeneratedUrl(null);
        setSecretValue("");
        setDuration("3600");
        setViews("unlimited");
    };

    return (
        <div className="min-h-screen flex flex-col bg-background">
            <header className="px-6 h-16 flex items-center border-b border-border/40">
                <Link href="/" className="flex items-center gap-2 font-bold text-xl tracking-tight mr-8">
                    <Shield className="w-6 h-6 text-primary" />
                    <span>Vaultix Note</span>
                </Link>
                <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground ml-auto">
                    <Link href="/#features" className="hover:text-foreground transition-colors">Features</Link>
                    <Link href="/#security" className="hover:text-foreground transition-colors">Security</Link>
                    <Link href="/#cli" className="hover:text-foreground transition-colors">CLI</Link>
                </nav>
            </header>

            <main className="flex-1 flex items-center justify-center p-4">
                <Card className="w-full max-w-lg border-border bg-card shadow-lg">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Share2 className="w-5 h-5 text-primary" />
                            Secure Share
                        </CardTitle>
                        <CardDescription>
                            Share sensitive information securely with a temporary, encrypted link.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {!generatedUrl ? (
                            <>
                                <div className="space-y-2">
                                    <Label htmlFor="secret">Secret Content</Label>
                                    <Textarea
                                        id="secret"
                                        placeholder="Paste your password, private key, or sensitive message here..."
                                        className="min-h-[150px] font-mono text-sm resize-none"
                                        value={secretValue}
                                        onChange={(e) => setSecretValue(e.target.value)}
                                        disabled={loading}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="duration">Expires In</Label>
                                        <Select value={duration} onValueChange={setDuration} disabled={loading}>
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="300">5 Minutes</SelectItem>
                                                <SelectItem value="1800">30 Minutes</SelectItem>
                                                <SelectItem value="3600">1 Hour</SelectItem>
                                                <SelectItem value="86400">1 Day</SelectItem>
                                                <SelectItem value="604800">7 Days</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="views">View Limit</Label>
                                        <Select value={views} onValueChange={setViews} disabled={loading}>
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="unlimited">Unlimited</SelectItem>
                                                <SelectItem value="1">1 View (Burn)</SelectItem>
                                                <SelectItem value="5">5 Views</SelectItem>
                                                <SelectItem value="10">10 Views</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="space-y-4 py-4">
                                <div className="p-4 bg-primary/10 rounded-lg border border-primary/20 text-center">
                                    <div className="mx-auto w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center mb-2">
                                        <LinkIcon className="w-5 h-5 text-primary" />
                                    </div>
                                    <h3 className="font-semibold text-primary mb-1">Link Ready</h3>
                                    <p className="text-xs text-muted-foreground">
                                        This link contains the decryption key. Anyone with this link can view the secret.
                                    </p>
                                </div>

                                <div className="flex items-center space-x-2">
                                    <div className="grid flex-1 gap-2">
                                        <Label htmlFor="link" className="sr-only">Link</Label>
                                        <Input
                                            id="link"
                                            value={generatedUrl}
                                            readOnly
                                            className="pr-10 font-mono text-xs"
                                        />
                                    </div>
                                    <Button size="sm" onClick={copyToClipboard} className="px-3 shrink-0">
                                        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                                    </Button>
                                </div>
                            </div>
                        )}
                    </CardContent>
                    <CardFooter className="flex justify-between">
                        {!generatedUrl ? (
                            <Button className="w-full" onClick={handleCreateLink} disabled={loading || !secretValue.trim()}>
                                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {loading ? "Encrypting..." : "Create Secure Link"}
                            </Button>
                        ) : (
                            <Button variant="outline" className="w-full" onClick={reset}>
                                Create Another
                            </Button>
                        )}
                    </CardFooter>
                </Card>
            </main>
        </div>
    );
}
